import { createClient } from "@/lib/supabase/server";
import { requireCreator } from "@/lib/queries/dashboard";
import { EmailManager } from "@/components/email/email-manager";
import type { EmailSubscriber, EspIntegration } from "@/lib/types";

export default async function EmailPage() {
  // Shares the layout's already-loaded session (requireCreator is cached per
  // request) instead of verifying it a second time.
  const { userId } = await requireCreator();
  const supabase = await createClient();

  const [{ data: subscribers }, { data: integrations }] = await Promise.all([
    supabase
      .from("email_subscribers")
      .select("id, email, source, tags, subscribed_at, unsubscribed_at")
      .eq("creator_id", userId)
      .order("subscribed_at", { ascending: false }),
    supabase
      .from("esp_integrations")
      .select("id, provider, list_id, sync_enabled, connected_at")
      .eq("creator_id", userId)
      .order("connected_at", { ascending: false }),
  ]);

  return (
    <EmailManager
      initialSubscribers={(subscribers ?? []) as EmailSubscriber[]}
      initialIntegrations={(integrations ?? []) as EspIntegration[]}
    />
  );
}
