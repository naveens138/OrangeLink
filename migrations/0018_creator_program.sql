-- ============================================================================
-- 0018 — Creator Program: post a reel, get a year free (first 100 creators)
-- ============================================================================
--
-- Three tables:
--   creator_program_submissions  one row per reel submitted for review
--   creator_program_waitlist     emails collected once all 100 spots are gone
--   billing_overrides            a free period granted to a creator, read by
--                                billing once plans are enforced
--
-- Every write goes through server code with the service role, after that
-- code has checked the caller (public API routes for submissions and the
-- waitlist, requireAdmin() for review). So the only client-facing policies
-- are read-your-own-row ones. As migrations 0005 and 0013 learned, Supabase
-- grants new tables and functions to anon and authenticated by default, and
-- `revoke ... from public` does not remove that, so grants below name the
-- roles explicitly.

-- --------------------------------------------------------------------------
-- Submissions
-- --------------------------------------------------------------------------
create table public.creator_program_submissions (
  id uuid primary key default gen_random_uuid(),
  -- Null when the person hasn't signed up yet; filled in when they submit
  -- with a username, or at approval once an account with this email exists.
  creator_id uuid references public.creators (id) on delete set null,
  email text not null
    check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  reel_url text not null
    check (char_length(reel_url) <= 500 and reel_url ~ '^https://'),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  -- The admin's email. Admins are an allowlist (ADMIN_EMAILS), not users
  -- with rows of their own, so there is nothing to reference.
  reviewed_by text
);

create index idx_creator_program_submissions_status
  on public.creator_program_submissions (status, submitted_at);

-- One live application per person and per reel. A rejected application
-- doesn't count, so they can try again with a new reel.
create unique index uq_creator_program_active_email
  on public.creator_program_submissions (lower(email))
  where status in ('pending', 'approved');
create unique index uq_creator_program_active_creator
  on public.creator_program_submissions (creator_id)
  where status in ('pending', 'approved') and creator_id is not null;
create unique index uq_creator_program_active_reel
  on public.creator_program_submissions (reel_url)
  where status in ('pending', 'approved');

alter table public.creator_program_submissions enable row level security;

create policy "creators view own program submissions"
  on public.creator_program_submissions for select
  to authenticated
  using (creator_id = auth.uid());

revoke all on table public.creator_program_submissions from anon, authenticated;
grant select on table public.creator_program_submissions to authenticated;

-- --------------------------------------------------------------------------
-- Waitlist (for the next round, once the first 100 are claimed)
-- --------------------------------------------------------------------------
create table public.creator_program_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null
    check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  created_at timestamptz not null default now()
);

create unique index uq_creator_program_waitlist_email
  on public.creator_program_waitlist (lower(email));

alter table public.creator_program_waitlist enable row level security;
revoke all on table public.creator_program_waitlist from anon, authenticated;

-- --------------------------------------------------------------------------
-- Billing overrides
-- --------------------------------------------------------------------------
create table public.billing_overrides (
  creator_id uuid primary key references public.creators (id) on delete cascade,
  free_until timestamptz not null,
  reason text not null check (reason in ('creator_program')),
  submission_id uuid references public.creator_program_submissions (id) on delete set null,
  granted_by text,
  granted_at timestamptz not null default now()
);

alter table public.billing_overrides enable row level security;

create policy "creators view own billing override"
  on public.billing_overrides for select
  to authenticated
  using (creator_id = auth.uid());

revoke all on table public.billing_overrides from anon, authenticated;
grant select on table public.billing_overrides to authenticated;

-- --------------------------------------------------------------------------
-- Who is this? A username ("jane", "@jane") or an email, to a creator.
-- Needs auth.users for the email, hence security definer. Service role only.
-- --------------------------------------------------------------------------
create function public.resolve_program_identity(p_identity text)
returns table (creator_id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v text := lower(btrim(p_identity));
begin
  if position('@' in v) > 1 then
    -- An email: attach the account if one exists, otherwise just the email.
    return query
      select c.id, v
      from (select 1) as one
      left join auth.users u on lower(u.email) = v
      left join public.creators c on c.id = u.id
      limit 1;
  else
    return query
      select c.id, lower(u.email)::text
      from public.creators c
      join auth.users u on u.id = c.id
      where c.username = ltrim(v, '@')
      limit 1;
  end if;
end;
$$;

revoke all on function public.resolve_program_identity(text) from public, anon, authenticated;
grant execute on function public.resolve_program_identity(text) to service_role;

-- --------------------------------------------------------------------------
-- Approve one submission and grant the free year, atomically.
--
-- The 100 cap is checked here, under a transaction-scoped lock, rather than
-- in the app: two reviewers approving at the same moment would otherwise
-- both see 99 and both succeed.
-- --------------------------------------------------------------------------
create function public.approve_program_submission(
  p_submission_id uuid,
  p_reviewer text,
  p_cap integer default 100
)
returns table (outcome text, free_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_creator uuid;
  v_email text;
  v_approved integer;
  v_until timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('creator_program_approvals'));

  select s.status, s.creator_id, s.email
    into v_status, v_creator, v_email
    from public.creator_program_submissions s
    where s.id = p_submission_id
    for update;

  if not found then
    return query select 'not_found'::text, null::timestamptz;
    return;
  end if;
  if v_status <> 'pending' then
    return query select ('already_' || v_status)::text, null::timestamptz;
    return;
  end if;

  -- Submitted with an email before signing up? Look for the account now.
  if v_creator is null then
    select c.id into v_creator
      from auth.users u
      join public.creators c on c.id = u.id
      where lower(u.email) = lower(v_email)
      limit 1;
    if v_creator is null then
      return query select 'no_account'::text, null::timestamptz;
      return;
    end if;
  end if;

  select count(*) into v_approved
    from public.creator_program_submissions
    where status = 'approved';
  if v_approved >= p_cap then
    return query select 'full'::text, null::timestamptz;
    return;
  end if;

  begin
    update public.creator_program_submissions
      set status = 'approved',
          creator_id = v_creator,
          reviewed_at = now(),
          reviewed_by = p_reviewer
      where id = p_submission_id;
  exception when unique_violation then
    -- This creator already has another live application.
    return query select 'duplicate'::text, null::timestamptz;
    return;
  end;

  insert into public.billing_overrides as o
      (creator_id, free_until, reason, submission_id, granted_by, granted_at)
    values
      (v_creator, now() + interval '1 year', 'creator_program', p_submission_id, p_reviewer, now())
    on conflict (creator_id) do update
      set free_until = greatest(o.free_until, now()) + interval '1 year',
          reason = excluded.reason,
          submission_id = excluded.submission_id,
          granted_by = excluded.granted_by,
          granted_at = excluded.granted_at
    returning o.free_until into v_until;

  return query select 'approved'::text, v_until;
end;
$$;

revoke all on function public.approve_program_submission(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.approve_program_submission(uuid, text, integer) to service_role;
