"use client";

import { motion } from "framer-motion";

// The hero-adjacent proof element — in the reference this slot is a booking
// widget; here it's more honest to show the actual product, so it's a
// miniature of the real public-page layout rather than a borrowed pattern.
export function PagePreviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1], delay: 0.1 }}
      className="relative w-full max-w-[340px] rounded-2xl border border-border bg-surface-1 p-6 shadow-[var(--shadow-elevated)]"
    >
      <div className="absolute -top-3 right-6 flex items-center gap-1.5 rounded-pill bg-success/15 px-3 py-1 text-label font-medium text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Live
      </div>

      <div className="flex flex-col items-center gap-2 border-b border-border pb-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-body font-semibold text-accent">
          J
        </div>
        <p className="text-body font-medium text-text-primary">Jane Rivera</p>
        <p className="text-small text-text-muted">orangelink.co/jane</p>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <div className="flex h-10 items-center justify-center rounded-pill border border-border text-small text-text-secondary">
          My YouTube channel
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-sm bg-surface-3" />
            <span className="text-small text-text-secondary">
              Editorial Presets
            </span>
          </div>
          <span className="font-mono text-small text-text-primary">$24</span>
        </div>
        <div className="flex items-center justify-between rounded-md px-3 py-2">
          <span className="text-small text-text-muted">Notify me</span>
          <div className="h-7 w-16 rounded-pill bg-accent-soft" />
        </div>
      </div>
    </motion.div>
  );
}
