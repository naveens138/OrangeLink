-- ============================================================================
-- 0014 — Custom domains for creator pages
-- ============================================================================
--
-- A creator can point their own domain (shop.theirname.com) at their page.
-- The domain is registered on the Vercel project through Vercel's API
-- (lib/vercel/domains.ts), and proxy.ts maps an incoming request's host to
-- the creator's page through resolve_custom_domain() below.
--
-- schema.sql already created public.custom_domains (unused, empty) with a
-- `for all` policy. That policy let a creator write any column of their own
-- row, including verification_status, so they could mark a domain verified
-- without Vercel ever confirming the DNS. This migration tightens it:
--
--   * creators can only READ their row through RLS; every write goes through
--     the dashboard's server actions using the service role, after checking
--     the caller and asking Vercel
--   * verification_status = 'verified' is the single "live" flag, set only
--     once Vercel reports the domain verified and correctly configured
--   * domains must be well-formed lowercase hostnames, one per creator

drop policy if exists "creators manage own domains" on public.custom_domains;

create policy "creators read own domain"
  on public.custom_domains for select
  to authenticated
  using (creator_id = auth.uid());

alter table public.custom_domains
  add constraint custom_domains_domain_format
  check (domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$');

create unique index if not exists custom_domains_one_per_creator
  on public.custom_domains (creator_id);

-- Maps a request host to the username whose page it serves. Called by the
-- proxy with the anon key on every custom-domain request, so it returns
-- only what is already public (a username), and only for verified domains
-- whose page is published.
create or replace function public.resolve_custom_domain(host text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.username
  from public.custom_domains d
  join public.creators c on c.id = d.creator_id
  join public.pages p on p.id = d.page_id
  where d.domain = lower(host)
    and d.verification_status = 'verified'
    and p.published
$$;

-- Named roles, not just `public`: Supabase's default privileges grant
-- EXECUTE to anon and authenticated directly (see 0005 and 0013). Here that
-- access is intended, so it is granted explicitly after a clean revoke.
revoke execute on function public.resolve_custom_domain(text) from public, anon, authenticated;
grant execute on function public.resolve_custom_domain(text) to anon, authenticated, service_role;
