-- ============================================================================
-- 0015 — Let creators read the line items of their own orders
-- ============================================================================
--
-- order_items has had RLS enabled with no policy since schema.sql, so a
-- creator could see their orders but not which products were in them. The
-- Orders tab needs both. Read-only: order rows are only ever written by
-- fulfillOrder() with the service role after a verified payment.

create policy "creators read own order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.creator_id = auth.uid()
    )
  );
