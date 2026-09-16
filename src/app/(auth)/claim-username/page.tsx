"use client";

import { useActionState, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { checkUsernameAvailable, claimUsername } from "../actions";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

type Status = "idle" | "checking" | "available" | "unavailable";

export default function ClaimUsernamePage() {
  const [value, setValue] = useState("");
  // Result of the last completed availability check, keyed to the value it
  // was computed for, so `status` stays a derivation of render state.
  const [result, setResult] = useState<{
    value: string;
    available: boolean;
    reason?: string;
  } | null>(null);

  const [state, formAction, pending] = useActionState(claimUsername, null);

  const patternValid = value.length > 0 && USERNAME_RE.test(value);

  const status: Status = !value
    ? "idle"
    : result?.value === value
      ? result.available
        ? "available"
        : "unavailable"
      : "checking";

  const message =
    status === "available"
      ? "Available!"
      : status === "unavailable"
        ? result?.reason
        : null;

  useEffect(() => {
    if (!value) return;
    // Debounced so a fast typist doesn't fire a request per keystroke.
    const timeout = setTimeout(async () => {
      if (!patternValid) {
        setResult({
          value,
          available: false,
          reason:
            "3-20 characters, lowercase letters, numbers, underscores.",
        });
        return;
      }
      const check = await checkUsernameAvailable(value);
      setResult({ value, ...check });
    }, 400);
    return () => clearTimeout(timeout);
  }, [value, patternValid]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 md:px-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-[520px]"
      >
        <h1 className="text-h1 md:text-display text-text-primary">
          Claim your page
        </h1>
        <p className="mt-3 text-body-lg text-text-secondary">
          This is your public URL. You can&apos;t change it later without
          breaking existing links.
        </p>

        <form action={formAction} className="mt-10">
          <input type="hidden" name="username" value={value} />
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
              autoFocus
              value={value}
              onChange={(e) =>
                setValue(e.target.value.toLowerCase().replace(/\s/g, ""))
              }
              placeholder="username"
              className="flex-1 bg-transparent font-mono text-body text-text-primary placeholder:text-text-muted focus:outline-none"
              aria-describedby="username-status"
            />
            <div className="flex h-6 w-6 items-center justify-center">
              {/* No mode="wait" — see email-capture-block.tsx for why: in
                  dev mode an exit animation's completion can simply never
                  fire, and mode="wait" gates the next icon's mount on it. */}
              <AnimatePresence>
                {status === "checking" && (
                  <motion.div
                    key="checking"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
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
                  <motion.div
                    key="unavailable"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
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
              status === "available" && "text-success",
              status === "unavailable" && "text-danger",
              (status === "idle" || status === "checking") && "text-text-muted",
            )}
          >
            {state?.error ?? message ?? " "}
          </p>

          <Button
            type="submit"
            disabled={status !== "available" || pending}
            className="mt-6 w-full"
          >
            {pending ? "Claiming…" : "Continue"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
