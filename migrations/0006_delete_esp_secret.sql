-- ============================================================================
-- 0006 — delete_esp_secret wrapper
-- ============================================================================
-- The `vault` schema isn't exposed via PostgREST (only callable through
-- SECURITY DEFINER wrappers in `public`, same reason migrations 0004/0005
-- exist), so disconnecting an ESP integration had no real way to clean up
-- its now-orphaned vault secret — the delete call at the client layer would
-- have silently failed against an unexposed schema. This closes that gap
-- properly instead of leaving it as unreachable code.

create or replace function public.delete_esp_secret(p_secret_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if not exists (
    select 1 from public.esp_integrations
    where api_key_secret_id = p_secret_id and creator_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;
  delete from vault.secrets where id = p_secret_id;
end;
$$;

revoke execute on function public.delete_esp_secret(uuid) from anon, authenticated, public;
grant execute on function public.delete_esp_secret(uuid) to authenticated;
