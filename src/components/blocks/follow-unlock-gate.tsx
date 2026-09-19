"use client";

import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { unlockBlock } from "@/app/(public)/[username]/actions";
import type { UnlockCondition, UnlockedBlock } from "@/lib/types";

const PLATFORM_LABEL: Record<UnlockCondition["type"], string> = {
  follow_instagram: "Instagram",
  follow_tiktok: "TikTok",
};

/**
 * Honor-system gate — no platform exposes an API to verify a visitor
 * actually followed, so clicking the CTA opens the profile (default anchor
 * navigation, new tab) AND unlocks, with no verification. The
 * `follow_unlock_clicked` event is what lets a creator see engagement
 * despite there being no real verification — see migrations/0010.
 *
 * The page arrives without the block's content, so a function `children`
 * means it's fetched from unlockBlock on the click; the gate stays up until
 * it lands, by which time the visitor is usually on the profile tab. Plain
 * `children` is content already in hand, after a password gate opened it.
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
  children: ReactNode | ((unlocked: UnlockedBlock) => ReactNode);
}) {
  const [unlocked, setUnlocked] = useState<UnlockedBlock | true | null>(null);

  if (unlocked) {
    if (typeof children !== "function") return <>{children}</>;
    if (unlocked !== true) return <>{children(unlocked)}</>;
  }

  function unlock() {
    if (typeof children !== "function") {
      setUnlocked(true);
      return;
    }
    // A failed fetch leaves the gate up, so another click can try again.
    unlockBlock(username, blockId, null)
      .then((result) => {
        if (result.ok) setUnlocked({ block: result.block, products: result.products });
      })
      .catch(() => {});
  }

  return (
    <a
      href={condition.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        track({ username, eventType: "follow_unlock_clicked", blockId });
        unlock();
      }}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-pill border border-current/15 px-6 text-body font-medium transition-transform duration-[170ms] hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <Lock className="h-3.5 w-3.5" />
      {condition.label || `Follow on ${PLATFORM_LABEL[condition.type]} to unlock`}
    </a>
  );
}
