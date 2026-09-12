"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  checkDomain,
  connectDomain,
  disconnectDomain,
  type DomainActionResult,
  type DomainStatus,
} from "@/app/(dashboard)/dashboard/domains/actions";

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked; the value is on screen to copy by hand.
        }
      }}
      aria-label={`Copy ${value}`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/**
 * Connect, check and remove the creator's custom domain. The server does
 * the real work (Vercel + database); this shows where things stand and the
 * exact DNS records to add.
 */
export function DomainManager({
  initial,
  fallbackUrl,
}: {
  initial: DomainStatus | null;
  /** The page's always-working OrangeLink address. */
  fallbackUrl: string;
}) {
  const [status, setStatus] = useState<DomainStatus | null>(initial);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<DomainActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setStatus(result.status);
        setCheckedAt(new Date());
      } else {
        setError(result.error);
      }
    });
  }

  if (!status) {
    return (
      <div className="flex max-w-xl flex-col gap-3 rounded-md border border-border bg-surface-1 p-4">
        <p className="text-h3">Connect your domain</p>
        <p className="text-small text-text-secondary">
          Use a domain you own, like <code>yourname.com</code> or <code>shop.yourname.com</code>.
          Your page stays at {fallbackUrl} too.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => connectDomain(input));
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="shop.yourname.com"
            aria-label="Your domain"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button type="submit" disabled={pending || input.trim().length < 4}>
            {pending ? "Connecting…" : "Connect"}
          </Button>
        </form>
        {error && <p className="text-small text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="rounded-md border border-border bg-surface-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-body text-text-primary">{status.domain}</p>
          <span
            className={
              status.live
                ? "rounded-full bg-success/15 px-2.5 py-0.5 text-[12px] font-medium text-success"
                : "rounded-full bg-warning/15 px-2.5 py-0.5 text-[12px] font-medium text-warning"
            }
          >
            {status.live ? "Live" : "Waiting for DNS"}
          </span>
        </div>
        {status.live ? (
          <p className="mt-2 text-small text-text-secondary">
            Your page is live at{" "}
            <a
              href={`https://${status.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-text-primary underline underline-offset-2"
            >
              {status.domain}
              <ExternalLink className="h-3 w-3" />
            </a>
            , with HTTPS.
          </p>
        ) : (
          <p className="mt-2 text-small text-text-secondary">
            Add the {status.records.length === 1 ? "record" : "records"} below in your domain&apos;s
            DNS settings (step 03 in the guide below shows where). Changes usually show up within
            a few minutes, occasionally a few hours.
          </p>
        )}
      </div>

      {!status.live && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-small">
            <thead>
              <tr className="border-b border-border font-mono text-label uppercase tracking-[0.1em] text-text-muted">
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {status.records.map((r) => (
                <tr key={`${r.type}-${r.name}`} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-text-primary">{r.type}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1 font-mono text-text-primary">
                      {r.name}
                      <CopyValue value={r.name} />
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1 break-all font-mono text-text-primary">
                      {r.value}
                      <CopyValue value={r.value} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!status.live && (
          <Button type="button" size="sm" onClick={() => run(checkDomain)} disabled={pending}>
            <RefreshCw className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            {pending ? "Checking…" : "Check again"}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Disconnect ${status.domain}? Your page stays at ${fallbackUrl}.`)) {
              run(disconnectDomain);
            }
          }}
        >
          Remove domain
        </Button>
        {checkedAt && !status.live && !pending && (
          <span className="text-[12px] text-text-muted">
            Checked {checkedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Not
            live yet.
          </span>
        )}
      </div>
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  );
}
