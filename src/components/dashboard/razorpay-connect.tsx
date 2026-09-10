"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { connectRazorpay, type PaymentsState } from "@/app/(dashboard)/dashboard/payments/actions";

export function RazorpayConnect({
  connected,
  keyId,
  isLive,
  hasWebhook,
  webhookUrl,
}: {
  connected: boolean;
  keyId: string | null;
  isLive: boolean;
  hasWebhook: boolean;
  webhookUrl: string;
}) {
  const [state, formAction, pending] = useActionState<PaymentsState, FormData>(
    connectRazorpay,
    null,
  );
  const [copied, setCopied] = useState(false);

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the URL is on screen to copy by hand.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {connected && (
        <div className="rounded-md border border-border bg-surface-1 p-4">
          <p className="text-h3">
            Connected{" "}
            <span className="font-mono text-small font-normal text-text-secondary">· {keyId}</span>
          </p>
          {!isLive && (
            <p className="mt-1 text-body text-warning">
              These are test keys. Real payments won&apos;t reach you until you
              connect your live Key ID.
            </p>
          )}
          {!hasWebhook && (
            <p className="mt-1 text-body text-text-secondary">
              No webhook secret saved yet. Add one below so a sale still
              completes if the buyer closes the tab mid-payment.
            </p>
          )}
        </div>
      )}

      <form action={formAction} className="flex max-w-xl flex-col gap-4">
        <Field
          label="Key ID"
          hint="Starts with rzp_live_. See the steps above for where to find it."
        >
          {(p) => (
            <Input
              {...p}
              name="key_id"
              defaultValue={keyId ?? ""}
              placeholder="rzp_live_xxxxxxxxxxxx"
              required
            />
          )}
        </Field>

        <Field
          label="Key Secret"
          hint={
            connected
              ? "Stored encrypted and never shown again. Enter it to replace the saved one."
              : "Shown by Razorpay only once, when you generate the key."
          }
        >
          {(p) => (
            <Input
              {...p}
              name="key_secret"
              type="password"
              placeholder="••••••••••••••••"
              required
            />
          )}
        </Field>

        <Field
          label="Webhook secret (optional)"
          hint="The secret you set when adding the webhook URL below in Razorpay."
        >
          {(p) => (
            <Input {...p} name="webhook_secret" type="password" placeholder="••••••••" />
          )}
        </Field>

        {state && "error" in state && (
          <p className="text-body text-danger">{state.error}</p>
        )}
        {state && "ok" in state && (
          <p className="text-body text-success">Payment account saved.</p>
        )}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Saving…" : connected ? "Update credentials" : "Connect Razorpay"}
        </Button>
      </form>

      <div className="max-w-xl rounded-md border border-border bg-surface-1 p-4">
        <p className="text-h3">Your webhook URL</p>
        <p className="mt-1 text-body text-text-secondary">
          Paste this into Razorpay under Account &amp; Settings → Webhooks,
          with the <code>payment.captured</code> event (steps 05 to 07 above).
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 truncate rounded border border-border bg-background px-3 py-2 text-small">
            {webhookUrl}
          </code>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={copyWebhook}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
}
