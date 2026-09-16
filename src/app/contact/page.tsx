import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/marketing/policy-page";

export const metadata = { title: "Contact Us | OrangeLink" };

export default function ContactPage() {
  return (
    <PolicyPage title="Contact Us">
      <PolicySection heading="General support">
        <p>
          For questions about your OrangeLink account, your page, or a purchase
          you made through a creator&apos;s OrangeLink page, email{" "}
          <a href="mailto:support@orangelink.in" className="text-accent underline">
            support@orangelink.in
          </a>
          . We aim to respond within 2 business days.
        </p>
      </PolicySection>

      <PolicySection heading="Billing and payments">
        <p>
          For a question about a specific charge, include the order or payment
          ID from your confirmation email. It helps us look it up faster. Email{" "}
          <a href="mailto:billing@orangelink.in" className="text-accent underline">
            billing@orangelink.in
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection heading="Legal and privacy">
        <p>
          For legal notices or privacy requests, see our{" "}
          <Link href="/privacy" className="text-accent underline">
            Privacy Policy
          </Link>{" "}
          or email{" "}
          <a href="mailto:legal@orangelink.in" className="text-accent underline">
            legal@orangelink.in
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection heading="Registered address">
        <p>Naveen S, Rojipura, Doddaballapura, Karnataka - 561203, India.</p>
      </PolicySection>
    </PolicyPage>
  );
}
