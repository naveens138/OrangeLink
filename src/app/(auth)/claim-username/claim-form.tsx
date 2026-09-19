"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { OnboardingProgress } from "@/components/auth/onboarding-progress";
import { UsernameField, type UsernameStatus } from "@/components/auth/username-field";
import { TRIAL_DAYS } from "@/lib/billing/trial-length";
import { PENDING_USERNAME_KEY } from "@/components/auth/pending-username";
import { claimUsername } from "../actions";

/**
 * Where someone lands when they have an account but no link yet: after
 * Google, or after an email signup on a project with confirmation switched
 * on. Same chrome as the signup wizard, on its second step, because from the
 * creator's side it is the second step.
 */
export function ClaimUsernameForm() {
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("username")?.toLowerCase() ?? "");

  // A name picked on the wizard's first step, before an email confirmation
  // interrupted the signup. Read after mount rather than as initial state:
  // localStorage doesn't exist while this renders on the server, and reading
  // it during render would make the two disagree.
  useEffect(() => {
    if (value) return;
    try {
      const pending = window.localStorage.getItem(PENDING_USERNAME_KEY);
      // Reading browser storage is exactly the "sync with an external
      // system" an effect is for; there's no render-time equivalent, since
      // localStorage doesn't exist on the server.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (pending) setValue(pending);
    } catch {
      // No storage available. They pick a name as normal.
    }
    // Only ever a starting point, so this runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [state, formAction, pending] = useActionState(claimUsername, null);

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10 md:py-16">
      <OnboardingProgress steps={2} current={2} className="mb-10" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-[460px]"
      >
        <div className="text-center">
          <h1 className="text-h1 md:text-display">Claim your link</h1>
          <p className="mt-3 text-body-lg text-text-secondary">
            This is what you&apos;ll share everywhere. Pick it carefully:
            changing it later breaks links you&apos;ve already put out.
          </p>
        </div>

        <form action={formAction} className="mt-9">
          <input type="hidden" name="username" value={value} />
          <UsernameField
            value={value}
            onChange={setValue}
            onStatusChange={setStatus}
            autoFocus
            message={state?.error}
          />
          <Button
            type="submit"
            onClick={() => {
              // Claimed or not, this name has served its purpose here.
              try {
                window.localStorage.removeItem(PENDING_USERNAME_KEY);
              } catch {}
            }}
            disabled={status !== "available" || pending}
            className="w-full"
          >
            {pending ? "Opening your store…" : "Open my store"}
          </Button>
          <p className="mt-4 text-center text-small text-text-muted">
            {TRIAL_DAYS} days free, no card needed.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
