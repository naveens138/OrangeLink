-- ============================================================================
-- CREATOR SAAS — DATABASE SCHEMA (Postgres / Supabase)
-- ============================================================================
-- Organized by domain:
--   1. Users & Auth
--   2. Pages & Customization
--   3. Links & Blocks
--   4. Products & Orders (checkout, upsells)
--   5. Email / Audience (CRM-lite)
--   6. Analytics & Attribution
--   7. Comment-to-DM Automation
--   8. Media Kit (auto-generated)
--   9. Migration / Import
--  10. Domains
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. USERS & AUTH
-- ============================================================================
-- Supabase auth.users handles login/identity. This table extends it with
-- creator-specific profile + account data.

create table public.creators (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,               -- e.g. "jane" -> yoursite.com/@jane
  display_name text,
  bio text,
  avatar_url text,
  timezone text default 'UTC',
  plan text not null default 'free',           -- free | pro | business (drives fee %, feature gates)
  platform_fee_bps integer not null default 500, -- basis points (500 = 5%), overridden by plan
  onboarding_completed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_creators_username on public.creators(username);

-- Social accounts connected for OAuth-based features (IG comment-to-DM,
-- media kit stat pulls, Buffer-style scheduling later).
create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  platform text not null check (platform in ('instagram','facebook','tiktok','youtube','twitter')),
  platform_user_id text not null,              -- IG/FB/etc user id
  access_token text not null,                  -- store encrypted at rest (Supabase Vault or app-level encryption)
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  connected_at timestamptz not null default now(),
  unique (creator_id, platform, platform_user_id)
);

-- ============================================================================
-- 2. PAGES & CUSTOMIZATION
-- ============================================================================
-- A creator could eventually have multiple pages (e.g. campaign-specific),
-- so page is its own entity rather than folded into creators.

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  slug text not null,                          -- defaults to creator username, but supports campaign pages
  is_primary boolean not null default true,
  title text,
  seo_description text,
  og_image_url text,
  theme jsonb not null default '{}'::jsonb,    -- colors, font, spacing, layout tokens (block-based editor output)
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, slug)
);

-- Block-based page content: links, embeds, product cards, email capture
-- forms, etc. are all "blocks" with a type + ordered position. This is what
-- powers the deep, ungated customization vs. Stan's rigid layout.
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null check (type in (
    'link', 'product', 'embed', 'email_capture', 'text', 'image',
    'booking', 'social_icons', 'divider', 'header'
  )),
  position integer not null,                   -- drag-and-drop order
  is_visible boolean not null default true,
  visible_from timestamptz,                    -- scheduled links
  visible_until timestamptz,
  is_password_protected boolean not null default false,
  password_hash text,
  config jsonb not null default '{}'::jsonb,   -- type-specific data:
                                                --   link: { url, label, icon }
                                                --   product: { product_id }
                                                --   embed: { platform, embed_url }
                                                --   email_capture: { headline, cta_text }
                                                --   booking: { provider: 'calendly', url }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_blocks_page_position on public.blocks(page_id, position);

-- ============================================================================
-- 3. LINKS CLICK TRACKING (lightweight — see also section 6 for full events)
-- ============================================================================
-- Kept separate/denormalized counter for fast dashboard reads; the source of
-- truth for analysis lives in analytics_events.

create table public.block_stats (
  block_id uuid primary key references public.blocks(id) on delete cascade,
  click_count bigint not null default 0,
  last_clicked_at timestamptz
);

-- ============================================================================
-- 4. PRODUCTS & ORDERS (checkout, order bumps, upsell funnels)
-- ============================================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  type text not null check (type in ('digital_file', 'course', 'booking', 'coaching', 'membership')),
  name text not null,
  description text,
  price_cents integer not null,
  currency text not null default 'USD',
  cover_image_url text,
  file_url text,                               -- for digital_file: storage path (signed URL generated at delivery)
  is_published boolean not null default true,
  stock_limit integer,                         -- null = unlimited
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_creator on public.products(creator_id);

-- Order bumps / upsells attach one product's checkout flow to another offer.
create table public.product_offers (
  id uuid primary key default gen_random_uuid(),
  primary_product_id uuid not null references public.products(id) on delete cascade,
  offer_product_id uuid not null references public.products(id) on delete cascade,
  offer_type text not null check (offer_type in ('order_bump', 'upsell', 'downsell')),
  discount_percent numeric(5,2),               -- optional discounted price for the bump
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (primary_product_id != offer_product_id)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null,
  product_id uuid references public.products(id) on delete cascade, -- null = applies to all products
  max_redemptions integer,
  times_redeemed integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (creator_id, code)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  email text not null,
  name text,
  first_seen_at timestamptz not null default now(),
  lifetime_value_cents bigint not null default 0,  -- denormalized for fast CRM-lite segmentation
  created_at timestamptz not null default now(),
  unique (creator_id, email)
);

