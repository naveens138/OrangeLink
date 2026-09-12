const VISITOR_KEY = "ol_visitor_id";

/**
 * A first-party, anonymous visitor id — generated once per browser and kept
 * in localStorage (no cookie, no third party, nothing to consent-gate).
 * Every call this session reads back the same id, so a visit -> click ->
 * checkout funnel can be joined server-side by `visitor_id` alone.
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // localStorage can throw (private browsing, blocked site data) — fall
    // back to a per-call id rather than breaking the page over analytics.
    return crypto.randomUUID();
  }
}

/**
 * True when this page is framed by the OrangeLink dashboard (the Links
 * editor's phone preview). Reading a cross-origin parent throws, so a page
 * embedded anywhere else still tracks normally.
 */
function isDashboardPreview(): boolean {
  try {
    return window.self !== window.top && window.top!.location.pathname.startsWith("/dashboard");
  } catch {
    return false;
  }
}

export interface TrackInput {
  username: string;
  eventType:
    | "page_view"
    | "block_click"
    | "product_view"
    | "checkout_start"
    | "follow_unlock_clicked";
  pageId?: string;
  blockId?: string;
  productId?: string;
}

/**
 * Fire-and-forget event beacon. Uses `sendBeacon` so a click that
 * immediately navigates away (same tab, e.g. a product card) doesn't race
 * the request against the navigation — falls back to a keepalive fetch for
 * browsers/contexts without it.
 */
export function track(input: TrackInput): void {
  if (typeof window === "undefined") return;
  // The dashboard's live preview shows the real page in an iframe; a
  // creator editing their own page shouldn't count as visits and clicks.
  if (isDashboardPreview()) return;

  const params = new URLSearchParams(window.location.search);
  const body = JSON.stringify({
    ...input,
    visitorId: getVisitorId(),
    utm: {
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_content: params.get("utm_content") || undefined,
    },
    referrer: document.referrer || undefined,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    return;
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
