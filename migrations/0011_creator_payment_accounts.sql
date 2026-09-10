-- ============================================================================
-- 0011 — Creators connect their own Razorpay account
-- ============================================================================
--
-- Until now every sale on the platform was collected into OrangeLink's own
-- Razorpay account and paid out to creators by hand (see 0009_payouts).
-- That made OrangeLink the merchant of record for goods it doesn't sell:
-- it holds other people's money, wears their chargebacks, and books their
-- turnover as its own.
--
-- From here each creator connects their own Razorpay account. The buyer
-- pays the creator directly, OrangeLink never touches the funds, and the
-- platform is paid by subscription instead of a cut of each sale.
--
-- Credentials follow the same shape as 0004's ESP keys: the table holds
-- only a vault reference, and the plaintext is reachable exclusively
-- through SECURITY DEFINER wrappers — writes scoped to the owning creator,
-- reads scoped to service_role and never exposed to the browser.

create table public.creator_payment_accounts (
  creator_id uuid primary key references public.creators(id) on delete cascade,
  provider text not null default 'razorpay' check (provider in ('razorpay')),
  -- key_id is not a secret: Razorpay's own checkout.js needs it in the
  -- browser, so it is stored in the clear and served to the checkout.
  key_id text not null,
  key_secret_id uuid not null,
  -- Set once the creator registers the webhook in their Razorpay dashboard;
  -- until then only the synchronous verify path can fulfil.
  webhook_secret_id uuid,
  -- Derived from the key_id prefix so the dashboard can warn a creator who
  -- is still in test mode that live payments will not reach them.
  is_live boolean not null default false,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.creator_payment_accounts is
  'Per-creator payment provider credentials. Buyers pay the creator direct; OrangeLink never holds the funds.';

alter table public.creator_payment_accounts enable row level security;

create policy "creators manage own payment account"
  on public.creator_payment_accounts
  for all using (auth.uid() = creator_id);

-- ----------------------------------------------------------------------------
-- Vault wrappers
-- ----------------------------------------------------------------------------

create or replace function public.store_payment_secret(new_secret text)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  return vault.create_secret(new_secret, null, 'Razorpay credential');
end;
$$;

revoke all on function public.store_payment_secret(text) from public;
grant execute on function public.store_payment_secret(text) to authenticated;

create or replace function public.update_payment_secret(p_secret_id uuid, new_secret text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  -- Only the creator whose row references this secret may rotate it.
  if not exists (
    select 1 from public.creator_payment_accounts
    where creator_id = auth.uid()
      and (key_secret_id = p_secret_id or webhook_secret_id = p_secret_id)
  ) then
    raise exception 'not authorized';
  end if;
  perform vault.update_secret(p_secret_id, new_secret);
end;
$$;

revoke all on function public.update_payment_secret(uuid, text) from public;
grant execute on function public.update_payment_secret(uuid, text) to authenticated;

create or replace function public.delete_payment_secret(p_secret_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if not exists (
    select 1 from public.creator_payment_accounts
    where creator_id = auth.uid()
      and (key_secret_id = p_secret_id or webhook_secret_id = p_secret_id)
  ) then
    raise exception 'not authorized';
  end if;
  delete from vault.secrets where id = p_secret_id;
end;
$$;

revoke all on function public.delete_payment_secret(uuid) from public;
grant execute on function public.delete_payment_secret(uuid) to authenticated;

-- Reads are service_role only: these decrypt real payment credentials and
-- must never be reachable from the browser.
create or replace function public.get_creator_payment_credentials(p_creator_id uuid)
returns table (key_id text, key_secret text, webhook_secret text)
language sql
security definer
set search_path = public, vault
as $$
  select
    a.key_id,
    ks.decrypted_secret as key_secret,
    ws.decrypted_secret as webhook_secret
  from public.creator_payment_accounts a
  join vault.decrypted_secrets ks on ks.id = a.key_secret_id
  left join vault.decrypted_secrets ws on ws.id = a.webhook_secret_id
  where a.creator_id = p_creator_id;
$$;

revoke all on function public.get_creator_payment_credentials(uuid) from public;
grant execute on function public.get_creator_payment_credentials(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- The platform no longer takes a cut of each sale
-- ----------------------------------------------------------------------------
-- Money now settles straight into the creator's own account, so there is
-- nothing for OrangeLink to deduct at transaction time. Existing rows keep
-- their historical value; new creators default to zero.
alter table public.creators alter column platform_fee_bps set default 0;

comment on column public.creators.platform_fee_bps is
  'Legacy per-sale cut, retained for historical orders. Zero going forward — the platform is paid by subscription, not a share of sales.';
