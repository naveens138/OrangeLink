-- ============================================================================
-- 0012 — Zero the legacy per-sale fee on existing creators
-- ============================================================================
--
-- 0011 changed the default to 0 for new creators, but rows created before it
-- still carry 500 bps. Those creators now sell through their own Razorpay
-- account, so the platform never receives that 5% — leaving the value in
-- place would make fulfill_order record a fee that nobody actually charged
-- and inflate the payout ledger against money OrangeLink never held.

update public.creators set platform_fee_bps = 0 where platform_fee_bps <> 0;
