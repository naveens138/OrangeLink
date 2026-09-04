-- ============================================================================
-- 0007 — Analytics & Attribution (Milestone 6)
-- ============================================================================

-- migration 0001's blanket deny-all lockdown covered visitors/
-- analytics_events/tracking_pixels along with everything else — the
-- dashboard now needs the creator to read their own funnel data, and to
-- manage their own pixel settings.
--
-- visitors/analytics_events are read-only for the creator: visitors are
-- never authenticated, so every write to these two tables goes through
-- service_role (src/lib/analytics/record-event.ts, called from the public
-- /api/track route and from fulfillOrder) — unlike esp_integrations or
-- email_subscribers, there's no "creator writes their own row" case here.
create policy "creators view own visitors" on public.visitors
  for select using (auth.uid() = creator_id);

create policy "creators view own analytics events" on public.analytics_events
  for select using (auth.uid() = creator_id);

-- tracking_pixels is the opposite: a creator-authenticated dashboard setting
-- (add/remove a Meta Pixel / GA4 / TikTok Pixel id), never written by an
-- anonymous visitor.
create policy "creators manage own tracking pixels" on public.tracking_pixels
  for all using (auth.uid() = creator_id);
