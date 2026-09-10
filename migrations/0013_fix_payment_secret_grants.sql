-- ============================================================================
-- 0013 — Close the same privilege leak 0005 fixed, reintroduced in 0011
-- ============================================================================
--
-- 0011's wrappers used `revoke all ... from public`, which does NOT remove a
-- grant held by a named role. Supabase applies `alter default privileges ...
-- grant execute on functions to anon, authenticated, service_role` across
-- `public`, so all four functions were EXECUTE-able by anon and
-- authenticated from creation — exactly the failure 0005 documented for the
-- ESP wrappers.
--
-- Impact while it stood: an anon-keyed client could call
-- get_creator_payment_credentials(<creator uuid>) and receive that creator's
-- Razorpay key secret and webhook secret in plaintext. Creator ids are not
-- secret — they appear in each creator's own webhook URL. No payment
-- account had been connected yet, so nothing was actually exposed, but the
-- hole was live.
--
-- The fix is to name the roles explicitly. The `revoke ... from public`
-- lines are kept for defensiveness but are not load-bearing.

revoke execute on function public.store_payment_secret(text)
  from anon, authenticated, public;
grant execute on function public.store_payment_secret(text) to authenticated;

revoke execute on function public.update_payment_secret(uuid, text)
  from anon, authenticated, public;
grant execute on function public.update_payment_secret(uuid, text) to authenticated;

revoke execute on function public.delete_payment_secret(uuid)
  from anon, authenticated, public;
grant execute on function public.delete_payment_secret(uuid) to authenticated;

-- Decryption is service_role only. Never anon, never authenticated: a
-- signed-in creator has no reason to read raw credentials back, and the
-- dashboard only ever shows "connected".
revoke execute on function public.get_creator_payment_credentials(uuid)
  from anon, authenticated, public;
grant execute on function public.get_creator_payment_credentials(uuid) to service_role;
