"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatPrice, formatDate } from "@/lib/format";
import { recordPayout } from "@/app/admin/payouts/actions";
import type { CreatorBalance, Payout } from "@/lib/queries/payouts";

export function PayoutManager({
  initialBalances,
  initialHistory,
}: {
  initialBalances: CreatorBalance[];
  initialHistory: Payout[];
}) {
  const [balances, setBalances] = useState(initialBalances);
  const [history, setHistory] = useState(initialHistory);
  const [target, setTarget] = useState<CreatorBalance | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("creatorId", target.creatorId);
    formData.set("currency", target.currency);
    const result = await recordPayout(formData);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setHistory((prev) => [result.payout, ...prev]);
    setBalances((prev) =>
      prev.map((b) =>
        b.creatorId === target.creatorId && b.currency === target.currency
          ? {
              ...b,
              paidOutCents: b.paidOutCents + result.payout.amountCents,
              balanceCents: b.balanceCents - result.payout.amountCents,
            }
          : b,
      ),
    );
    setTarget(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-3 text-h3">Balances</h2>
        {balances.length === 0 ? (
          <p className="text-body text-text-secondary">No paid orders yet.</p>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-border text-label uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Creator</th>
                  <th className="px-4 py-3 font-medium">Net owed</th>
                  <th className="px-4 py-3 font-medium">Paid out</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={`${b.creatorId}-${b.currency}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text-primary">
                      {b.displayName ?? b.username}
                      <span className="ml-1.5 text-small text-text-muted">@{b.username}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-text-secondary">
                      {formatPrice(b.netOwedCents, b.currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-text-secondary">
                      {formatPrice(b.paidOutCents, b.currency)}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-text-primary">
                      {formatPrice(b.balanceCents, b.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={b.balanceCents <= 0}
                        onClick={() => {
                          setTarget(b);
                          setError(null);
                        }}
                      >
                        Record payout
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-h3">History</h2>
        {history.length === 0 ? (
          <p className="text-body text-text-secondary">No payouts recorded yet.</p>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-border text-label uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-small text-text-muted">
                      {formatDate(p.paidAt ?? p.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-text-primary">
                      {formatPrice(p.amountCents, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{p.method ?? "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">{p.reference ?? "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">{p.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target ? `Record payout — ${target.displayName ?? target.username}` : undefined}
      >
        {target && (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field label="Amount" hint={`Balance owed: ${formatPrice(target.balanceCents, target.currency)}`}>
              {(p) => (
                <Input
                  {...p}
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={(target.balanceCents / 100).toFixed(2)}
                />
              )}
            </Field>

            <Field label="Method" hint="Free text — e.g. bank_transfer, wise, other">
              {(p) => <Input {...p} name="method" placeholder="bank_transfer" />}
            </Field>

            <Field label="Reference" hint="Bank transaction ID, or whatever you'll want to look this up by later">
              {(p) => <Input {...p} name="reference" />}
            </Field>

            <Field label="Notes" hint="Optional">
              {(p) => <Input {...p} name="notes" />}
            </Field>

            {error && (
              <p className="flex items-center gap-1.5 text-small text-danger">
                <AlertCircle className="h-3.5 w-3.5" />
                {error}
              </p>
            )}

            <p className="text-small text-text-muted">
              This only records that the payout happened — it doesn&apos;t send any money.
            </p>

            <Button type="submit" disabled={saving} className="mt-1 w-full">
              {saving ? "Saving…" : "Record"}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
