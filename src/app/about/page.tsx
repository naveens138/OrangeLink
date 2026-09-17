import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/marketing/policy-page";

export const metadata = { title: "About Us | OrangeLink" };

export default function AboutPage() {
  return (
    <PolicyPage title="About Us">
      <PolicySection heading="What OrangeLink is">
        <p>
          OrangeLink gives creators one page for their links, their digital
          products and their checkout, plus a dashboard to run it all. Instead of
          juggling a link-in-bio tool, a checkout provider and an email tool,
          they use one.
        </p>
      </PolicySection>

      <PolicySection heading="What we do">
        <p>
          Creators publish a page at orangelink.in/theirname. From it they sell
          digital products like presets, guides, templates and calls, collect
          email subscribers, and see which links lead to sales. Checkout happens
          right on the creator&apos;s page, so buyers never leave it.
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
