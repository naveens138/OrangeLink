import { ProductsManager } from "@/components/products/products-manager";
import { requireCreator } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function ProductsPage() {
  const { creator, products } = await requireCreator();

  // Checkout runs on the creator's own Razorpay account, so "can buyers
  // pay?" means "has this creator connected Razorpay?", not whether the
  // platform has payment keys. RLS confines the read to their own row.
  const supabase = await createClient();
  const { data: account } = await supabase
    .from("creator_payment_accounts")
    .select("creator_id")
    .eq("creator_id", creator.id)
    .maybeSingle();

  return <ProductsManager initialProducts={products} paymentsConnected={Boolean(account)} />;
}
