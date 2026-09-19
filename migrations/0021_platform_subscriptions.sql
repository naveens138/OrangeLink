-- ============================================================================
-- 0021 — Platform billing on Razorpay Subscriptions
-- ============================================================================
--
-- Creators paying OrangeLink for a plan. This is the opposite direction of
-- money from `orders`, which is a creator's own buyers paying them, and it
-- runs on OrangeLink's own Razorpay account rather than the per-creator
-- credentials in creator_payment_accounts (migrations/0011).
--
-- It replaces the Paddle tables from migrations/0008, which are left in
-- place untouched: nothing routes to Paddle any more, but dropping the
-- tables is a separate decision from stopping using them.
--
-- One tier, two intervals: $19/month or $180/year. Access is never granted
-- from the browser — only a verified Razorpay callback or webhook moves a
-- row here (see lib/billing/entitlement.ts for how it's read back).

create table public.platform_subscriptions (
  id text primary key,                         -- Razorpay subscription id, "sub_..."
  creator_id uuid not null references public.creators (id) on delete cascade,
  plan_id text not null,                       -- Razorpay plan id, "plan_..."
  billing_interval text not null check (billing_interval in ('monthly', 'annual')),
  -- Razorpay's own vocabulary, stored as it comes: created, authenticated,
  -- active, pending, halted, cancelled, completed, expired. Mapped to the
  -- coarser creators.subscription_status below for cheap reads.
  status text not null,
  current_end timestamptz,                     -- paid through; null until the first charge
  charge_at timestamptz,                       -- when Razorpay will next charge
  start_at timestamptz,                        -- future-dated for Creator Program members
  short_url text,                              -- Razorpay's hosted payment page for this subscription
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_platform_subscriptions_creator
  on public.platform_subscriptions (creator_id, created_at desc);

create index idx_platform_subscriptions_status
  on public.platform_subscriptions (status);

-- Same shape as the Paddle tables and analytics: every write comes from a
-- verified server path running as service_role, so creators need read only.
alter table public.platform_subscriptions enable row level security;

create policy "creators view own subscription"
  on public.platform_subscriptions for select
  to authenticated
  using (creator_id = auth.uid());

revoke all on table public.platform_subscriptions from anon, authenticated;
grant select on table public.platform_subscriptions to authenticated;

-- --------------------------------------------------------------------------
-- Webhook idempotency
-- --------------------------------------------------------------------------
-- Razorpay retries a webhook until it gets a 2xx, and a retry of
-- subscription.charged must not extend access twice. Keyed on the
-- x-razorpay-event-id header, which is stable across retries of the same
-- event.
create table public.platform_billing_events (
  event_id text primary key,
  event_type text not null,
  subscription_id text,
  received_at timestamptz not null default now()
);

create index idx_platform_billing_events_received
  on public.platform_billing_events (received_at);

alter table public.platform_billing_events enable row level security;
revoke all on table public.platform_billing_events from anon, authenticated;

-- --------------------------------------------------------------------------
-- Denormalized status on creators
-- --------------------------------------------------------------------------
-- So a gate can ask "is this creator paid up?" without joining. The
-- subscription table stays the record of what actually happened; these three
-- columns are a cache of it, written only by the billing paths.
--
-- Deliberately separate from the Creator Program's free year, which lives in
-- billing_overrides (migrations/0018): a creator on the program has no
-- subscription row and subscription_status 'none', so "who is actually
-- paying" and "who is on the free year" never blur together.
alter table public.creators
  add column if not exists subscription_status text not null default 'none'
    check (subscription_status in ('none', 'active', 'past_due', 'cancelled')),
  add column if not exists subscription_interval text
    check (subscription_interval is null or subscription_interval in ('monthly', 'annual')),
  add column if not exists paid_until timestamptz;

comment on column public.creators.subscription_status is
  'Cache of platform_subscriptions. Paid billing only — a Creator Program free year lives in billing_overrides.';
