"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { connectEsp } from "@/app/(dashboard)/dashboard/email/actions";
import type { EspIntegration, EspProviderName } from "@/lib/types";

const PROVIDER_OPTIONS: { value: EspProviderName; label: string; listLabel: string; listHint: string }[] = [
  {
    value: "convertkit",
    label: "Kit (ConvertKit)",
    listLabel: "List ID",
    listHint: "Optional, leave blank to just add subscribers without tagging a specific list.",
  },
  {
    value: "beehiiv",
    label: "Beehiiv",
    listLabel: "Publication ID",
    listHint: "Required, found in Beehiiv under Settings > Publication.",
  },
  {
    value: "mailerlite",
    label: "MailerLite",
    listLabel: "Group ID",
    listHint: "Optional, leave blank to add subscribers without a group.",
  },
];

export function ConnectEspModal({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: (integration: EspIntegration) => void;
}) {
  const [provider, setProvider] = useState<EspProviderName>("convertkit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = PROVIDER_OPTIONS.find((p) => p.value === provider)!;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await connectEsp(formData);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onConnected(result.integration);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Connect an email service">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Provider">
          {(p) => (
            <select
              {...p}
              name="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as EspProviderName)}
              className="h-11 w-full rounded-md border border-border bg-surface-1 px-3 text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-soft"
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="API key">
          {(p) => (
            <Input {...p} name="apiKey" type="password" required autoComplete="off" />
          )}
        </Field>

        <Field label={meta.listLabel} hint={meta.listHint}>
          {(p) => <Input {...p} name="listId" />}
        </Field>

        {error && (
          <p className="flex items-center gap-1.5 text-small text-danger">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}

        <p className="text-small text-text-muted">
          The key is stored encrypted and is never shown again after saving.
        </p>

        <Button type="submit" disabled={saving} className="mt-1 w-full">
          {saving ? "Connecting…" : "Connect"}
        </Button>
      </form>
    </Modal>
  );
}
