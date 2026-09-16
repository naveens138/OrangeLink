import Link from "next/link";
import { PolicyPage, PolicySection, PolicyList } from "@/components/marketing/policy-page";

export const metadata = { title: "Terms & Conditions | OrangeLink" };

export default function TermsPage() {
  return (
    <PolicyPage title="Terms & Conditions">
      <PolicySection heading="1. Acceptance of these terms">
        <p>
          By creating an OrangeLink account, publishing a page, or purchasing a
          product through a page hosted on OrangeLink, you agree to these
          terms. If you don&apos;t agree, don&apos;t use OrangeLink.
        </p>
      </PolicySection>

      <PolicySection heading="2. What OrangeLink is">
        <p>
          OrangeLink is a platform that lets creators publish a page combining
          links, a storefront, and a portfolio, and lets buyers purchase
          products directly from that page. OrangeLink is the platform provider
         , the creator is the seller of their own products, and is responsible
          for the products and services they list.
        </p>
      </PolicySection>

      <PolicySection heading="3. Creator accounts">
        <PolicyList
          items={[
            "You must provide accurate information when creating an account and keep your login credentials secure.",
            "You're responsible for the content of your page, the accuracy of your product listings, and delivering what you sell.",
            "You must have the legal right to sell anything you list. Don't list stolen, counterfeit, or infringing content.",
            "We may suspend or remove a page or account that violates these terms, hosts illegal content, or is used for fraud.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="4. Buyer purchases">
        <p>
          When you buy a product through a creator&apos;s OrangeLink page,
          you&apos;re purchasing from that creator, not from OrangeLink directly.
          OrangeLink processes the payment and facilitates delivery, but the
          creator is responsible for the product itself. See our{" "}
          <Link href="/refund-policy" className="text-accent underline">
            Refund &amp; Cancellation Policy
          </Link>{" "}
          and{" "}
          <Link href="/shipping-policy" className="text-accent underline">
            Shipping &amp; Delivery Policy
          </Link>{" "}
          for how purchases are fulfilled and refunded.
        </p>
      </PolicySection>

      <PolicySection heading="5. Payments">
        <p>
          Payments are processed by Razorpay. OrangeLink does not store your
          full card details. By making a purchase, you also agree to
          Razorpay&apos;s own terms as the payment processor. A platform fee is
          deducted from each creator&apos;s sale before payout, at the rate
          shown in their dashboard.
        </p>
      </PolicySection>

      <PolicySection heading="6. Prohibited use">
        <PolicyList
          items={[
            "Illegal content or products, or content that infringes someone else's rights.",
            "Fraud, money laundering, or attempting to circumvent payment verification.",
            "Scraping, reverse-engineering, or attempting to disrupt the platform.",
            "Impersonating another person or business.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="7. Intellectual property">
        <p>
          Creators retain ownership of the content and products they upload.
          By publishing on OrangeLink, you grant us a license to host, display,
          and deliver that content as necessary to operate the platform. The
          OrangeLink name, logo, and platform itself are our property.
        </p>
      </PolicySection>

      <PolicySection heading="8. Disclaimers">
        <p>
          OrangeLink is provided &quot;as is.&quot; We don&apos;t guarantee the
          platform will be uninterrupted or error-free, and we don&apos;t vet or
          endorse every product listed by creators.
        </p>
      </PolicySection>

      <PolicySection heading="9. Limitation of liability">
        <p>
          To the extent permitted by law, OrangeLink isn&apos;t liable for
          indirect, incidental, or consequential damages arising from your use
          of the platform, a purchase made through it, or a creator&apos;s
          product.
        </p>
      </PolicySection>

      <PolicySection heading="10. Termination">
        <p>
          You may stop using OrangeLink at any time. We may suspend or
          terminate an account that violates these terms, with notice where
          practical.
        </p>
      </PolicySection>

      <PolicySection heading="11. Changes to these terms">
        <p>
          We may update these terms from time to time. Material changes will
          be posted here with an updated date; continued use of OrangeLink
          after a change means you accept it.
        </p>
      </PolicySection>

      <PolicySection heading="12. Governing law">
        <p>
          These terms are governed by the laws of India, without regard to
          conflict-of-law principles, and courts in Karnataka have
          exclusive jurisdiction over any dispute arising from them.
        </p>
      </PolicySection>

      <PolicySection heading="13. Contact">
        <p>
          Questions about these terms:{" "}
          <a href="mailto:support@orangelink.in" className="text-accent underline">
            support@orangelink.in
          </a>
          . See also our{" "}
          <Link href="/contact" className="text-accent underline">
            Contact
          </Link>{" "}
          page.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
