import "server-only";

/**
 * Registers creators' custom domains on this Vercel project, so Vercel will
 * route the domain to the app and issue it an HTTPS certificate.
 *
 * Needs VERCEL_API_TOKEN (a Vercel access token with access to the project),
 * VERCEL_PROJECT_ID and, for team-owned projects, VERCEL_TEAM_ID. Without
 * them the dashboard says custom domains aren't available yet rather than
 * failing on submit.
 *
 * Endpoints: https://vercel.com/docs/rest-api (projects/domains).
 */

const API = "https://api.vercel.com";

export function isDomainsConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

function url(path: string): string {
  const team = process.env.VERCEL_TEAM_ID;
  return `${API}${path}${team ? `${path.includes("?") ? "&" : "?"}teamId=${team}` : ""}`;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const response = await fetch(url(path), {
    method,
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, data };
}

export interface DnsRecord {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
}

export interface DomainState {
  /** Vercel accepts the domain for this project (ownership proven). */
  verified: boolean;
  /** DNS points at Vercel and a certificate can be issued. */
  configured: boolean;
  /** What the creator must add at their DNS provider. */
  records: DnsRecord[];
}

type VercelError = { error?: { code?: string; message?: string } };

type ProjectDomain = VercelError & {
  name?: string;
  apexName?: string;
  verified?: boolean;
  verification?: { type: string; domain: string; value: string; reason: string }[];
};

type DomainConfig = VercelError & {
  misconfigured?: boolean;
  recommendedIPv4?: { rank: number; value: string[] }[];
  recommendedCNAME?: { rank: number; value: string }[];
};

const project = () => encodeURIComponent(process.env.VERCEL_PROJECT_ID ?? "");

/** Adds the domain to the project. Safe to call again for a domain already added. */
export async function addDomain(domain: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { status, data } = await call<ProjectDomain>("POST", `/v10/projects/${project()}/domains`, {
    name: domain,
  });
  if (status === 200) return { ok: true };
  // Already on this project: carry on to status checks.
  if (status === 400 && /already/i.test(data.error?.message ?? "")) return { ok: true };
  if (status === 409) {
    return { ok: false, error: "That domain is already connected to another site. Remove it there first." };
  }
  if (status === 403) {
    return { ok: false, error: "That domain can't be added. Check the spelling, or that you own it." };
  }
  if (status === 400) return { ok: false, error: "That doesn't look like a domain Vercel will accept." };
  console.error("[domains] add failed", status, data.error);
  return { ok: false, error: "Couldn't connect the domain right now. Try again shortly." };
}

export async function removeDomain(domain: string): Promise<void> {
  const { status, data } = await call<VercelError>(
    "DELETE",
    `/v9/projects/${project()}/domains/${encodeURIComponent(domain)}`,
  );
  // 404: already gone, which is what we wanted.
  if (status >= 400 && status !== 404) {
    console.error("[domains] remove failed", status, data.error);
    throw new Error("Couldn't remove the domain from Vercel.");
  }
}

/**
 * Where the domain stands, and the DNS records still needed. Also nudges
 * Vercel to re-check ownership when it's still pending.
 */
export async function getDomainState(domain: string): Promise<DomainState> {
  const name = encodeURIComponent(domain);
  let { data: info } = await call<ProjectDomain>("GET", `/v9/projects/${project()}/domains/${name}`);

  if (info.verified === false) {
    const verify = await call<ProjectDomain>("POST", `/v9/projects/${project()}/domains/${name}/verify`);
    if (verify.status === 200) info = verify.data;
  }

  const { data: config } = await call<DomainConfig>(
    "GET",
    `/v6/domains/${name}/config?projectIdOrName=${project()}`,
  );

  const apex = info.apexName ?? domain;
  const isApex = domain === apex;
  const records: DnsRecord[] = [];

  if (isApex) {
    const ip = config.recommendedIPv4?.find((r) => r.rank === 1)?.value?.[0] ?? "76.76.21.21";
    records.push({ type: "A", name: "@", value: ip });
  } else {
    const target = config.recommendedCNAME?.find((r) => r.rank === 1)?.value ?? "cname.vercel-dns.com";
    records.push({ type: "CNAME", name: domain.slice(0, -(apex.length + 1)), value: target.replace(/\.$/, "") });
  }

  // Only present when the domain is also claimed elsewhere on Vercel and
  // ownership has to be proven with a TXT record first.
  for (const v of info.verification ?? []) {
    if (v.type === "TXT") {
      const host = v.domain.endsWith(`.${apex}`) ? v.domain.slice(0, -(apex.length + 1)) : v.domain;
      records.push({ type: "TXT", name: host, value: v.value });
    }
  }

  return {
    verified: info.verified === true,
    configured: config.misconfigured === false,
    records,
  };
}
