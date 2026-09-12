"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCw } from "lucide-react";

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

/**
 * The creator's real public page, live, in a phone frame beside the editor.
 *
 * It's an iframe of the actual page rather than a re-render of the blocks,
 * so what it shows is exactly what visitors get: themes, AI designs, fonts,
 * products, tabs. `version` bumps after every save; the frame reloads a
 * moment later (typing doesn't reload on every keystroke), and the new copy
 * loads behind the current one so the preview never flashes blank.
 * Analytics skip themselves inside this frame (lib/analytics/client.ts).
 */
export function PhonePreview({
  username,
  version,
  width = 300,
}: {
  username: string;
  version: number;
  /** Outer width of the phone in px; the page inside scales to fit. */
  width?: number;
}) {
  // A manual refresh bumps the nonce; saves bump `version` (from the editor).
  const [nonce, setNonce] = useState(0);
  const target = `${version}.${nonce}`;
  const [shown, setShown] = useState(target);
  const [loading, setLoading] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  // Wait for a pause in saving before reloading, so typing into a field
  // doesn't reload on every keystroke.
  useEffect(() => {
    if (target === shown) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLoading(target), 700);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [target, shown]);

  const screen = width - 18; // 9px bezel each side
  const scale = screen / PHONE_WIDTH;
  const src = (key: string) => `/${username}?preview=${key}`;

  const frameStyle = {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  } as const;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-[44px] bg-[#1d1d1f] p-[9px]" style={{ width }}>
        <div
          className="relative overflow-hidden rounded-[36px] bg-white"
          style={{ width: screen, height: PHONE_HEIGHT * scale }}
        >
          <iframe
            key={`shown-${shown}`}
            src={src(shown)}
            title="Live preview of your page"
            className="absolute left-0 top-0 border-0"
            style={frameStyle}
          />
          {loading !== null && loading !== shown && (
            <iframe
              key={`loading-${loading}`}
              src={src(loading)}
              title="Updating preview"
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 border-0 opacity-0"
              style={frameStyle}
              onLoad={() => {
                setShown(loading);
                setLoading(null);
              }}
            />
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-[12px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className={loading !== null ? "h-1.5 w-1.5 animate-pulse rounded-full bg-warning" : "h-1.5 w-1.5 rounded-full bg-success"} />
          {loading !== null ? "Updating…" : "Live preview"}
        </span>
        <button
          type="button"
          onClick={() => setNonce((n) => n + 1)}
          className="flex items-center gap-1 hover:text-text-primary"
        >
          <RotateCw className="h-3 w-3" />
          Refresh
        </button>
        <a
          href={`/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-text-primary"
        >
          Open
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
