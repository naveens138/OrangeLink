"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

/** Fires one page_view per mount — placed once at the top of the public page. */
export function PageTracker({ username, pageId }: { username: string; pageId: string }) {
  useEffect(() => {
    track({ username, eventType: "page_view", pageId });
    // Fire once per page load only — not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
