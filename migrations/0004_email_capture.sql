-- ============================================================================
-- 0004 — Email capture (Milestone 5)
-- ============================================================================

-- esp_integrations had no RLS policy — migration 0001's blanket lockdown
-- covered it (deny-all), but the dashboard needs creators to manage their
-- own connection.
create policy "creators manage own esp integrations" on public.esp_integrations
  for all using (auth.uid() = creator_id);

-- ----------------------------------------------------------------------------
-- ESP API keys via Supabase Vault, not a plaintext column
-- ----------------------------------------------------------------------------
-- schema.sql's `api_key_encrypted text` was aspirational — nothing encrypted
-- it. Vault (pgsodium-backed, already enabled on this project) actually does.
-- The table now stores a reference to a vault secret instead of key material.
--
-- PostgREST does not expose the `vault` schema even to service_role, so the
-- app can't call vault.create_secret()/decrypted_secrets directly over the
-- Supabase client — these SECURITY DEFINER wrappers in `public` are the only
-- way in, each scoped as tightly as its caller needs:
--   - store/update: authenticated creators, callable only for their own row
--   - read the decrypted key: service_role only, never exposed to the
--     browser — the dashboard shows "connected", never the key itself again.

alter table public.esp_integrations
  rename column api_key_encrypted to api_key_secret_id;

-- Empty table (feature never shipped until now) — safe straight retype.
alter table public.esp_integrations
  alter column api_key_secret_id type uuid using api_key_secret_id::uuid;

create or replace function public.store_esp_secret(new_secret text)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  return vault.create_secret(new_secret, null, 'ESP API key');
end;
$$;

revoke all on function public.store_esp_secret(text) from public;
grant execute on function public.store_esp_secret(text) to authenticated;

create or replace function public.update_esp_secret(p_secret_id uuid, new_secret text)
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
  perform vault.update_secret(p_secret_id, new_secret);
end;
$$;

revoke all on function public.update_esp_secret(uuid, text) from public;
grant execute on function public.update_esp_secret(uuid, text) to authenticated;

create or replace function public.get_esp_api_key(p_integration_id uuid)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select vs.decrypted_secret
  from public.esp_integrations ei
  join vault.decrypted_secrets vs on vs.id = ei.api_key_secret_id
  where ei.id = p_integration_id;
$$;

revoke all on function public.get_esp_api_key(uuid) from public;
grant execute on function public.get_esp_api_key(uuid) to service_role;
