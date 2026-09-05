"use client";

import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { track } from "@/lib/analytics/client";
import type { UnlockCondition } from "@/lib/types";

const PLATFORM_LABEL: Record<UnlockCondition["type"], string> = {
  follow_instagram: "Instagram",
  follow_tiktok: "TikTok",
};

/**
 * Honor-system gate — no platform exposes an API to verify a visitor
 * actually followed, so clicking the CTA opens the profile (default anchor
 * navigation, new tab) AND unlocks immediately, client-side only. The
 * `follow_unlock_clicked` event is what lets a creator see engagement
 * despite there being no real verification — see migrations/0010.
 */
export function FollowUnlockGate({
  condition,
  blockId,
  username,
  children,
}: {
  condition: UnlockCondition;
  blockId: string;
  username: string;
  children: ReactNode;
}) {
  const [unlocked, setUnlocked] = useState(false);

  if (unlocked) return <>{children}</>;

  return (
    <a
      href={condition.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        track({ username, eventType: "follow_unlock_clicked", blockId });
        setUnlocked(true);
      }}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-pill border border-current/15 px-6 text-body font-medium transition-transform duration-[170ms] hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <Lock className="h-3.5 w-3.5" />
      {condition.label || `Follow on ${PLATFORM_LABEL[condition.type]} to unlock`}
    </a>
  );
}
