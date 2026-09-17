"use client";

import { EmailCaptureForm, type EmailCaptureResult } from "@/components/blocks/email-capture-form";

async function joinWaitlist(email: string): Promise<EmailCaptureResult> {
  try {
    const res = await fetch("/api/creator-program/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return res.ok && data.ok ? { ok: true } : { ok: false, error: data.error ?? "Something went wrong." };
  } catch {
    return { ok: false, error: "Couldn't reach OrangeLink. Check your connection." };
  }
}

export function WaitlistCapture() {
  return (
    <EmailCaptureForm
      headline="Hear first when the next round opens"
      ctaText="Join waitlist"
      doneText="You're on the waitlist. We'll let you know."
      onSubmit={joinWaitlist}
    />
  );
}
