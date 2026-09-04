-- ============================================================================
-- 0002 — Editor helper functions
-- ============================================================================
-- Both are SECURITY INVOKER (the default), so the "creators manage own
-- blocks" RLS policy still applies: passing another creator's block id
-- updates zero rows instead of succeeding. search_path is pinned so the
-- pgcrypto functions resolve from `extensions` (where Supabase installs
-- them) regardless of the caller's search_path.

-- Sets or clears a block's password. Hashing happens here so the plaintext
-- is never stored and the hash is never sent to a browser. This function is
-- the single owner of is_password_protected, keeping the flag and the hash
-- from drifting apart (a block flagged protected with no hash would be
-- permanently unopenable).
create or replace function public.set_block_password(
  block_id uuid,
  new_password text
)
returns void
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  has_password boolean := new_password is not null and length(trim(new_password)) > 0;
begin
  update public.blocks
  set password_hash = case
        when has_password then crypt(new_password, gen_salt('bf'))
        else null
      end,
      is_password_protected = has_password
  where id = block_id;
end;
$$;

revoke all on function public.set_block_password(uuid, text) from public;
grant execute on function public.set_block_password(uuid, text) to authenticated;

-- Applies a new block order in one statement, so a drag never leaves the page
-- with half-updated positions.
create or replace function public.reorder_blocks(
  target_page_id uuid,
  ordered_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.blocks b
  set position = x.ord - 1
  from unnest(ordered_ids) with ordinality as x(id, ord)
  where b.id = x.id
    and b.page_id = target_page_id;
end;
$$;

revoke all on function public.reorder_blocks(uuid, uuid[]) from public;
grant execute on function public.reorder_blocks(uuid, uuid[]) to authenticated;
