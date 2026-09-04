-- ============================================================================
-- 0005 — Fix a real privilege leak in migration 0004
-- ============================================================================
-- `revoke ... from public` does NOT remove a grant held by a specific role.
-- Supabase applies `alter default privileges ... grant execute on functions
-- to anon, authenticated, service_role` project-wide, so every function
-- created in `public` — including 0004's three vault wrappers — was
-- EXECUTE-able by anon and authenticated from the moment it was created,
-- regardless of the `revoke ... from public` lines that followed it. That
-- `revoke` only ever touches the PUBLIC pseudo-role, which was never the
-- actual grantee here.
--
-- Confirmed as a real leak, not theoretical: with RLS/grants exactly as
-- migration 0004 left them, an anon-keyed client could call
-- get_esp_api_key(existing_integration_id) and get the decrypted ESP API
-- key back in plaintext.
--
-- The fix is to name the roles explicitly. `revoke ... from public` is kept
-- alongside for defensiveness but is not load-bearing on its own — verified
-- by scripts/verify-esp-secret-lockdown.mjs, which this migration's
-- assertions should make pass.

revoke execute on function public.store_esp_secret(text) from anon, authenticated, public;
grant execute on function public.store_esp_secret(text) to authenticated;

revoke execute on function public.update_esp_secret(uuid, text) from anon, authenticated, public;
grant execute on function public.update_esp_secret(uuid, text) to authenticated;

revoke execute on function public.get_esp_api_key(uuid) from anon, authenticated, public;
grant execute on function public.get_esp_api_key(uuid) to service_role;

-- Same audit turned up the identical gap on migration 0002's two functions.
-- Not a data leak there — both are SECURITY INVOKER, so the "creators manage
-- own blocks" RLS policy still blocks anon from changing any row — but the
-- access boundary was wrong regardless, and worth closing while auditing
-- this class of bug rather than leaving it half-fixed.
revoke execute on function public.set_block_password(uuid, text) from anon, public;
revoke execute on function public.reorder_blocks(uuid, uuid[]) from anon, public;
