"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PLATFORM_ICONS } from "@/components/brand/platform-icons";
import { PLATFORM_META, PLATFORMS, PROFILE_URL, type Platform } from "@/lib/schedule/platforms";
import { removeSocialAccount, saveSocialAccount } from "@/app/(dashboard)/dashboard/schedule/actions";
import { cn } from "@/lib/utils";

export type Accounts = Partial<Record<Platform, string>>;

/**
 * The creator's handle on each platform. Added accounts are pre-selected on
 * new posts, named on the Post now buttons, and one click from their
 * profile. Handles only: nothing here logs in to the platform.
 */
export function SocialAccounts({
  accounts,
  onChange,
}: {
  accounts: Accounts;
  onChange: (platform: Platform, handle: string | null) => void;
}) {
  const [adding, setAdding] = useState<Platform | null>(null);
  const added = PLATFORMS.filter((p) => accounts[p]);

  return (
    <div className="rounded-md border border-border bg-surface-1 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-h3">Your accounts</p>
        <p className="text-[12px] text-text-muted">
          {added.length === 0
            ? "Add the accounts you post to."
            : `${added.length} of ${PLATFORMS.length} added`}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PLATFORMS.map((p) => {
          const Icon = PLATFORM_ICONS[p];
          const handle = accounts[p];
          return handle ? (
            <span
              key={p}
              className="flex items-center gap-1.5 rounded-full border border-border-strong bg-background py-1 pl-2.5 pr-1 text-small text-text-primary"
            >
              <Icon className="h-3.5 w-3.5" />
              <a
                href={PROFILE_URL[p](handle)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
                title={`Open your ${PLATFORM_META[p].label} profile`}
              >
                @{handle}
                <ExternalLink className="h-3 w-3 text-text-muted" />
              </a>
              <button
                type="button"
                onClick={() => setAdding(p)}
                className="rounded-full px-1.5 text-[12px] text-text-muted hover:bg-surface-2 hover:text-text-primary"
              >
                Edit
              </button>
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => setAdding(p)}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-border-strong px-3 py-1 text-small text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
            >
              <Icon className="h-3.5 w-3.5" />
              {PLATFORM_META[p].label}
              <Plus className="h-3 w-3" />
            </button>
          );
        })}
      </div>

      {adding && (
        <AccountEditor
          key={adding}
          platform={adding}
          current={accounts[adding] ?? null}
          onClose={() => setAdding(null)}
          onSaved={(handle) => {
            onChange(adding, handle);
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}

function AccountEditor({
  platform,
  current,
  onClose,
  onSaved,
}: {
  platform: Platform;
  current: string | null;
  onClose: () => void;
  onSaved: (handle: string | null) => void;
}) {
  const [value, setValue] = useState(current ? `@${current}` : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const label = PLATFORM_META[platform].label;
  const Icon = PLATFORM_ICONS[platform];

  function run(action: () => ReturnType<typeof saveSocialAccount>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSaved(result.handle);
      else setError(result.error);
    });
  }

  return (
    <Modal open onClose={onClose} title={`Your ${label} account`} maxWidthClassName="max-w-[420px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveSocialAccount(platform, value));
        }}
        className="flex flex-col gap-3"
      >
        <label className="flex items-center gap-2 rounded-md border border-border bg-background pl-3 focus-within:border-border-strong">
          <Icon className="h-4 w-4 shrink-0 text-text-secondary" />
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="@yourname or your profile link"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="border-0 px-0 focus:ring-0"
          />
        </label>
        <p className="text-[12px] text-text-muted">
          Just your username. OrangeLink never asks for your {label} password.
        </p>
        {error && <p className="text-small text-danger">{error}</p>}
        <div className={cn("flex items-center gap-2", current ? "justify-between" : "justify-end")}>
          {current && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => removeSocialAccount(platform))}
              className="text-danger hover:bg-danger/10 hover:text-danger"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
          <Button type="submit" size="sm" disabled={pending || value.trim().length === 0}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
