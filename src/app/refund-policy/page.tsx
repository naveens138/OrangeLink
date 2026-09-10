import { PolicyPage, PolicySection, PolicyList } from "@/components/marketing/policy-page";

export const metadata = { title: "Refund & Cancellation Policy | OrangeLink" };

export default function RefundPolicyPage() {
  return (
    <PolicyPage title="Refund & Cancellation Policy">
      <PolicySection heading="Digital file products">
        <p>
          Because digital files are delivered instantly and can be copied once
          downloaded, purchases are generally final once the download link has
          been used. If you haven&apos;t downloaded your file yet, or it doesn&apos;t
          match its description, or it&apos;s corrupted or unusable, contact{" "}
          <a href="mailto:support@orangelink.co" className="text-accent underline">
            support@orangelink.co
          </a>{" "}
          within 7 days of purchase and we&apos;ll review it. We&apos;ll issue a
          full refund if the file wasn&apos;t downloaded, or if it genuinely
          doesn&apos;t work as described.
        </p>
      </PolicySection>

      <PolicySection heading="Booked calls and services">
        <PolicyList
          items={[
            "Cancelling more than 24 hours before a scheduled call: full refund.",
            "Cancelling within 24 hours, or a no-show: the creator sets their own policy for this, shown at booking. Contact them directly, or reach support if you need help.",
            "If the creator cancels or doesn't show up: full refund, no exceptions.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="How refunds are issued">
        <p>
          Approved refunds are returned to the original payment method through
          Razorpay, typically within 5–7 business days depending on your bank
          or card issuer.
        </p>
      </PolicySection>

      <PolicySection heading="Disputed or unauthorized charges">
        <p>
          If you believe a charge on your account wasn&apos;t authorized by you,
          contact us first at{" "}
          <a href="mailto:billing@orangelink.co" className="text-accent underline">
            billing@orangelink.co
          </a>{" "}
          before filing a chargeback with your bank. Most issues can be
          resolved faster this way, and it&apos;s the only way we can help correct
          a genuine error.
        </p>
      </PolicySection>

      <PolicySection heading="Requesting a refund">
        <p>
          Email{" "}
          <a href="mailto:support@orangelink.co" className="text-accent underline">
            support@orangelink.co
          </a>{" "}
          with your order confirmation and the reason for your request. We
          respond within 2 business days.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
