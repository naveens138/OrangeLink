import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/marketing/policy-page";

export const metadata = { title: "About Us — OrangeLink" };

export default function AboutPage() {
  return (
    <PolicyPage title="About Us">
      <PolicySection heading="What OrangeLink is">
        <p>
          OrangeLink is a creator operating system: one public page that combines a
          link-in-bio, a storefront, and a portfolio, backed by a dashboard where
          creators manage their links, products, email list, and sales in one
          place — instead of stitching together a link-in-bio tool, a checkout
          provider, and an email platform separately.
        </p>
      </PolicySection>

      <PolicySection heading="What we do">
        <p>
          Creators use OrangeLink to publish a page at their own OrangeLink URL,
          sell digital products (presets, guides, templates, bookable calls, and
          similar) directly from that page, capture email subscribers, and see
          how visitors move from a link click to a sale. Checkout happens
          in-page — buyers never leave the creator&apos;s page to complete a
          purchase.
        </p>
      </PolicySection>

      <PolicySection heading="Who we are">
        <p>
          OrangeLink is operated by Naveen S, Rojipura, Doddaballapura,
          Karnataka - 561203, India. For anything not covered here, see our{" "}
          <Link href="/contact" className="text-accent underline">
            Contact
          </Link>{" "}
          page.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
