"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPlatform, parseHandle, type Platform } from "@/lib/schedule/platforms";

// Writes go through the cookie-bound client; the RLS policy on
// scheduled_posts (migration 0016) limits every read and write to the
// creator's own rows.

export interface ScheduledPost {
  id: string;
  platforms: Platform[];
  caption: string;
  link_url: string | null;
  scheduled_for: string;
  status: "planned" | "posted" | "skipped";
  posted_at: string | null;
}

export type PostResult = { ok: true; post: ScheduledPost } | { ok: false; error: string };

const COLUMNS = "id, platforms, caption, link_url, scheduled_for, status, posted_at";

export interface PostInput {
  id?: string;
  platforms: string[];
  caption: string;
  linkUrl: string | null;
  scheduledFor: string;
}

export async function savePost(input: PostInput): Promise<PostResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in again to save." };

  const platforms = [...new Set(input.platforms)].filter(isPlatform);
  if (platforms.length === 0) return { ok: false, error: "Pick at least one platform." };

  const caption = input.caption.trim();
  if (caption.length > 5000) return { ok: false, error: "That caption is too long." };

  const when = new Date(input.scheduledFor);
  if (Number.isNaN(when.getTime())) return { ok: false, error: "Pick a date and time." };

  let link: string | null = input.linkUrl?.trim() || null;
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (link) {
    try {
      new URL(link);
    } catch {
      return { ok: false, error: "That link doesn't look right." };
    }
  }

  const row = {
    platforms,
    caption,
    link_url: link,
    scheduled_for: when.toISOString(),
    updated_at: new Date().toISOString(),
  };

  const query = input.id
    ? supabase.from("scheduled_posts").update(row).eq("id", input.id).select(COLUMNS).single()
    : supabase
        .from("scheduled_posts")
        .insert({ ...row, creator_id: auth.user.id })
        .select(COLUMNS)
        .single();

  const { data, error } = await query;
  if (error || !data) return { ok: false, error: "Couldn't save the post. Try again." };
  revalidatePath("/dashboard/schedule");
  return { ok: true, post: data as ScheduledPost };
}

export async function setPostStatus(id: string, status: ScheduledPost["status"]): Promise<PostResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .update({
      status,
      posted_at: status === "posted" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error || !data) return { ok: false, error: "Couldn't update the post." };
  revalidatePath("/dashboard/schedule");
  return { ok: true, post: data as ScheduledPost };
}

export async function deletePost(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete the post." };
  revalidatePath("/dashboard/schedule");
  return { ok: true };
}

export type AccountResult = { ok: true; handle: string | null } | { ok: false; error: string };

/**
 * Saves the creator's handle on one platform (migration 0017). Accepts
 * "@name", "name" or a pasted profile link. Handles only: OrangeLink holds
 * no login for the platform.
 */
export async function saveSocialAccount(platform: string, input: string): Promise<AccountResult> {
  if (!isPlatform(platform)) return { ok: false, error: "Unknown platform." };
  const handle = parseHandle(input);
  if (!handle) return { ok: false, error: "Enter your username, like @yourname, or paste your profile link." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in again to save." };

  const { error } = await supabase
    .from("social_accounts")
    .upsert({ creator_id: auth.user.id, platform, handle }, { onConflict: "creator_id,platform" });
  if (error) return { ok: false, error: "Couldn't save that account. Try again." };

  revalidatePath("/dashboard/schedule");
  return { ok: true, handle };
}

export async function removeSocialAccount(platform: string): Promise<AccountResult> {
  if (!isPlatform(platform)) return { ok: false, error: "Unknown platform." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in again to save." };

  await supabase.from("social_accounts").delete().eq("creator_id", auth.user.id).eq("platform", platform);
  revalidatePath("/dashboard/schedule");
  return { ok: true, handle: null };
}
