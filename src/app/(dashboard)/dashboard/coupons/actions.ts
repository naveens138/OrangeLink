"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeCouponCode } from "@/lib/payments/pricing";

export interface Coupon {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  product_id: string | null;
  max_redemptions: number | null;
  times_redeemed: number;
  expires_at: string | null;
  created_at: string;
}

export type CouponActionResult =
  | { ok: true; coupon: Coupon }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;

/**
 * Codes are stored uppercase (migrations/0020 enforces it), so buyers can
 * type them however they like and still match.
 */
export async function createCoupon(formData: FormData): Promise<CouponActionResult> {
  const { supabase, user } = await requireUser();

  const code = normalizeCouponCode(String(formData.get("code") ?? ""));
  const discountType = String(formData.get("discount_type") ?? "percent");
  const rawValue = Number(String(formData.get("discount_value") ?? ""));
  const productId = String(formData.get("product_id") ?? "");
  const maxRedemptions = String(formData.get("max_redemptions") ?? "").trim();
  const expiresAt = String(formData.get("expires_at") ?? "").trim();

  if (!CODE_RE.test(code)) {
    return {
      ok: false,
      error: "Codes are 3 to 40 characters: letters, numbers, dashes or underscores.",
    };
  }
  if (discountType !== "percent" && discountType !== "fixed") {
    return { ok: false, error: "Pick a percent or a fixed amount." };
  }
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return { ok: false, error: "Enter a discount above zero." };
  }
  if (discountType === "percent" && rawValue > 100) {
    return { ok: false, error: "A percentage discount can't be more than 100." };
  }
  if (maxRedemptions && (!Number.isInteger(Number(maxRedemptions)) || Number(maxRedemptions) < 1)) {
    return { ok: false, error: "A redemption limit has to be a whole number, 1 or more." };
  }
  if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
    return { ok: false, error: "That expiry date isn't a real date." };
  }

  const { data, error } = await supabase
    .from("coupons")
    .insert({
      creator_id: user.id,
      code,
      discount_type: discountType,
      // Percent is a percentage; fixed is in whole currency units, matching
      // how a creator types a price elsewhere in the dashboard.
      discount_value: rawValue,
      product_id: productId || null,
      max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    })
    .select("id, code, discount_type, discount_value, product_id, max_redemptions, times_redeemed, expires_at, created_at")
    .single();

  if (error) {
    // unique (creator_id, code) from schema.sql
    if (error.code === "23505") {
      return { ok: false, error: `You already have a code called ${code}.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/coupons");
  return { ok: true, coupon: toCoupon(data) };
}

export async function deleteCoupon(
  couponId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();

  // RLS scopes this to the creator's own coupons; orders.coupon_id has no
  // cascade, so a deleted code leaves past orders pointing at nothing rather
  // than taking their history with it.
  const { error } = await supabase.from("coupons").delete().eq("id", couponId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/coupons");
  return { ok: true };
}

function toCoupon(row: Record<string, unknown>): Coupon {
  return {
    id: row.id as string,
    code: row.code as string,
    discount_type: row.discount_type as "percent" | "fixed",
    discount_value: Number(row.discount_value),
    product_id: (row.product_id as string | null) ?? null,
    max_redemptions: (row.max_redemptions as number | null) ?? null,
    times_redeemed: Number(row.times_redeemed ?? 0),
    expires_at: (row.expires_at as string | null) ?? null,
    created_at: row.created_at as string,
  };
}
