-- ============================================================================
-- 0017 — Profile photos, and creators' social accounts for the planner
-- ============================================================================

-- Profile photos. Public, because they appear on every creator's public
-- page. Uploads go through a server action with the service role (after
-- checking the caller), so no storage policies are added: without one,
-- Storage denies every anon/authenticated write by default. The browser
-- resizes photos before upload, so 1MB is generous.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- The creator's handle on each platform, set in Dashboard → Schedule. The
-- planner uses them to show which platforms are set up, to pre-select them
-- on new posts, and to link to each profile. Handles only; OrangeLink holds
-- no platform logins or tokens.
create table public.social_accounts (
  creator_id uuid not null references public.creators (id) on delete cascade,
  platform text not null
    check (platform in ('instagram', 'tiktok', 'youtube', 'x', 'threads', 'facebook', 'linkedin')),
  handle text not null check (handle ~ '^[A-Za-z0-9._-]{1,60}$'),
  created_at timestamptz not null default now(),
  primary key (creator_id, platform)
);

alter table public.social_accounts enable row level security;

create policy "creators manage own social accounts"
  on public.social_accounts for all
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());
