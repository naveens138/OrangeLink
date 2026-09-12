-- ============================================================================
-- 0016 — Post planner (Dashboard → Schedule)
-- ============================================================================
--
-- Creators plan social posts across platforms: a caption, the platforms it
-- goes to, an optional link (their page, a product, anything), and when.
-- OrangeLink doesn't publish to the platforms itself yet; at posting time
-- the dashboard copies the caption and opens each platform, and the creator
-- marks the post done. Automatic publishing needs each platform's API
-- approval and would add columns here later.

create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  platforms text[] not null
    check (
      cardinality(platforms) > 0
      and platforms <@ array['instagram', 'tiktok', 'youtube', 'x', 'threads', 'facebook', 'linkedin']::text[]
    ),
  caption text not null default '' check (char_length(caption) <= 5000),
  link_url text check (link_url is null or link_url ~ '^https?://'),
  scheduled_for timestamptz not null,
  status text not null default 'planned' check (status in ('planned', 'posted', 'skipped')),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scheduled_posts_creator_time on public.scheduled_posts (creator_id, scheduled_for);

alter table public.scheduled_posts enable row level security;

create policy "creators manage own scheduled posts"
  on public.scheduled_posts for all
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());
