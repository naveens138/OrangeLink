"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { syncSubscriberToEsp, type EspProvider } from "./esp-sync";

export type CaptureEmailResult = { ok: true } | { ok: false; error: string };

/**
 * Captures an email from a public page visitor. Runs with the service role
 * — the same public-write pattern as checkout — because the visitor is
 * never authenticated. `source` distinguishes where the address came from
 * (matches schema.sql's email_subscribers.source comment): 'page_capture'
 * for the block, with 'checkout' / 'comment_dm' / 'import' reserved for
 * their own milestones.
 */
export async function captureEmail(
  username: string,
  email: string,
  source: string,
): Promise<CaptureEmailResult> {
  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = createServiceRoleClient();
  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!creator) {
    return { ok: false, error: "This page isn't available." };
  }

  // A returning subscriber who'd unsubscribed and signs up again should end
  // up resubscribed, not silently ignored — hence unsubscribed_at: null on
  // conflict rather than a plain do-nothing upsert.
  const { error } = await supabase.from("email_subscribers").upsert(
    { creator_id: creator.id, email, source, unsubscribed_at: null },
    { onConflict: "creator_id,email" },
  );
  if (error) {
    return { ok: false, error: "Couldn't save your email — try again." };
  }

  await syncToConnectedEsp(supabase, creator.id, email);

  return { ok: true };
}

/**
 * Best-effort — the subscriber's own capture already succeeded by the time
 * this runs, and whether it also reaches the creator's ESP is a secondary
 * concern that must never surface as a failure to the visitor.
 */
async function syncToConnectedEsp(
  supabase: ReturnType<typeof createServiceRoleClient>,
  creatorId: string,
  email: string,
): Promise<void> {
  const { data: integration } = await supabase
    .from("esp_integrations")
    .select("id, provider, list_id")
    .eq("creator_id", creatorId)
    .eq("sync_enabled", true)
    .maybeSingle();
  if (!integration) return;

  const { data: apiKey } = await supabase.rpc("get_esp_api_key", {
    p_integration_id: integration.id,
  });
  if (!apiKey) return;

  const result = await syncSubscriberToEsp({
    provider: integration.provider as EspProvider,
    apiKey,
    listId: integration.list_id,
    email,
  });
  if (!result.ok) {
    console.warn(
      `[email capture] ESP sync failed for creator ${creatorId} (${integration.provider}):`,
      result.error,
    );
  }
}
