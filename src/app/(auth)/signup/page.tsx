"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/google-button";
import { OnboardingProgress } from "@/components/auth/onboarding-progress";
import { UsernameField, type UsernameStatus } from "@/components/auth/username-field";
import { TRIAL_DAYS } from "@/lib/billing/trial-length";
import { PENDING_USERNAME_KEY } from "@/components/auth/pending-username";
import { createAccount } from "../actions";

/**
 * Signing up, in two steps: the link first, then the account behind it.
 *
 * The order is the point. Choosing the username is the part a creator
 * actually wants to do, and doing it first means the second screen can greet
 * them by it, which is worth more than saving one screen. Nothing is created
 * until the second step submits, so abandoning at step one leaves nothing
 * behind.
 */
export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [state, formAction, pending] = useActionState(createAccount, null);

  const confirmEmail = state && "confirmEmail" in state ? state.confirmEmail : null;
  const error = state && "error" in state ? state.error : null;

  // The name they picked has to survive the trip through their inbox: they
  // come back as a signed-in account with no store yet, and the claim screen
  // reads this so they don't have to choose twice.
  useEffect(() => {
    if (!confirmEmail || !username) return;
    try {
      window.localStorage.setItem(PENDING_USERNAME_KEY, username);
    } catch {
      // Private mode, or storage turned off. They pick the name again.
    }
  }, [confirmEmail, username]);

  if (confirmEmail) {
    return (
      <div className="flex flex-1 flex-col items-center px-6 py-10 md:py-16">
        <OnboardingProgress steps={2} current={2} className="mb-10" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-[460px] text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-h1">Check your inbox</h1>
          <p className="mt-3 text-body-lg text-text-secondary">
            We sent a confirmation link to{" "}
            <span className="text-text-primary">{confirmEmail}</span>. Open it
            and orangelink.in/{username} is yours.
          </p>
          <p className="mt-6 text-small text-text-muted">
            Nothing arrived? Check spam, or{" "}
            <Link href="/login" className="text-text-primary underline underline-offset-2">
              log in
            </Link>{" "}
            if you already confirmed.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10 md:py-16">
      <OnboardingProgress steps={2} current={step} className="mb-10" />

      <div className="w-full max-w-[460px]">
        {/* One step at a time, each animating itself in. Deliberately not
            AnimatePresence with mode="wait": an exit animation's completion
            can simply never fire in dev, and mode="wait" gates the next
            step's mount on it, so the wizard would stick on step one. Same
            trap as the icons in username-field.tsx. */}
        {step === 1 ? (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
          >
              <div className="text-center">
                <h1 className="text-h1 md:text-display">Claim your link</h1>
                <p className="mt-3 text-body-lg text-text-secondary">
                  This is what you&apos;ll share everywhere. Pick it carefully:
                  changing it later breaks links you&apos;ve already put out.
                </p>
              </div>

              <form
                className="mt-9"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (status === "available") setStep(2);
                }}
              >
                <UsernameField
                  value={username}
                  onChange={setUsername}
                  onStatusChange={setStatus}
                  autoFocus
                />
                <Button type="submit" disabled={status !== "available"} className="w-full">
                  Next
                </Button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-small text-text-muted">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Google skips ahead: the account comes back from Google, and
                  the username is claimed on the way in instead. */}
              <GoogleButton className="rounded-[8px]!" />
            </motion.div>
        ) : (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
          >
              <div className="text-center">
                <h1 className="text-h1 md:text-display">
                  Hey @{username} <span aria-hidden>👋</span>
                </h1>
                <p className="mt-3 text-body-lg text-text-secondary">
                  Let&apos;s get your store open.
                </p>
              </div>

              <form action={formAction} className="mt-9 flex flex-col gap-4">
                <input type="hidden" name="username" value={username} />

                <Field label="Your name" hint="Shown on your page">
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      name="display_name"
                      autoComplete="name"
                      placeholder="Jane Doe"
                      autoFocus
                    />
                  )}
                </Field>

                <Field label="Email">
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  )}
                </Field>

                <Field label="Password" hint="At least 8 characters">
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      name="password"
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                    />
                  )}
                </Field>

                {error && <p className="text-small text-danger">{error}</p>}

                <Button type="submit" disabled={pending} className="mt-2 w-full">
                  {pending ? "Creating your store…" : "Create my store"}
                </Button>

                <p className="text-center text-small text-text-muted">
                  {TRIAL_DAYS} days free, no card needed.
                </p>
              </form>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-6 inline-flex items-center gap-1.5 text-small text-text-secondary transition-colors hover:text-text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                orangelink.in/{username}
              </button>
          </motion.div>
        )}

        <p className="mt-10 text-center text-small text-text-muted">
          Have an account?{" "}
          <Link href="/login" className="text-text-primary underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
