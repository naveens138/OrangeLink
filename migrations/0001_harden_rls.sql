-- ============================================================================
-- 0001 — Deny-by-default RLS on every public table
-- ============================================================================
-- schema.sql enables RLS on 10 tables and leaves 13 without it. Because
-- PostgREST exposes every table in `public` and the anon key is, by design,
-- shipped to browsers, a table with RLS off is world-readable AND
-- world-writable. That included access tokens (connected_accounts), ESP API
-- keys (esp_integrations), purchase records (order_items), and generated
-- download links (deliveries).
--
-- Enabling RLS with no policy denies all access to anon/authenticated while
-- service_role continues to bypass RLS entirely. Every server path in this
-- app reads through service_role (see BUILD_BRIEF.md §5 — public pages get a
-- server-side read filtered to published = true, rather than broad anon
-- policies), so this closes the hole without changing app behaviour.
--
-- When a table later needs direct client access, add an explicit policy for
-- it rather than turning RLS back off.

do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end
$$;

-- ============================================================================
-- Block password verification
-- ============================================================================
-- schema.sql stores blocks.password_hash. Comparing that in the browser would
-- mean shipping the hash to every visitor, so verification happens in the
-- database instead: the hash never leaves the server, and the caller only
-- learns whether one attempt was correct.

create or replace function public.verify_block_password(
  block_id uuid,
  attempt text
)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select coalesce(
    (select password_hash = crypt(attempt, password_hash)
     from public.blocks
     where id = block_id and is_password_protected),
    false
  );
$$;

revoke all on function public.verify_block_password(uuid, text) from public;
grant execute on function public.verify_block_password(uuid, text) to anon, authenticated;
