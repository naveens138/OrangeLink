import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/marketing/policy-page";

export const metadata = { title: "Data Deletion | OrangeLink" };

export default function DataDeletionPage() {
  return (
    <PolicyPage title="Data Deletion Instructions">
      <PolicySection heading="What this covers">
        <p>
          If you&apos;ve connected a Facebook Page or Instagram professional
          account to OrangeLink (for comment-to-DM automation), this explains
          what we store from that connection and how to have it deleted. It
          doesn&apos;t cover your core OrangeLink account. See our{" "}
          <Link href="/privacy" className="text-accent underline">
            Privacy Policy
          </Link>{" "}
          for that, or account settings to delete your OrangeLink account
          entirely.
        </p>
      </PolicySection>

      <PolicySection heading="What we store from a connected Facebook/Instagram account">
        <p>
          The Page or Instagram account ID and access token needed to read
          comments and send automated replies, the automation rules you&apos;ve
          configured, and a log of the automated replies sent (which comment
          triggered it, when, and whether it succeeded), not the full
          content of every comment or message beyond what&apos;s needed to run
          and audit your automation rules.
        </p>
      </PolicySection>

      <PolicySection heading="How to request deletion">
        <p>
          Disconnect the integration from your OrangeLink dashboard
          (Automations settings). This removes the stored access token and
          automation rules immediately. To also delete the historical log of
          past automated replies, or if you no longer have access to your
          OrangeLink account, email{" "}
          <a href="mailto:privacy@orangelink.in" className="text-accent underline">
            privacy@orangelink.in
          </a>{" "}
          with the Page or Instagram account name. We complete deletion
          requests within 30 days.
        </p>
      </PolicySection>

      <PolicySection heading="Removing OrangeLink's access directly from Meta">
        <p>
          You can also revoke OrangeLink&apos;s access at any time from
          Facebook: Settings &amp; Privacy → Settings → Business Integrations
          (or Apps and Websites), and removing OrangeLink there. This
          immediately invalidates the access token on Meta&apos;s side; we
          delete our copy of it on the next sync, and in any case no later
          than when you email the address above.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
