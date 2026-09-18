import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PricingClient } from "./pricing-client";
import { createClient } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/billing/entitlement";

export const metadata: Metadata = {
  title: "Pricing — OrangeLink",
  description: "One plan, everything included. $19 a month, or $180 a year.",
};

export default async function PricingPage() {
  // A public marketing page: a signed-out visitor sees the same prices, and
  // only signs in when they actually subscribe. The session is used to show
  // someone what they're already on rather than selling it to them again.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let state: Awaited<ReturnType<typeof getEntitlement>> | null = null;
  let hasCreator = false;

  if (user) {
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    hasCreator = Boolean(creator);
    if (creator) state = await getEntitlement(creator.id);
  }

  return (
    <>
      <SiteNav />
      <PricingClient
        signedIn={Boolean(user)}
        hasCreator={hasCreator}
        email={user?.email ?? null}
        subscriptionStatus={state?.subscriptionStatus ?? "none"}
        currentInterval={state?.interval ?? null}
        onFreePeriod={state?.onFreePeriod ?? false}
        grantReason={state?.grantReason ?? null}
        grantEndsAt={state?.grantEndsAt?.toISOString() ?? null}
        paidUntil={state?.until?.toISOString() ?? null}
      />
      <SiteFooter />
    </>
  );
}
