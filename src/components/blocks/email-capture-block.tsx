"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";
import { captureEmail } from "@/lib/email/capture";
import type { Block } from "@/lib/types";

export function EmailCaptureBlock({
  block,
  username,
}: {
  block: Block;
  username: string;
}) {
  const config = block.config as { headline?: string; cta_text?: string };
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("submitting");
    setError(null);

    const result = await captureEmail(username, email, "page_capture");
    if (result.ok) {
      setStatus("done");
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  return (
    <div className="rounded-lg border border-current/15 p-5">
      {/* No AnimatePresence/exit animation here on purpose — same root cause
          as components/ui/modal.tsx. An exit animation's completion callback
          can simply never fire in this dev environment (Next 16 Turbopack +
          React 19 Strict Mode), leaving the outgoing element stuck in the DOM
          forever instead of unmounting — reproduced here as the form staying
          rendered on top of the success message after a real, successful
          submit. Plain conditional rendering has only an enter animation, so
          swapping views is a synchronous state flip with nothing to get
          stuck on. */}
      {status === "done" ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 py-2"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-4 w-4" />
          </div>
          <p className="text-body">You&apos;re on the list.</p>
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <p className="text-h3">{config.headline ?? "Join the list"}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 flex-1 rounded-md border border-current/15 bg-transparent px-4 text-body placeholder:opacity-50 focus:outline-none focus:border-current/40"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="h-12 rounded-pill bg-accent px-6 text-body font-medium text-white transition-transform active:scale-[0.97] disabled:opacity-60"
            >
              {status === "submitting" ? "…" : (config.cta_text ?? "Subscribe")}
            </button>
          </div>
          {status === "error" && error && (
            <p className="flex items-center gap-1.5 text-small text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
