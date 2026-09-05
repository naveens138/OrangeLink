-- ============================================================================
-- 0010 — Rich link cards, tabbed public page, follow-to-unlock blocks
-- ============================================================================
-- No new tables or columns: per BUILD_BRIEF's existing jsonb-config pattern,
-- everything here lives in blocks.config / pages.theme (both already
-- schemaless jsonb) except one CHECK constraint that has to be widened to
-- accept a new analytics event type.
--
--   blocks.config additions (link blocks):
--     image, description — auto-fetched via the same og:*/embedded-JSON
--     extraction already used for Milestone 3 import, or set by hand.
--     badge — optional short overlay text (e.g. a discount code).
--   blocks.config addition (any block):
--     unlock_condition: { type: 'follow_instagram' | 'follow_tiktok',
--     url, label? } — honor-system gate, see FollowUnlockGate.
--   pages.theme addition:
--     tabbed_view: boolean — Links/Shop tabs vs one continuous scroll.

alter table public.analytics_events
  drop constraint analytics_events_event_type_check;

alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type in (
    'page_view', 'block_click', 'product_view', 'checkout_start',
    'checkout_complete', 'email_capture', 'follow_unlock_clicked'
  ));
