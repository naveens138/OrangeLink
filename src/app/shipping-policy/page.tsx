import { PolicyPage, PolicySection, PolicyList } from "@/components/marketing/policy-page";

export const metadata = { title: "Shipping Policy — OrangeLink" };

export default function ShippingPolicyPage() {
  return (
    <PolicyPage title="Shipping & Delivery Policy">
      <PolicySection heading="No physical shipping">
        <p>
          OrangeLink and the products sold through it are digital — there is no
          physical shipping. Everything a buyer purchases is delivered
          electronically, as described below.
        </p>
      </PolicySection>

      <PolicySection heading="How digital products are delivered">
        <PolicyList
          items={[
            <>
              <strong className="text-text-primary">Digital files</strong> (presets,
              templates, guides, and similar) are delivered as a secure,
              time-limited download link, available immediately after payment is
              confirmed — typically within seconds, and shown directly on the
              checkout confirmation screen.
            </>,
            <>
              <strong className="text-text-primary">Booked calls or services</strong>{" "}
              (a portfolio review, coaching session, and similar) are confirmed by
              email with scheduling details from the creator; delivery is the
              service itself, at the time arranged.
            </>,
          ]}
        />
      </PolicySection>

      <PolicySection heading="Delivery timing">
        <p>
          Digital file downloads are available immediately on successful
          payment. If a download link doesn&apos;t arrive or doesn&apos;t work,
          contact{" "}
          <a href="mailto:support@orangelink.co" className="text-accent underline">
            support@orangelink.co
          </a>{" "}
          with your order confirmation and we&apos;ll resolve it, typically
          within 1 business day.
        </p>
      </PolicySection>

      <PolicySection heading="Download link expiry">
        <p>
          Download links are time-limited for security. If yours has expired
          before you&apos;ve downloaded your file, contact support with your
          order confirmation and we&apos;ll issue a new one at no charge.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
