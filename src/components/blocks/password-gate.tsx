"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { unlockBlock } from "@/app/(public)/[username]/actions";
import type { UnlockedBlock } from "@/lib/types";

// Neither the block's content nor its password_hash is in the page. Each
// attempt goes to the unlockBlock server action, which checks it with the
// verify_block_password RPC (migrations/0001) inside the database and only
// then returns the block, which `children` renders.
export function PasswordGate({
  blockId,
  username,
  children,
}: {
  blockId: string;
  username: string;
  children: (unlocked: UnlockedBlock) => ReactNode;
}) {
  const [unlocked, setUnlocked] = useState<UnlockedBlock | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value) return;
    setChecking(true);
    setError(null);

    try {
      const result = await unlockBlock(username, blockId, value);
      if (result.ok) {
        setUnlocked({ block: result.block, products: result.products });
      } else if (result.reason === "wrong_password") {
        setError("Wrong password.");
      } else if (result.reason === "too_many_attempts") {
        setError("Too many tries. Wait a few minutes and try again.");
      } else {
        setError("Couldn't check that right now. Try again.");
      }
    } catch {
      setError("Couldn't check that right now. Try again.");
    } finally {
      setChecking(false);
    }
  }

  if (unlocked) return <>{children(unlocked)}</>;

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-lg border border-current/15 p-5"
    >
      <div className="flex items-center gap-2 text-body">
        <Lock className="h-4 w-4" />
        This is locked
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="Enter password"
          className="h-11 flex-1 rounded-md border border-current/15 bg-transparent px-3 text-body placeholder:opacity-50 focus:outline-none focus:border-current/40"
        />
        <button
          type="submit"
          disabled={checking}
          className="rounded-pill bg-accent px-5 text-body font-medium text-white disabled:opacity-50"
        >
          {checking ? "Checking…" : "Unlock"}
        </button>
      </div>
      {error && <p className="text-small text-danger">{error}</p>}
    </form>
  );
}
