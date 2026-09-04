import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PricingPageClient } from "./pricing-page-client";

export default async function PricingPage() {
  // Vercel sets this on every request at the edge — no geo-IP service of
  // our own needed. Absent locally and on non-Vercel hosts, which is fine:
  // Paddle.PricePreview() auto-detects location from the visitor's IP when
  // no country is passed, so this is an optimization, not a requirement.
  const h = await headers();
  const country = h.get("x-vercel-ip-country") ?? undefined;

  // Public marketing page — no redirect for a signed-out visitor. The
  // session is only used to prefill Checkout's email field when present,
  // and (if the account has actually claimed a username, i.e. has a real
  // `creators` row) to attach the subscription to that creator via
  // Checkout's customData — see pricing-page-client.tsx.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let creatorId: string | undefined;
  if (user) {
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    creatorId = creator?.id;
  }

  return (
    <PricingPageClient
      country={country}
      email={user?.email ?? undefined}
      creatorId={creatorId}
    />
  );
}
