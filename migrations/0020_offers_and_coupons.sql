-- ============================================================================
-- 0020 — Order bumps and coupon codes (Milestone 4's last two gaps)
-- ============================================================================
--
-- product_offers and coupons have been in schema.sql since the start with no
-- code behind them and, until now, no RLS policies either: RLS was enabled
-- table by table in schema.sql and these two were never listed, so they were
-- readable by any authenticated key. Both get locked down here.
--
-- product_offers has no creator_id of its own — a row belongs to whoever owns
-- the primary product, and the bump product has to belong to them too, or a
-- creator could attach someone else's product to their own checkout.

alter table public.product_offers enable row level security;
alter table public.coupons enable row level security;

create policy "creators manage own offers" on public.product_offers
  for all
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = primary_product_id and p.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = primary_product_id and p.creator_id = auth.uid()
    )
    and exists (
      select 1 from public.products p
      where p.id = offer_product_id and p.creator_id = auth.uid()
    )
  );

create policy "creators manage own coupons" on public.coupons
  for all
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create index if not exists idx_product_offers_primary
  on public.product_offers (primary_product_id, position);

-- Codes are stored and compared uppercase, so a buyer typing "save10" gets
-- the same coupon as "SAVE10". The unique (creator_id, code) constraint from
-- schema.sql then really does mean one code per creator.
update public.coupons set code = upper(code) where code <> upper(code);

alter table public.coupons
  add constraint coupons_code_uppercase check (code = upper(code));

-- Claiming a redemption and checking there's one left have to happen in the
-- same statement: two buyers hitting the last redemption at once would
-- otherwise both read times_redeemed < max_redemptions and both be allowed.
-- Returns false when the coupon is used up or expired, in which case the
-- caller charges full price rather than failing the sale.
create or replace function public.redeem_coupon(coupon_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed integer;
begin
  update public.coupons
     set times_redeemed = times_redeemed + 1
   where id = coupon_id
     and (max_redemptions is null or times_redeemed < max_redemptions)
     and (expires_at is null or expires_at > now());
  get diagnostics claimed = row_count;
  return claimed > 0;
end;
$$;

-- Only the fulfillment path (service role) may claim a redemption; a creator
-- or a visitor has no business incrementing this counter.
revoke all on function public.redeem_coupon(uuid) from public;
grant execute on function public.redeem_coupon(uuid) to service_role;
