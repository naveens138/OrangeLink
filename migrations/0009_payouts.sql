-- ============================================================================
-- 0009 — Manual creator payout tracking
-- ============================================================================
-- Razorpay Route (automatic split payouts to creators) was investigated and
-- ruled out: it requires turnover OrangeLink hasn't cleared, is shaped for
-- registered businesses rather than individual creators, and only supports
-- payout to India/Malaysia bank accounts — a hard blocker for a global
-- creator base regardless of the other two. See PROGRESS.md. This is the
-- fallback: a ledger the platform operator reconciles by hand (real bank
-- transfer outside this app), not an automated money-mover.

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  method text,                                  -- e.g. 'bank_transfer', 'other' — free text, no provider integration
  reference text,                               -- bank transaction ref / whatever the operator wants to cite
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payouts_creator on public.payouts(creator_id);
create index idx_payouts_status on public.payouts(status);

alter table public.payouts enable row level security;

-- Read-only for the creator (transparency: they can see what's been paid
-- out to them) — writes are an operator action from /admin/payouts, which
-- runs on the service role rather than a creator-writable RLS policy,
-- since "mark my own payout as paid" is exactly the kind of self-reported
-- financial claim that must never be creator-writable.
create policy "creators view own payouts" on public.payouts
  for select using (auth.uid() = creator_id);

-- ----------------------------------------------------------------------------
-- Balance view: what each creator is owed right now
-- ----------------------------------------------------------------------------
-- gross paid-order totals minus platform fee, minus payouts already marked
-- paid — grouped by (creator, currency) rather than assuming one currency,
-- since nothing stops a creator's orders from spanning more than one.
--
-- security_invoker so a creator querying this directly gets it filtered by
-- the same RLS as the underlying orders/payouts tables (Postgres views
-- default to the view OWNER's privileges, which would silently bypass RLS,
-- unless this is set explicitly — the same class of "reads correct but
-- insecure" bug this app has audited for before, see migrations/0005).
create view public.creator_payout_balances
with (security_invoker = true) as
select
  c.id as creator_id,
  c.username,
  c.display_name,
  coalesce(paid.currency, po.currency, 'USD') as currency,
  coalesce(paid.net_owed_cents, 0) as net_owed_cents,
  coalesce(po.paid_out_cents, 0) as paid_out_cents,
  coalesce(paid.net_owed_cents, 0) - coalesce(po.paid_out_cents, 0) as balance_cents
from public.creators c
left join (
  select creator_id, currency, sum(total_cents - platform_fee_cents) as net_owed_cents
  from public.orders
  where status = 'paid'
  group by creator_id, currency
) paid on paid.creator_id = c.id
left join (
  select creator_id, currency, sum(amount_cents) as paid_out_cents
  from public.payouts
  where status = 'paid'
  group by creator_id, currency
) po on po.creator_id = c.id and po.currency = paid.currency
where paid.creator_id is not null or po.creator_id is not null;