create index idx_customers_creator_ltv on public.customers(creator_id, lifetime_value_cents desc);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'failed')),
  subtotal_cents integer not null,
  discount_cents integer not null default 0,
  platform_fee_cents integer not null default 0,
  total_cents integer not null,
  currency text not null default 'USD',
  coupon_id uuid references public.coupons(id),
  payment_provider text not null default 'stripe',
  provider_payment_id text,                    -- Stripe PaymentIntent id
  -- attribution captured at time of purchase (denormalized for fast reporting)
  attribution_source text,                     -- e.g. 'instagram', 'tiktok', 'direct'
  attribution_utm jsonb,                       -- { utm_source, utm_medium, utm_campaign }
  visitor_id uuid,                             -- ties back to analytics session, see section 6
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index idx_orders_creator_status on public.orders(creator_id, status);
create index idx_orders_customer on public.orders(customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  is_order_bump boolean not null default false,
  unit_price_cents integer not null,
  quantity integer not null default 1
);

create index idx_order_items_order on public.order_items(order_id);

-- Auto-delivery record: tracks what's been sent to the customer post-purchase
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  delivery_method text not null default 'email' check (delivery_method in ('email', 'download_link')),
  signed_url text,
  signed_url_expires_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. EMAIL / AUDIENCE (CRM-lite + ESP integration)
-- ============================================================================

create table public.email_subscribers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  email text not null,
  source text,                                 -- 'page_capture', 'comment_dm', 'checkout', 'import'
  tags text[] default '{}',                    -- lightweight segmentation, e.g. {'bought:course_x'}
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  unique (creator_id, email)
);

create index idx_email_subscribers_creator on public.email_subscribers(creator_id);

-- Native ESP integrations (ConvertKit, Beehiiv, MailerLite) rather than
-- building automation natively.
create table public.esp_integrations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  provider text not null check (provider in ('convertkit', 'beehiiv', 'mailerlite')),
  api_key_encrypted text not null,
  list_id text,
  sync_enabled boolean not null default true,
  connected_at timestamptz not null default now(),
  unique (creator_id, provider)
);

-- ============================================================================
-- 6. ANALYTICS & ATTRIBUTION (the ungated funnel/attribution layer)
-- ============================================================================

-- One row per anonymous visitor (cookie/localStorage id), persisted across
-- a session so a click -> product view -> checkout funnel can be joined.
create table public.visitors (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referrer text,
  device_type text,                            -- mobile | desktop | tablet
  country text
);

create index idx_visitors_creator on public.visitors(creator_id);

-- Generic event stream: page_view, block_click, product_view, checkout_start,
-- checkout_complete. This is the source of truth for funnel construction.
create table public.analytics_events (
  id bigint generated always as identity primary key,
  creator_id uuid not null references public.creators(id) on delete cascade,
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  page_id uuid references public.pages(id),
  block_id uuid references public.blocks(id),
  product_id uuid references public.products(id),
  order_id uuid references public.orders(id),
  event_type text not null check (event_type in (
    'page_view', 'block_click', 'product_view', 'checkout_start',
    'checkout_complete', 'email_capture'
  )),
  metadata jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- Partition-friendly index for time-series funnel queries
create index idx_events_creator_type_time on public.analytics_events(creator_id, event_type, occurred_at);
create index idx_events_visitor on public.analytics_events(visitor_id, occurred_at);

-- Third-party pixel configuration per creator (Meta Pixel, GA4, TikTok Pixel)
create table public.tracking_pixels (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  provider text not null check (provider in ('meta_pixel', 'ga4', 'tiktok_pixel')),
  pixel_id text not null,
  created_at timestamptz not null default now(),
  unique (creator_id, provider)
);

-- ============================================================================
-- 7. COMMENT-TO-DM AUTOMATION
-- ============================================================================

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'youtube')),
  trigger_type text not null default 'comment_keyword' check (trigger_type in ('comment_keyword')),
  keyword text not null,                       -- case-insensitive match, e.g. "LINK"
  post_id text,                                -- null = applies to all posts, or scope to one post
  response_type text not null check (response_type in ('dm', 'public_reply')),
                                                -- dm only works reliably on IG/FB (Meta Graph API);
                                                -- tiktok/youtube fall back to public_reply
  response_message text not null,
  linked_block_id uuid references public.blocks(id),  -- link/product to send
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_automation_rules_creator on public.automation_rules(creator_id, is_active);

