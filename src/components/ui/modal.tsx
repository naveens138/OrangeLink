"use client";

import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = "max-w-[520px]",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (typeof document === "undefined" || !open) return null;

  // No AnimatePresence/exit animation here on purpose — see git history for
  // context. AnimatePresence gates unmounting a closed modal on its exit
  // animation reporting complete, and in this dev environment (Next 16
  // Turbopack + React 19 Strict Mode) that completion callback could simply
  // never fire, permanently freezing every modal in the app at opacity: 0
  // instead of actually closing — reproduced across multiple unrelated
  // modals, not fixable by working around any one call site. A plain
  // conditional render only has an enter animation, so closing is a
  // synchronous state flip with nothing to get stuck on.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-border bg-surface-1 p-6 shadow-[var(--shadow-elevated)] md:max-h-[85vh] md:w-full md:rounded-2xl",
          maxWidthClassName,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          {title ? <h3 className="text-h3">{title}</h3> : <span />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>,
    document.body,
  );
}
