"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { checkUsernameAvailable } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export type UsernameStatus = "idle" | "checking" | "available" | "unavailable";

/**
 * The orangelink.in/<name> field, with the live availability check behind it.
 *
 * Shared by the signup wizard's first step and the claim screen people land
 * on after Google, so the two can't drift apart. The check is only ever
 * advisory: both paths re-check server-side before anything is created,
 * because a name can go between the tick appearing and the form submitting.
 */
export function UsernameField({
  value,
  onChange,
  onStatusChange,
  autoFocus,
  message,
}: {
  value: string;
  onChange: (value: string) => void;
  onStatusChange?: (status: UsernameStatus) => void;
  autoFocus?: boolean;
  /** An error from the server, shown in place of the local hint. */
  message?: string | null;
}) {
  const [result, setResult] = useState<{
    value: string;
    available: boolean;
    reason?: string;
  } | null>(null);

  const patternValid = value.length > 0 && USERNAME_RE.test(value);

  const status: UsernameStatus = !value
    ? "idle"
    : result?.value === value
      ? result.available
        ? "available"
        : "unavailable"
      : "checking";

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  useEffect(() => {
    if (!value) return;
    // Debounced so a fast typist doesn't fire a request per keystroke.
    const timeout = setTimeout(async () => {
      if (!patternValid) {
        setResult({
          value,
          available: false,
          reason: "3-20 characters, lowercase letters, numbers, underscores.",
        });
        return;
      }
      const check = await checkUsernameAvailable(value);
      setResult({ value, ...check });
    }, 400);
    return () => clearTimeout(timeout);
  }, [value, patternValid]);

  const hint =
    status === "available"
      ? "Available!"
      : status === "unavailable"
        ? result?.reason
        : null;

  return (
    <div>
      <div
        className={cn(
          "flex h-14 items-center rounded-md border bg-surface-1 pl-4 pr-3 transition-colors duration-[170ms]",
          status === "available" && "border-success",
          status === "unavailable" && "border-danger",
          (status === "idle" || status === "checking") &&
            "border-border focus-within:border-border-strong",
        )}
      >
        <span className="whitespace-nowrap text-body text-text-muted">
          orangelink.in/
        </span>
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s/g, ""))}
          placeholder="username"
          className="flex-1 bg-transparent font-mono text-body text-text-primary placeholder:text-text-muted focus:outline-none"
          aria-describedby="username-status"
        />
        <div className="flex h-6 w-6 items-center justify-center">
          {/* No mode="wait" — see email-capture-block.tsx for why: in dev an
              exit animation's completion can simply never fire, and
              mode="wait" gates the next icon's mount on it. */}
          <AnimatePresence>
            {status === "checking" && (
              <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
              </motion.div>
            )}
            {status === "available" && (
              <motion.div
                key="available"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <Check className="h-4 w-4 text-success" />
              </motion.div>
            )}
            {status === "unavailable" && (
              <motion.div key="unavailable" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <X className="h-4 w-4 text-danger" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p
        id="username-status"
        className={cn(
          "mt-2 min-h-[1.25rem] text-small",
          status === "available" && !message && "text-success",
          (status === "unavailable" || message) && "text-danger",
          status !== "available" && status !== "unavailable" && !message && "text-text-muted",
        )}
      >
        {message ?? hint ?? " "}
      </p>
    </div>
  );
}
