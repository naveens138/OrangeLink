import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { recordEvent, parseDeviceType, type AnalyticsEventType } from "@/lib/analytics/record-event";

// checkout_complete is deliberately absent here — it's only ever written
// server-side, from fulfillOrder once a payment provider has actually
// confirmed money moved. Accepting it from the client would let anyone
// fabricate a "sale" with a fetch call.
const CLIENT_EVENT_TYPES: AnalyticsEventType[] = [
  "page_view",
  "block_click",
  "product_view",
  "checkout_start",
  "follow_unlock_clicked",
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TrackBody {
  username?: string;
  visitorId?: string;
  eventType?: string;
  pageId?: string;
  blockId?: string;
  productId?: string;
  utm?: { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string };
  referrer?: string;
}

/**
 * Public, unauthenticated tracking beacon — visitors browsing a creator's
 * page are never signed in, so this (like public-page reads and email
 * capture) runs through the service role rather than RLS. Body arrives via
 * `navigator.sendBeacon`, which can't set custom headers, so this only ever
 * reads a fixed, known shape rather than trusting an open `metadata` blob
 * from the client.
 */
export async function POST(request: NextRequest) {
  let body: TrackBody;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const { username, visitorId, eventType, pageId, blockId, productId, utm, referrer } = body;

  if (
    !username ||
    !visitorId ||
    !UUID_RE.test(visitorId) ||
    !eventType ||
    !CLIENT_EVENT_TYPES.includes(eventType as AnalyticsEventType)
  ) {
    return new NextResponse(null, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!creator) return new NextResponse(null, { status: 404 });

  await recordEvent({
    creatorId: creator.id,
    visitorId,
    eventType: eventType as AnalyticsEventType,
    pageId: pageId ?? null,
    blockId: blockId ?? null,
    productId: productId ?? null,
    utm,
    referrer: referrer ?? request.headers.get("referer"),
    deviceType: parseDeviceType(request.headers.get("user-agent")),
  });

  return new NextResponse(null, { status: 204 });
}
