"use client";

import { useState } from "react";
import { Mail, Plus, Power, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectEspModal } from "./connect-esp-modal";
import { disconnectEsp, toggleEspSync } from "@/app/(dashboard)/dashboard/email/actions";
import { formatDate } from "@/lib/format";
import type { EmailSubscriber, EspIntegration, EspProviderName } from "@/lib/types";

const PROVIDER_LABELS: Record<EspProviderName, string> = {
  convertkit: "Kit (ConvertKit)",
  beehiiv: "Beehiiv",
  mailerlite: "MailerLite",
};

const SOURCE_LABELS: Record<string, string> = {
  page_capture: "Page",
  checkout: "Checkout",
  comment_dm: "Comment DM",
  import: "Import",
};

export function EmailManager({
  initialSubscribers,
  initialIntegrations,
}: {
  initialSubscribers: EmailSubscriber[];
  initialIntegrations: EspIntegration[];
}) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const activeSubscribers = initialSubscribers.filter((s) => !s.unsubscribed_at);

  function onConnected(integration: EspIntegration) {
    setIntegrations((prev) => {
      const exists = prev.some((i) => i.id === integration.id);
      return exists
        ? prev.map((i) => (i.id === integration.id ? integration : i))
        : [...prev, integration];
    });
  }

  async function onDisconnect(id: string) {
    setPendingId(id);
    const previous = integrations;
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
    const result = await disconnectEsp(id);
    if (!result.ok) setIntegrations(previous);
    setPendingId(null);
  }

  async function onToggleSync(id: string, enabled: boolean) {
    setPendingId(id);
    const previous = integrations;
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, sync_enabled: enabled } : i)),
    );
    const result = await toggleEspSync(id, enabled);
    if (!result.ok) setIntegrations(previous);
    setPendingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Email</h1>
        <p className="mt-1 text-body text-text-secondary">
          Subscribers and email service sync.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <Card>
          <p className="text-label uppercase tracking-wide text-text-muted">Subscribers</p>
          <p className="mt-2 font-mono text-h3">{activeSubscribers.length}</p>
        </Card>
        <Card>
          <p className="text-label uppercase tracking-wide text-text-muted">Connected</p>
          <p className="mt-2 font-mono text-h3">{integrations.length}</p>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h3">Connected services</h2>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Connect
          </Button>
        </div>

        {integrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center">
            <Mail className="h-5 w-5 text-text-muted" />
            <p className="mt-2 text-small text-text-secondary">
              Not connected — subscribers still save here either way.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {integrations.map((integration) => (
              <Card key={integration.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-body text-text-primary">
                    {PROVIDER_LABELS[integration.provider]}
                  </p>
                  <p className="text-small text-text-muted">
                    {integration.list_id ? `List: ${integration.list_id}` : "No list set"}
                    {" · "}
                    {integration.sync_enabled ? "Syncing" : "Sync paused"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleSync(integration.id, !integration.sync_enabled)}
                    disabled={pendingId === integration.id}
                    aria-label={integration.sync_enabled ? "Pause sync" : "Resume sync"}
                    className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary disabled:opacity-50"
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDisconnect(integration.id)}
                    disabled={pendingId === integration.id}
                    aria-label="Disconnect"
                    className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-h3">Subscribers</h2>
        {initialSubscribers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <Users className="h-6 w-6 text-text-muted" />
            <p className="mt-3 text-body text-text-secondary">
              No subscribers yet — they&apos;ll show up here as your email
              capture block collects them.
            </p>
          </div>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-border text-label uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Subscribed</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {initialSubscribers.map((sub) => (
                  <tr key={sub.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text-primary">{sub.email}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {SOURCE_LABELS[sub.source ?? ""] ?? sub.source ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-small text-text-muted">
                      {formatDate(sub.subscribed_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          sub.unsubscribed_at
                            ? "text-small text-text-muted"
                            : "text-small text-success"
                        }
                      >
                        {sub.unsubscribed_at ? "Unsubscribed" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <ConnectEspModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={onConnected}
      />
    </div>
  );
}
