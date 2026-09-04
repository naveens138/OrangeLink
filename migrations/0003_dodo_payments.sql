-- ============================================================================
-- 0003 — Dodo Payments integration
-- ============================================================================
-- Adds what schema.sql's generic payment_provider/provider_payment_id design
-- didn't anticipate needing: a link from our product to Dodo's product, and a
-- way to correlate a checkout session with our order before the payment_id
-- (only known once the webhook fires) exists.

alter table public.products
  add column if not exists dodo_product_id text unique;

alter table public.orders
  add column if not exists provider_checkout_session_id text;

create index if not exists idx_orders_checkout_session
  on public.orders(provider_checkout_session_id)
  where provider_checkout_session_id is not null;

-- Webhook fulfillment must be idempotent — Dodo retries up to 8 times on a
-- non-2xx response, and "already processed, return 200" needs a fast, atomic
-- way to detect a duplicate rather than a race-prone SELECT-then-INSERT.
create unique index if not exists idx_orders_provider_payment_unique
  on public.orders(provider_payment_id)
  where provider_payment_id is not null;

-- ============================================================================
-- Private storage bucket for digital product files
-- ============================================================================
-- public = false: no anon/authenticated policy is added below, and Storage
-- denies by default without one, so only the service-role client (used
-- exclusively in server actions and the webhook handler) can read or write
-- objects here. Signed URLs generated at delivery time are the only way a
-- buyer ever gets a working link — see BUILD_BRIEF.md §5.
insert into storage.buckets (id, name, public, file_size_limit)
values ('product-files', 'product-files', false, 524288000) -- 500MB
on conflict (id) do nothing;
