import { requireCreator } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";
import { getDomainState, isDomainsConfigured } from "@/lib/vercel/domains";
import { DomainManager } from "@/components/dashboard/domain-manager";
import { DomainGuide } from "@/components/dashboard/domain-guide";
import type { DomainStatus } from "./actions";

export default async function DomainsPage() {
  const { creator, userId } = await requireCreator();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const fallbackUrl = `${site.replace(/^https?:\/\//, "") || "OrangeLink"}/${creator.username}`;

  const header = (
    <div>
      <h1 className="text-h2">Domains</h1>
      <p className="mt-1 max-w-2xl text-body text-text-secondary">
        Put your page on your own domain, with HTTPS set up for you.
      </p>
    </div>
  );

  if (!isDomainsConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p className="max-w-xl rounded-md border border-border bg-surface-1 p-4 text-small text-text-secondary">
          Custom domains aren&apos;t switched on for this site yet. Your page is at {fallbackUrl}.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("custom_domains")
    .select("domain, verification_status")
    .eq("creator_id", userId)
    .maybeSingle();

  let initial: DomainStatus | null = null;
  if (row) {
    // Live domains only need their record; pending ones get fresh DNS
    // instructions from Vercel so the creator sees exactly what to add.
    if (row.verification_status === "verified") {
      initial = { domain: row.domain, live: true, verified: true, configured: true, records: [] };
    } else {
      const state = await getDomainState(row.domain).catch(() => null);
      initial = state
        ? { domain: row.domain, live: false, ...state }
        : { domain: row.domain, live: false, verified: false, configured: false, records: [] };
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      {/* The domain itself first; the how-to sits underneath for reference. */}
      <DomainManager initial={initial} fallbackUrl={fallbackUrl} />
      <DomainGuide open={!initial?.live} />
    </div>
  );
}
