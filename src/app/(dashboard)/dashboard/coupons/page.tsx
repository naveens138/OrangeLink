import { CouponsManager } from "@/components/coupons/coupons-manager";
import { requireCreator } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";
import type { Coupon } from "./actions";

export default async function CouponsPage() {
  const { products } = await requireCreator();

  // RLS confines this to the creator's own coupons (migrations/0020).
  const supabase = await createClient();
  const { data } = await supabase
    .from("coupons")
    .select(
      "id, code, discount_type, discount_value, product_id, max_redemptions, times_redeemed, expires_at, created_at",
    )
    .order("created_at", { ascending: false });

  const coupons: Coupon[] = (data ?? []).map((row) => ({
    ...row,
    discount_value: Number(row.discount_value),
    times_redeemed: Number(row.times_redeemed ?? 0),
  })) as Coupon[];

  return <CouponsManager initialCoupons={coupons} products={products} />;
}
