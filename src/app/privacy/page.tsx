import Link from "next/link";
import { PolicyPage, PolicySection, PolicyList } from "@/components/marketing/policy-page";

export const metadata = { title: "Privacy Policy | OrangeLink" };

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy">
      <PolicySection heading="What this covers">
        <p>
          This policy covers data collected by OrangeLink itself, the
          platform, creator dashboards, and public creator pages. It doesn&apos;t
          cover what a creator does with data outside OrangeLink (for example,
          their own mailing list once exported), or third-party services a
          creator chooses to connect to their page.
        </p>
      </PolicySection>

      <PolicySection heading="Information we collect">
        <PolicyList
          items={[
            <>
              <strong className="text-text-primary">Account information</strong>:
              email, username, and profile details when a creator signs up.
            </>,
            <>
              <strong className="text-text-primary">Purchase information</strong>:
              when you buy from a creator&apos;s page, we collect your email, name,
              and order details. Card details are handled directly by Razorpay,
              our payment processor. We never see or store your full card
              number.
            </>,
            <>
              <strong className="text-text-primary">Page analytics</strong>, page
              views, link clicks, and product views on a creator&apos;s page are
              tied to a random, anonymous visitor id stored in your browser&apos;s
              local storage (not a cookie), so a creator can see aggregate
              traffic and conversion, not who you are personally. This id
              isn&apos;t linked to your identity unless you also make a purchase or
              subscribe with your email, and it never leaves your browser except
              as part of that anonymous event data.
            </>,
            <>
              <strong className="text-text-primary">Email subscribers</strong>, if
              you subscribe to a creator&apos;s mailing list, we store your email
              and, if the creator has connected an email service (Kit, Beehiiv,
              or MailerLite), sync it there so the creator can send you updates.
            </>,
          ]}
        />
      </PolicySection>

      <PolicySection heading="Cookies and tracking">
        <p>
          OrangeLink&apos;s own analytics don&apos;t use cookies. The anonymous
          visitor id above lives in local storage, and there&apos;s nothing to
          consent to beyond using the page normally. If a creator connects a
          third-party tracking pixel (Meta Pixel, Google Analytics, or TikTok
          Pixel) to their page, that provider&apos;s own tracking and cookie
          behavior applies in addition to ours. Check their privacy policies
          if you want details on that.
        </p>
      </PolicySection>

      <PolicySection heading="How we use information">
        <PolicyList
          items={[
            "To operate the platform: hosting pages, processing purchases, delivering digital products.",
            "To show creators aggregate analytics about their own page.",
            "To send transactional emails (purchase confirmations, account notices), never marketing email from OrangeLink itself without opting in.",
            "To detect and prevent fraud or abuse.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Who we share information with">
        <PolicyList
          items={[
            <>
              <strong className="text-text-primary">Razorpay</strong>, to process
              payments.
            </>,
            <>
              <strong className="text-text-primary">Supabase</strong>, our database
              and infrastructure provider, which stores platform data on our
              behalf.
            </>,
            <>
              <strong className="text-text-primary">A creator&apos;s connected email
              service</strong> (Kit, Beehiiv, or MailerLite), only if you subscribe
              to that specific creator&apos;s list.
            </>,
            "We don't sell personal information to third parties.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Data retention">
        <p>
          We keep account and purchase data for as long as the account is
          active and as needed for legal, tax, and accounting purposes
          afterward. Anonymous analytics data is retained in aggregate for
          reporting.
        </p>
      </PolicySection>

      <PolicySection heading="Your rights">
        <p>
          You can request access to, correction of, or deletion of your
          personal data by emailing{" "}
          <a href="mailto:privacy@orangelink.in" className="text-accent underline">
            privacy@orangelink.in
          </a>
          . Creators can also manage and delete their own account data directly
          from their dashboard settings. If you connected a Facebook Page or
          Instagram account for comment-to-DM automation, see{" "}
          <Link href="/data-deletion" className="text-accent underline">
            Data Deletion Instructions
          </Link>{" "}
          for what that specifically covers.
        </p>
      </PolicySection>

      <PolicySection heading="Children's privacy">
        <p>OrangeLink isn&apos;t directed at children under 13, and we don&apos;t knowingly collect data from them.</p>
      </PolicySection>

      <PolicySection heading="Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be
          posted here with an updated date.
        </p>
      </PolicySection>

      <PolicySection heading="Contact">
        <p>
          Questions about this policy or a privacy request:{" "}
          <a href="mailto:privacy@orangelink.in" className="text-accent underline">
            privacy@orangelink.in
          </a>
          .
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
