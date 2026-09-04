"use server";

import { createClient } from "@/lib/supabase/server";
import type { TrackingPixel, TrackingPixelProvider } from "@/lib/types";

const PIXEL_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const VALID_PROVIDERS: TrackingPixelProvider[] = ["meta_pixel", "ga4", "tiktok_pixel"];

export type AddPixelResult =
  | { ok: true; pixel: TrackingPixel }
  | { ok: false; error: string };

/**
 * Pixel ids are public by nature (they're meant to sit in the page's own
 * source, unlike an ESP API key) — no Vault needed here, unlike
 * esp_integrations. Still validated to a safe charset before it's ever
 * interpolated into an inline <script> on the public page
 * (components/public/tracking-pixels.tsx).
 */
export async function addPixel(formData: FormData): Promise<AddPixelResult> {
  const provider = String(formData.get("provider") ?? "");
  const pixelId = String(formData.get("pixelId") ?? "").trim();

  if (!VALID_PROVIDERS.includes(provider as TrackingPixelProvider)) {
    return { ok: false, error: "Choose a provider." };
  }
  if (!PIXEL_ID_RE.test(pixelId)) {
    return {
      ok: false,
      error: "Pixel/measurement ID can only contain letters, numbers, - and _.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Upsert on (creator_id, provider) — reconnecting the same provider
  // updates the id in place rather than erroring on the unique constraint.
  const { data, error } = await supabase
    .from("tracking_pixels")
    .upsert(
      { creator_id: user.id, provider, pixel_id: pixelId },
      { onConflict: "creator_id,provider" },
    )
    .select("id, provider, pixel_id, created_at")
    .single();

  if (error || !data) {
    return { ok: false, error: "Couldn't save this pixel — try again." };
  }
  return { ok: true, pixel: data as TrackingPixel };
}

export async function removePixel(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("tracking_pixels").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't remove this pixel." };
  return { ok: true };
}
