"use client";

import { captureEmail } from "@/lib/email/capture";
import type { Block } from "@/lib/types";
import { EmailCaptureForm } from "./email-capture-form";

export function EmailCaptureBlock({
  block,
  username,
}: {
  block: Block;
  username: string;
}) {
  const config = block.config as { headline?: string; cta_text?: string };

  return (
    <EmailCaptureForm
      headline={config.headline ?? "Join the list"}
      ctaText={config.cta_text ?? "Subscribe"}
      onSubmit={(email) => captureEmail(username, email, "page_capture")}
    />
  );
}
