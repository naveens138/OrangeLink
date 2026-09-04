-- ============================================================================
-- 0008 — Paddle subscription billing (platform plans, not creator storefront sales)
-- ============================================================================
-- Deliberately separate from the existing `customers`/`orders` tables, which
-- model a CREATOR's own buyers purchasing on their storefront (Dodo/
-- Razorpay). This is the opposite direction of money: creators paying
-- OrangeLink itself for a platform plan (Starter/Pro/Advanced, see
-- src/lib/paddle/tiers.ts). Reusing `customers`/`orders` for this would
-- conflate two unrelated domains under the same tables.

create table public.paddle_customers (
  id text primary key,                                  -- Paddle customer id, "ctm_..."
  creator_id uuid references public.creators(id) on delete set null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_paddle_customers_creator on public.paddle_customers(creator_id);
create index idx_paddle_customers_email on public.paddle_customers(email);

create table public.paddle_subscriptions (
  id text primary key,                                  -- Paddle subscription id, "sub_..."
  -- Deliberately NOT a foreign key to paddle_customers: Paddle explicitly
  -- does not guarantee webhook delivery order (retries can reorder), so a
  -- subscription.* event upsert must never depend on customer.* having
  -- landed first. Each table upserts independently, keyed on its own
  -- Paddle-assigned id.
  customer_id text not null,
  creator_id uuid references public.creators(id) on delete set null,
  status text not null,                                 -- active | trialing | past_due | paused | canceled
  price_id text not null,
  product_id text not null,
  scheduled_change_at timestamptz,                       -- non-null while a pause/cancel is pending
  scheduled_change_action text,                          -- 'cancel' | 'pause' | 'resume'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_paddle_subscriptions_customer on public.paddle_subscriptions(customer_id);
create index idx_paddle_subscriptions_creator on public.paddle_subscriptions(creator_id);
create index idx_paddle_subscriptions_status on public.paddle_subscriptions(status);

-- Same shape as migrations/0007's visitors/analytics_events: every write
-- comes from the webhook handler (service_role, bypasses RLS) — a creator
-- never writes their own subscription row directly, so only a read policy
-- is needed here.
alter table public.paddle_customers enable row level security;
alter table public.paddle_subscriptions enable row level security;

create policy "creators view own paddle customer row" on public.paddle_customers
  for select using (auth.uid() = creator_id);

create policy "creators view own paddle subscriptions" on public.paddle_subscriptions
  for select using (auth.uid() = creator_id);
