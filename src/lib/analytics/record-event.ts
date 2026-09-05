import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type AnalyticsEventType =
  | "page_view"
  | "block_click"
  | "product_view"
  | "checkout_start"
  | "checkout_complete"
  | "follow_unlock_clicked";

export interface UtmParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
}

export interface RecordEventInput {
  creatorId: string;
  visitorId: string;
  eventType: AnalyticsEventType;
  pageId?: string | null;
  blockId?: string | null;
  productId?: string | null;
  orderId?: string | null;
  metadata?: Record<string, unknown>;
  utm?: UtmParams | null;
  referrer?: string | null;
  deviceType?: string | null;
}

/**
 * Ensures the visitor row exists, then appends one row to the event stream.
 * Runs with the service role — visitors are never authenticated, so this is
 * the only path that can write either table (see migrations/0007).
 *
 * First-touch attribution: `ignoreDuplicates` means UTM/referrer/device are
 * only ever recorded on the visitor's *first* event. A later event from the
 * same visitor id (e.g. a return visit with no UTM params, or a different
 * referrer) never overwrites how they were originally attributed.
 */
export async function recordEvent(input: RecordEventInput): Promise<void> {
  const supabase = createServiceRoleClient();

  await supabase.from("visitors").upsert(
    {
      id: input.visitorId,
      creator_id: input.creatorId,
      utm_source: input.utm?.utm_source ?? null,
      utm_medium: input.utm?.utm_medium ?? null,
      utm_campaign: input.utm?.utm_campaign ?? null,
      utm_content: input.utm?.utm_content ?? null,
      referrer: input.referrer ?? null,
      device_type: input.deviceType ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  await supabase.from("analytics_events").insert({
    creator_id: input.creatorId,
    visitor_id: input.visitorId,
    page_id: input.pageId ?? null,
    block_id: input.blockId ?? null,
    product_id: input.productId ?? null,
    order_id: input.orderId ?? null,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
  });
}

/** mobile | tablet | desktop, from a plain User-Agent sniff — no external service, no fabricated precision. */
export function parseDeviceType(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (/iPad|Tablet/i.test(userAgent)) return "tablet";
  if (/Mobile|Android|iPhone|iPod/i.test(userAgent)) return "mobile";
  return "desktop";
}
