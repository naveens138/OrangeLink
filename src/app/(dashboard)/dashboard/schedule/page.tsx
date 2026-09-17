import { requireCreator } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";
import { ScheduleManager, type LinkOption } from "@/components/schedule/schedule-manager";
import type { ScheduledPost } from "./actions";
import type { Accounts } from "@/components/schedule/social-accounts";
import { isPlatform } from "@/lib/schedule/platforms";

export default async function SchedulePage() {
  const { creator, products, userId } = await requireCreator();
  const supabase = await createClient();

  const sinceDate = new Date();
  sinceDate.setTime(sinceDate.getTime() - 60 * 24 * 60 * 60 * 1000);
  const since = sinceDate.toISOString();
  const [{ data: posts }, { data: domain }, { data: accountRows }] = await Promise.all([
    supabase
      .from("scheduled_posts")
      .select("id, platforms, caption, link_url, scheduled_for, status, posted_at")
      .eq("creator_id", userId)
      .gte("scheduled_for", since)
      .order("scheduled_for", { ascending: true })
      .limit(500),
    supabase
      .from("custom_domains")
      .select("domain, verification_status")
      .eq("creator_id", userId)
      .maybeSingle(),
    supabase.from("social_accounts").select("platform, handle").eq("creator_id", userId),
  ]);

  const accounts: Accounts = {};
  for (const row of accountRows ?? []) {
    if (isPlatform(row.platform)) accounts[row.platform] = row.handle;
  }

  // Links point at the creator's own domain once it's live, else their
  // OrangeLink address.
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const pageUrl =
    domain?.verification_status === "verified" ? `https://${domain.domain}` : `${site}/${creator.username}`;
  const productBase =
    domain?.verification_status === "verified" ? `https://${domain.domain}/p` : `${site}/${creator.username}/p`;

  const linkOptions: LinkOption[] = [
    { label: "Your page", url: pageUrl },
    ...products
      .filter((p) => p.is_published)
      .map((p) => ({ label: p.name, url: `${productBase}/${p.id}` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Schedule</h1>
        <p className="mt-1 max-w-2xl text-body text-text-secondary">
          Plan posts for every platform in one place. When it&apos;s time, one click copies
          your caption and opens the app.
        </p>
      </div>
      <ScheduleManager
        initialPosts={(posts ?? []) as ScheduledPost[]}
        initialAccounts={accounts}
        linkOptions={linkOptions}
      />
    </div>
  );
}