-- Log of triggered automations, for stats + debugging
create table public.automation_events (
  id bigint generated always as identity primary key,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  platform_comment_id text,
  commenter_platform_id text,
  status text not null check (status in ('sent', 'failed', 'skipped_duplicate')),
  error_message text,
  occurred_at timestamptz not null default now()
);

create index idx_automation_events_rule on public.automation_events(rule_id, occurred_at);

-- ============================================================================
-- 8. MEDIA KIT (auto-generated brand-deal stats)
-- ============================================================================

-- Periodic snapshot of pulled stats per connected platform, so the media kit
-- can show trends, not just a live number that changes underneath a shared link.
create table public.platform_stats_snapshots (
  id bigint generated always as identity primary key,
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  follower_count bigint,
  avg_engagement_rate numeric(6,3),
  avg_views bigint,
  captured_at timestamptz not null default now()
);

create index idx_stats_snapshots_account_time on public.platform_stats_snapshots(connected_account_id, captured_at);

create table public.media_kits (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  public_slug text unique,                     -- shareable media kit link
  headline text,
  rate_card jsonb default '{}'::jsonb,          -- optional pricing for brand deals
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 9. MIGRATION / IMPORT (one-click switch from other platforms)
-- ============================================================================

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  source_platform text not null check (source_platform in ('linktree', 'stan', 'beacons', 'lnkbio', 'manual_paste')),
  source_url text,
  status text not null default 'pending' check (status in ('pending', 'parsing', 'ready_for_review', 'completed', 'failed')),
  raw_scraped_data jsonb,                      -- untouched scrape/parse output
  parsed_blocks jsonb,                         -- normalized block structure ready to insert, pending review
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_import_jobs_creator on public.import_jobs(creator_id, status);

-- ============================================================================
-- 10. CUSTOM DOMAINS
-- ============================================================================

create table public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  domain text not null unique,                 -- e.g. "jane.com"
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'failed')),
  dns_record_type text default 'CNAME',
  dns_target text,                             -- what they need to point their CNAME to
  ssl_status text default 'pending' check (ssl_status in ('pending', 'active', 'failed')),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

-- ============================================================================
-- TRIGGERS: keep updated_at fresh
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_creators_updated_at before update on public.creators
  for each row execute function public.set_updated_at();
create trigger trg_pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();
create trigger trg_blocks_updated_at before update on public.blocks
  for each row execute function public.set_updated_at();
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger trg_automation_rules_updated_at before update on public.automation_rules
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (Supabase) — enable + baseline "own data only" policies
-- ============================================================================

alter table public.creators enable row level security;
alter table public.pages enable row level security;
alter table public.blocks enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.customers enable row level security;
alter table public.email_subscribers enable row level security;
alter table public.automation_rules enable row level security;
alter table public.import_jobs enable row level security;
alter table public.custom_domains enable row level security;

create policy "creators manage own row" on public.creators
  for all using (auth.uid() = id);

create policy "creators manage own pages" on public.pages
  for all using (auth.uid() = creator_id);

create policy "creators manage own blocks" on public.blocks
  for all using (auth.uid() = (select creator_id from public.pages where pages.id = blocks.page_id));

create policy "creators manage own products" on public.products
  for all using (auth.uid() = creator_id);

create policy "creators view own orders" on public.orders
  for select using (auth.uid() = creator_id);

create policy "creators manage own customers" on public.customers
  for all using (auth.uid() = creator_id);

create policy "creators manage own subscribers" on public.email_subscribers
  for all using (auth.uid() = creator_id);

create policy "creators manage own automation rules" on public.automation_rules
  for all using (auth.uid() = creator_id);

create policy "creators manage own import jobs" on public.import_jobs
  for all using (auth.uid() = creator_id);

create policy "creators manage own domains" on public.custom_domains
  for all using (auth.uid() = creator_id);

-- Public pages need public read access for the storefront itself (no auth).
-- Handle this via a separate public-facing view/API layer that only exposes
-- published=true rows, rather than relaxing RLS broadly on these tables.
