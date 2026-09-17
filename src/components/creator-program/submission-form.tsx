"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, Check } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type State =
  | { name: "idle" }
  | { name: "sending" }
  | { name: "sent"; hasAccount: boolean }
  | { name: "error"; message: string; full?: boolean };

export function SubmissionForm({ defaultIdentity }: { defaultIdentity?: string }) {
  const [identity, setIdentity] = useState(defaultIdentity ?? "");
  const [reelUrl, setReelUrl] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<State>({ name: "idle" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState({ name: "sending" });
    try {
      const res = await fetch("/api/creator-program/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, reelUrl, note, website }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setState({ name: "sent", hasAccount: Boolean(data.hasAccount) });
      } else {
        setState({ name: "error", message: data.error ?? "Something went wrong.", full: data.full });
      }
    } catch {
      setState({ name: "error", message: "Couldn't reach OrangeLink. Check your connection." });
    }
  }

  if (state.name === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface-1 px-6 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="h-5 w-5" />
        </div>
        <p className="t-heading">Got it. Thanks for posting!</p>
        <p className="t-small max-w-[40ch] text-text-secondary">
          We&apos;ll review your reel and get back to you within 48 hours.
        </p>
        {!state.hasAccount && (
          <p className="t-small max-w-[40ch] text-text-secondary">
            You don&apos;t have an OrangeLink account yet.{" "}
            <Link href="/signup" className="font-medium text-text-primary underline underline-offset-2">
              Sign up with the same email
            </Link>{" "}
            so we can add your free year.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-md border border-border bg-surface-1 p-6"
    >
      <Field label="Username or email" hint="Not signed up yet? Use your email.">
        {(p) => (
          <Input
            {...p}
            required
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="yourname or you@example.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        )}
      </Field>

      <Field label="Reel link" hint="From Instagram or TikTok.">
        {(p) => (
          <Input
            {...p}
            required
            type="url"
            inputMode="url"
            value={reelUrl}
            onChange={(e) => setReelUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
          />
        )}
      </Field>

      <Field label="Note (optional)">
        {(p) => (
          <textarea
            {...p}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Anything we should know?"
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-small text-text-primary placeholder:text-text-muted transition-colors duration-[170ms] focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-black/5"
          />
        )}
      </Field>

      {/* Hidden from people; bots that fill every field give themselves away. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      {state.name === "error" && (
        <p className="flex items-center gap-1.5 text-small text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {state.message}
          {state.full && " Refresh the page to join it."}
        </p>
      )}

      <Button type="submit" disabled={state.name === "sending"} className="mt-1 w-full">
        {state.name === "sending" ? "Sending…" : "Submit my reel"}
      </Button>
    </form>
  );
}
