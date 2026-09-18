import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/billing/entitlement";
import { formatDate } from "@/lib/format";

/**
 * The end of signup: the store exists, and this says so before handing over
 * to the dashboard. Also where a subscription checkout lands, hence the two
 * versions of the same sentence.
 */
export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup");

  const { data: creator } = await supabase
    .from("creators")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();
  if (!creator) redirect("/claim-username");

  const entitlement = await getEntitlement(creator.id);

  const line =
    entitlement.source === "subscription"
      ? "Your plan is active."
      : entitlement.source === "creator_program"
        ? `Your Creator Program year runs until ${formatDate(entitlement.grantEndsAt!.toISOString())}.`
        : entitlement.source === "trial"
          ? `Everything is unlocked until ${formatDate(entitlement.grantEndsAt!.toISOString())}. No card needed until then.`
          : "Your store is ready.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
        <Check className="h-6 w-6" />
      </div>
      <h1 className="text-h2">Your store is live.</h1>
      <p className="max-w-sm text-body text-text-secondary">{line}</p>
      <p className="font-mono text-small text-text-muted">
        orangelink.in/{creator.username}
      </p>
      <Link
        href="/dashboard"
        className="mt-2 inline-flex h-11 items-center rounded-md bg-text-primary px-5 text-body font-medium text-white transition-[opacity,transform] duration-100 hover:opacity-90 active:scale-[0.97]"
      >
        Start building it
      </Link>
    </div>
  );
}
