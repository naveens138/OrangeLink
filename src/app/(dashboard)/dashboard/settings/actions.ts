"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // username is intentionally not accepted here — it is the public URL, and
  // changing it breaks every link already shared. RLS scopes this update to
  // the caller's own row regardless of what id is passed.
  await supabase
    .from("creators")
    .update({
      display_name: String(formData.get("display_name") ?? "").slice(0, 80),
      bio: String(formData.get("bio") ?? "").slice(0, 300),
    })
    .eq("id", user.id);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_MAX_BYTES = 1024 * 1024;

export type AvatarResult = { ok: true; url: string | null } | { ok: false; error: string };

/**
 * Saves a new profile photo. The browser has already cropped and shrunk it
 * (components/dashboard/avatar-uploader.tsx); this re-checks type and size,
 * stores it in the public "avatars" bucket under the creator's own folder,
 * points the profile at it and clears out the previous photo.
 */
export async function uploadAvatar(formData: FormData): Promise<AvatarResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in again to change your photo." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a photo first." };
  if (!AVATAR_TYPES.has(file.type)) return { ok: false, error: "Use a JPG, PNG or WebP photo." };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, error: "That photo is too large. Try a smaller one." };

  const admin = createServiceRoleClient();
  const folder = auth.user.id;
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  // A new name each time, so browsers and the CDN never show a cached old photo.
  const path = `${folder}/${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { ok: false, error: "Couldn't upload that photo. Try again." };

  const { data: publicUrl } = admin.storage.from("avatars").getPublicUrl(path);
  const { error: saveError } = await supabase
    .from("creators")
    .update({ avatar_url: publicUrl.publicUrl })
    .eq("id", auth.user.id);
  if (saveError) {
    await admin.storage.from("avatars").remove([path]);
    return { ok: false, error: "Couldn't save your photo. Try again." };
  }

  await removeOtherAvatars(folder, path);
  revalidateProfile();
  return { ok: true, url: publicUrl.publicUrl };
}

export async function removeAvatar(): Promise<AvatarResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in again to change your photo." };

  await supabase.from("creators").update({ avatar_url: null }).eq("id", auth.user.id);
  await removeOtherAvatars(auth.user.id, null);
  revalidateProfile();
  return { ok: true, url: null };
}

async function removeOtherAvatars(folder: string, keep: string | null) {
  const admin = createServiceRoleClient();
  const { data: files } = await admin.storage.from("avatars").list(folder);
  const stale = (files ?? []).map((f) => `${folder}/${f.name}`).filter((p) => p !== keep);
  if (stale.length) await admin.storage.from("avatars").remove(stale);
}

function revalidateProfile() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/[username]", "page");
}
