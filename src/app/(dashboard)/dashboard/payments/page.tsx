import { requireCreator } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";
import { RazorpayConnect } from "@/components/dashboard/razorpay-connect";

export default async function PaymentsPage() {
  const { creator } = await requireCreator();

  const supabase = await createClient();
  // RLS confines this to the caller's own row. Only the vault references
  // come back here, never the secrets themselves.
  const { data: account } = await supabase
    .from("creator_payment_accounts")
    .select("key_id, is_live, webhook_secret_id")
    .eq("creator_id", creator.id)
    .maybeSingle();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const webhookUrl = `${siteUrl}/api/webhooks/razorpay/${creator.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Payments</h1>
        <p className="mt-1 max-w-2xl text-body text-text-secondary">
          Your buyers pay you directly, into your own Razorpay account.
          OrangeLink never holds your money and takes no cut of a sale. We
          bill you for the platform separately.
        </p>
      </div>

      <RazorpayConnect
        connected={Boolean(account)}
        keyId={account?.key_id ?? null}
        isLive={Boolean(account?.is_live)}
        hasWebhook={Boolean(account?.webhook_secret_id)}
        webhookUrl={webhookUrl}
      />
    </div>
  );
}
