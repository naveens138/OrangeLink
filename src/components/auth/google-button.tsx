"use client";

import { useState } from "react";
import { SocialButton } from "./social-button";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M19.6 10.23c0-.68-.06-1.32-.17-1.95H10v3.69h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.99-4.32 2.99-7.26Z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 4.96-.9 6.61-2.44l-3.23-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H1.06v2.59A10 10 0 0 0 10 20Z"
      />
      <path
        fill="#FBBC05"
        d="M4.41 11.91A6 6 0 0 1 4.09 10c0-.66.11-1.3.32-1.91V5.5H1.06a10 10 0 0 0 0 9l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.96 9.96 0 0 0 10 0 10 10 0 0 0 1.06 5.5l3.35 2.59C5.2 5.73 7.4 3.98 10 3.98Z"
      />
    </svg>
  );
}

export function GoogleButton({
  next,
  className,
}: {
  next?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });

    // On success the browser navigates away, so reaching here means it failed
    // — most often because the Google provider isn't enabled in Supabase yet.
    if (oauthError) {
      setError(oauthError.message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <SocialButton
        icon={<GoogleIcon />}
        onClick={signInWithGoogle}
        disabled={pending}
        className={className}
      >
        {pending ? "Redirecting…" : "Continue with Google"}
      </SocialButton>
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  );
}
