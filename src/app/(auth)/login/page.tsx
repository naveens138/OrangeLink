"use client";

import Link from "next/link";
import { use } from "react";
import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/google-button";
import { signIn } from "../actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error: oauthError } = use(searchParams);
  const [state, formAction, pending] = useActionState(signIn, null);

  // An OAuth attempt that fails comes back as ?error= on this page rather
  // than through the form action, so both surface in the same place.
  const errorMessage = state?.error ?? oauthError;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8">
          <h1 className="text-h1 md:text-h2">Welcome back</h1>
          <p className="mt-2 text-body text-text-secondary">
            Log in to manage your page.
          </p>
        </div>

        <GoogleButton next={next} />

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-small text-text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next ?? ""} />
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
          <Field label="Password" error={errorMessage}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                name="password"
                type="password"
                required
                autoComplete="current-password"
                invalid={Boolean(errorMessage)}
              />
            )}
          </Field>

          <Button type="submit" disabled={pending} className="mt-2 w-full">
            {pending ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-8 text-body text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-text-primary underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
