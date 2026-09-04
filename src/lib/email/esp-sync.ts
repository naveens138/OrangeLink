import "server-only";

export type EspProvider = "convertkit" | "beehiiv" | "mailerlite";

export interface EspSyncInput {
  provider: EspProvider;
  apiKey: string;
  listId: string | null;
  email: string;
}

export interface EspSyncResult {
  ok: boolean;
  error?: string;
}

/**
 * Adds a subscriber to the creator's connected ESP. Each provider's shape
 * comes from its current docs (fetched directly, not recalled from
 * training data — ESP APIs move; ConvertKit in particular rebranded to
 * "Kit" and moved to a v4 API with a different auth header):
 *
 *   - Kit (ConvertKit) v4: POST https://api.kit.com/v4/subscribers,
 *     header X-Kit-Api-Key, body { email_address }. Upserts by email.
 *   - Beehiiv v2: POST /publications/{publicationId}/subscriptions,
 *     Bearer auth. `listId` here is the publication id.
 *   - MailerLite: POST https://connect.mailerlite.com/api/subscribers,
 *     Bearer auth, optional `groups: [id]` — `listId` here is a group id.
 */
export async function syncSubscriberToEsp(input: EspSyncInput): Promise<EspSyncResult> {
  switch (input.provider) {
    case "convertkit":
      return syncConvertKit(input);
    case "beehiiv":
      return syncBeehiiv(input);
    case "mailerlite":
      return syncMailerLite(input);
    default:
      return { ok: false, error: `Unknown ESP provider: ${input.provider}` };
  }
}

async function describeFailure(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  return `${res.status} ${body.slice(0, 200)}`;
}

async function syncConvertKit({ apiKey, email }: EspSyncInput): Promise<EspSyncResult> {
  const res = await fetch("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers: { "X-Kit-Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email_address: email }),
  });
  if (!res.ok) return { ok: false, error: `Kit: ${await describeFailure(res)}` };
  return { ok: true };
}

async function syncBeehiiv({ apiKey, listId, email }: EspSyncInput): Promise<EspSyncResult> {
  if (!listId) {
    return { ok: false, error: "Beehiiv needs a publication id, saved as this connection's list ID." };
  }
  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${encodeURIComponent(listId)}/subscriptions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    },
  );
  if (!res.ok) return { ok: false, error: `Beehiiv: ${await describeFailure(res)}` };
  return { ok: true };
}

async function syncMailerLite({ apiKey, listId, email }: EspSyncInput): Promise<EspSyncResult> {
  const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, ...(listId ? { groups: [listId] } : {}) }),
  });
  if (!res.ok) return { ok: false, error: `MailerLite: ${await describeFailure(res)}` };
  return { ok: true };
}
