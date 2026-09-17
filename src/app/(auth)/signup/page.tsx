"use client";

import Link from "next/link";
import { useActionState } from "react";
import { motion } from "framer-motion";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/google-button";
import { signUp } from "../actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, null);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-[460px]"
      >
        <div className="mb-10 text-center">
          <h1 className="text-h1 md:text-display">
            <span className="block text-text-secondary">One link.</span>
            <span className="block text-text-primary">Everything you sell.</span>
          </h1>
          <p className="mt-6 text-body-lg text-text-secondary">
            Start free. No card needed.
          </p>
        </div>

        <GoogleButton className="rounded-[8px]!" />

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-small text-text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <Field label="Email">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="rounded-[16px]"
              />
            )}
          </Field>
          <Field label="Password" error={state?.error}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                invalid={Boolean(state?.error)}
                className="rounded-[16px]"
              />
            )}
          </Field>

          <Button
            type="submit"
            disabled={pending}
            className="mt-2 w-full rounded-[8px]!"
          >
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-small text-text-muted">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline hover:text-text-secondary">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-text-secondary">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-8 text-center text-body text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-text-primary underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
