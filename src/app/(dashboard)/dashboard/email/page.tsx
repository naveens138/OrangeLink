import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmailManager } from "@/components/email/email-manager";
import type { EmailSubscriber, EspIntegration } from "@/lib/types";

export default async function EmailPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: subscribers }, { data: integrations }] = await Promise.all([
    supabase
      .from("email_subscribers")
      .select("id, email, source, tags, subscribed_at, unsubscribed_at")
      .eq("creator_id", user.id)
      .order("subscribed_at", { ascending: false }),
    supabase
      .from("esp_integrations")
      .select("id, provider, list_id, sync_enabled, connected_at")
      .eq("creator_id", user.id)
      .order("connected_at", { ascending: false }),
  ]);

  return (
    <EmailManager
      initialSubscribers={(subscribers ?? []) as EmailSubscriber[]}
      initialIntegrations={(integrations ?? []) as EspIntegration[]}
    />
  );
}
