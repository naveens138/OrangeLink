"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EspIntegration } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export type EspActionResult = { ok: true } | { ok: false; error: string };
export type ConnectEspResult =
  | { ok: true; integration: EspIntegration }
  | { ok: false; error: string };

const VALID_PROVIDERS = ["convertkit", "beehiiv", "mailerlite"] as const;
const INTEGRATION_COLUMNS = "id, provider, list_id, sync_enabled, connected_at";

/**
 * Connects (or reconnects) an ESP. The key itself never touches this
 * function's return value or gets stored in `esp_integrations` directly —
 * `store_esp_secret`/`update_esp_secret` (migrations/0004, tightened in
 * 0005) put it in Supabase Vault and hand back only a reference id.
 *
 * Returns the row rather than a bare `{ok:true}` so the caller can update
 * local state directly (the ProductsManager pattern) instead of calling
 * router.refresh() — a whole-tree refresh landing while the connect modal's
 * close animation is mid-flight was observed to leave Framer Motion's exit
 * tracking permanently stuck (the modal never actually closes). Returning
 * data and updating state locally sidesteps the race entirely.
 */
export async function connectEsp(formData: FormData): Promise<ConnectEspResult> {
  const { supabase, user } = await requireUser();

  const provider = String(formData.get("provider") ?? "");
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const listId = String(formData.get("listId") ?? "").trim() || null;

  if (!VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number])) {
    return { ok: false, error: "Choose a provider." };
  }
  if (!apiKey) {
    return { ok: false, error: "An API key is required." };
  }

  const { data: existing } = await supabase
    .from("esp_integrations")
    .select("id, api_key_secret_id")
    .eq("creator_id", user.id)
    .eq("provider", provider)
    .maybeSingle();

  let integration: EspIntegration | null = null;

  if (existing) {
    const { error: updateErr } = await supabase.rpc("update_esp_secret", {
      p_secret_id: existing.api_key_secret_id,
      new_secret: apiKey,
    });
    if (updateErr) return { ok: false, error: updateErr.message };

    const { data, error } = await supabase
      .from("esp_integrations")
      .update({ list_id: listId, sync_enabled: true })
      .eq("id", existing.id)
      .select(INTEGRATION_COLUMNS)
      .single();
    if (error) return { ok: false, error: error.message };
    integration = data as EspIntegration;
  } else {
    const { data: secretId, error: secretErr } = await supabase.rpc("store_esp_secret", {
      new_secret: apiKey,
    });
    if (secretErr || !secretId) {
      return { ok: false, error: secretErr?.message ?? "Couldn't store the API key." };
    }

    const { data, error } = await supabase
      .from("esp_integrations")
      .insert({
        creator_id: user.id,
        provider,
        api_key_secret_id: secretId,
        list_id: listId,
      })
      .select(INTEGRATION_COLUMNS)
      .single();
    if (error) return { ok: false, error: error.message };
    integration = data as EspIntegration;
  }

  revalidatePath("/dashboard/email");
  return { ok: true, integration };
}

export async function disconnectEsp(integrationId: string): Promise<EspActionResult> {
  const { supabase, user } = await requireUser();

  const { data: integration } = await supabase
    .from("esp_integrations")
    .select("api_key_secret_id")
    .eq("id", integrationId)
    .eq("creator_id", user.id)
    .maybeSingle();

  // delete_esp_secret's ownership check reads esp_integrations, so it has to
  // run before that row is gone — reversing this order would make every
  // call fail "not authorized" against a row that no longer exists.
  if (integration?.api_key_secret_id) {
    const { error: secretErr } = await supabase.rpc("delete_esp_secret", {
      p_secret_id: integration.api_key_secret_id,
    });
    if (secretErr) {
      // Tidiness, not security — nothing references an orphaned vault
      // secret once the integration row below is gone — so this is logged,
      // not surfaced as a failed disconnect.
      console.warn(`[esp disconnect] secret cleanup failed:`, secretErr.message);
    }
  }

  const { error } = await supabase
    .from("esp_integrations")
    .delete()
    .eq("id", integrationId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/email");
  return { ok: true };
}

export async function toggleEspSync(
  integrationId: string,
  enabled: boolean,
): Promise<EspActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("esp_integrations")
    .update({ sync_enabled: enabled })
    .eq("id", integrationId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/email");
  return { ok: true };
}
