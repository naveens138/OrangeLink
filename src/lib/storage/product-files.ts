import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

const BUCKET = "product-files";

/** Storage path convention: creator/product/filename — keeps a creator's files
 * grouped and avoids collisions between products with the same file name. */
export function buildStoragePath(
  creatorId: string,
  productId: string,
  fileName: string,
) {
  const safeName = fileName.replace(/[^\w.\-]/g, "_").slice(-180);
  return `${creatorId}/${productId}/${Date.now()}-${safeName}`;
}

export async function uploadProductFile(
  path: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteProductFile(path: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

/**
 * Short-lived signed URL for a purchased file — called only from the
 * post-payment webhook, never at product-listing time. Per BUILD_BRIEF.md
 * §5, a paid product's raw storage path must never be exposed; this is the
 * only sanctioned way a buyer gets a working link.
 */
export async function createSignedDownloadUrl(
  path: string,
  expiresInSeconds = 60 * 60 * 48, // 48h — long enough to not feel broken, short enough that a leaked link goes stale
): Promise<{ url: string; expiresAt: string } | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) return null;
  return {
    url: data.signedUrl,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}
