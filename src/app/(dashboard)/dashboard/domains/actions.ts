"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  addDomain,
  getDomainState,
  isDomainsConfigured,
  removeDomain,
  type DnsRecord,
} from "@/lib/vercel/domains";

export type DomainStatus = {
  domain: string;
  live: boolean;
  verified: boolean;
  configured: boolean;
  records: DnsRecord[];
};

export type DomainActionResult = { ok: true; status: DomainStatus | null } | { ok: false; error: string };

const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** "https://Shop.MySite.com/about" → "shop.mysite.com", or null if it isn't a hostname. */
function normalizeDomain(input: string): string | null {
  let host = input.trim().toLowerCase();
  host = host.replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0].split(":")[0].replace(/\.$/, "");
  if (!HOSTNAME_RE.test(host) || host.length > 253) return null;
  return host;
}

// Hosts that already belong to the platform can't be claimed as a
// creator's custom domain.
function isPlatformHost(host: string): boolean {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const siteHost = site ? new URL(site).hostname : null;
  return (
    host.endsWith(".vercel.app") ||
    host === "localhost" ||
    (siteHost !== null && (host === siteHost || host.endsWith(`.${siteHost}`)))
  );
}

async function currentCreator() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("creator_id", auth.user.id)
    .eq("is_primary", true)
    .maybeSingle();
  return page ? { userId: auth.user.id, pageId: page.id as string } : null;
}

/** Asks Vercel where the domain stands and records whether it's live. */
async function syncStatus(creatorId: string, domain: string): Promise<DomainStatus> {
  const state = await getDomainState(domain);
  const live = state.verified && state.configured;
  const admin = createServiceRoleClient();
  await admin
    .from("custom_domains")
    .update({
      verification_status: live ? "verified" : "pending",
      ssl_status: live ? "active" : "pending",
      verified_at: live ? new Date().toISOString() : null,
    })
    .eq("creator_id", creatorId)
    .eq("domain", domain);
  return { domain, live, ...state };
}

export async function connectDomain(input: string): Promise<DomainActionResult> {
  if (!isDomainsConfigured()) return { ok: false, error: "Custom domains aren't available yet." };
  const creator = await currentCreator();
  if (!creator) return { ok: false, error: "Sign in again to connect a domain." };

  const domain = normalizeDomain(input);
  if (!domain) return { ok: false, error: "Enter a domain like shop.yourname.com." };
  if (isPlatformHost(domain)) return { ok: false, error: "That address already belongs to OrangeLink." };

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("custom_domains")
    .select("domain, creator_id")
    .or(`creator_id.eq.${creator.userId},domain.eq.${domain}`);
  if (existing?.some((row) => row.creator_id === creator.userId)) {
    return { ok: false, error: "Remove your current domain before adding another." };
  }
  if (existing?.length) return { ok: false, error: "That domain is already connected to another page." };

  const added = await addDomain(domain);
  if (!added.ok) return added;

  const { error } = await admin.from("custom_domains").insert({
    creator_id: creator.userId,
    page_id: creator.pageId,
    domain,
  });
  if (error) {
    // Keep Vercel and the database in step if the save fails.
    await removeDomain(domain).catch(() => {});
    return { ok: false, error: "Couldn't save the domain. Try again." };
  }

  const status = await syncStatus(creator.userId, domain);
  revalidatePath("/dashboard/domains");
  return { ok: true, status };
}

export async function checkDomain(): Promise<DomainActionResult> {
  if (!isDomainsConfigured()) return { ok: false, error: "Custom domains aren't available yet." };
  const creator = await currentCreator();
  if (!creator) return { ok: false, error: "Sign in again to check your domain." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("custom_domains")
    .select("domain")
    .eq("creator_id", creator.userId)
    .maybeSingle();
  if (!row) return { ok: true, status: null };

  const status = await syncStatus(creator.userId, row.domain);
  revalidatePath("/dashboard/domains");
  return { ok: true, status };
}

export async function disconnectDomain(): Promise<DomainActionResult> {
  const creator = await currentCreator();
  if (!creator) return { ok: false, error: "Sign in again to remove your domain." };

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("custom_domains")
    .select("domain")
    .eq("creator_id", creator.userId)
    .maybeSingle();
  if (!row) return { ok: true, status: null };

  if (isDomainsConfigured()) {
    try {
      await removeDomain(row.domain);
    } catch {
      return { ok: false, error: "Couldn't remove the domain right now. Try again." };
    }
  }
  await admin.from("custom_domains").delete().eq("creator_id", creator.userId);
  revalidatePath("/dashboard/domains");
  return { ok: true, status: null };
}
