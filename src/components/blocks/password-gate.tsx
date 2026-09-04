"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// The block's password_hash never reaches the browser. Each attempt is
// checked by the verify_block_password RPC (migrations/0001), which compares
// against the hash inside the database and returns only a boolean.
export function PasswordGate({
  blockId,
  children,
}: {
  blockId: string;
  children: ReactNode;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value) return;
    setChecking(true);
    setError(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "verify_block_password",
      { block_id: blockId, attempt: value },
    );

    setChecking(false);
    if (rpcError) {
      setError("Couldn't check that right now. Try again.");
      return;
    }
    if (data === true) {
      setUnlocked(true);
    } else {
      setError("Wrong password.");
    }
  }

  if (unlocked) return <>{children}</>;

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
