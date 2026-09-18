-- ============================================================================
-- 0019 — Failed password attempts on locked blocks
-- ============================================================================
--
-- unlockBlock (lib/queries/public-page.ts) is public and unauthenticated, so
-- without a limit a visitor could sit and guess a block's password for as
-- long as they like. Every failed attempt lands here and the next attempt is
-- refused once a visitor has too many in the window.
--
-- visitor_key is an HMAC of the request IP, never the address itself: this
-- table is a brake, not an analytics log, and nothing else in OrangeLink
-- stores visitor IPs (analytics uses a client-generated visitor id instead).
-- Rows are pruned as they are written, so this stays small.

create table public.block_unlock_attempts (
  id bigint generated always as identity primary key,
  block_id uuid not null references public.blocks (id) on delete cascade,
  visitor_key text not null check (char_length(visitor_key) <= 64),
  attempted_at timestamptz not null default now()
);

create index block_unlock_attempts_visitor
  on public.block_unlock_attempts (visitor_key, attempted_at desc);

create index block_unlock_attempts_pruning
  on public.block_unlock_attempts (attempted_at);

-- No policies: only the service role touches this, like visitors and
-- analytics_events (migrations/0007). Creators have no reason to read it.
alter table public.block_unlock_attempts enable row level security;
