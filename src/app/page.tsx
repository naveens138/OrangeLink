import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SaleTimeline } from "@/components/marketing/sale-timeline";
import { DeviceMockup } from "@/components/marketing/device-mockup";
import { ValueStack } from "@/components/marketing/value-stack";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { BrandLockup } from "@/components/brand/brand";

// Structure and rhythm follow runner.now: one narrow centred column, small
// dense type, hairline-boxed cards, numbered section eyebrows, and a single
// animated card (SaleTimeline) carrying the page rather than motion
// sprinkled everywhere.
//
// Claims stay limited to what actually ships. Custom domains, comment-to-DM
// and the media kit are placeholders in the dashboard, so they appear only
// in the FAQ under what isn't built.

const features: {
  title: string;
  body: string;
  soon?: boolean;
  /** Spans both columns, so the remaining six sit as three even rows. */
  wide?: boolean;
  /** Fills the extra width on the wide card without adding more prose. */
  example?: { from: string; to: string };
}[] = [
  {
    title: "OrangeLink Does the Work",
    body: "Paste a link and the title, image and description fetch themselves. No typing the same details in twice.",
    example: {
      from: "youtube.com/watch?v=…",
      to: "Title · Image · Description",
    },
    wide: true,
  },
  {
    title: "One Page, Every Platform",
    body: "Instagram, TikTok and YouTube all point at the same place, so there is one address to keep current.",
  },
  {
    title: "Sell Without Redirects",
    body: "Checkout opens on your page. Nobody gets handed off to an external tab they don't recognise.",
  },
  {
    title: "Import in One Click",
    body: "Bring an existing Linktree or Stan page across automatically, then review it before anything goes live.",
  },
  {
    title: "You Stay in Control",
    body: "You approve every price, product and payout. Nothing moves without your say-so.",
  },
  {
    title: "Real Funnel Analytics",
    body: "Clicks, product views and checkouts broken down by traffic source, not just a raw tap count.",
  },
  {
    title: "Your Own Domain",
    // Flagged as coming rather than shipped: /dashboard/domains is still a
    // placeholder, so claiming it works would be a promise we can't keep.
    body: "Point your own domain at your page instead of using the OrangeLink address.",
    soon: true,
  },
];

const faqItems: FaqItem[] = [
  {
    q: "What is OrangeLink?",
    a: "One page that holds your links, your digital products and your checkout together. You share a single address, and the people who find you can browse and buy without going anywhere else.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. You add blocks and drag them into the order you want. There is nothing to install, host or configure, and no template to edit by hand.",
  },
  {
    q: "Can I import my existing Linktree or Stan page?",
    a: "Yes. Paste the address of your current page and OrangeLink reads it and rebuilds the links for you. You review the result and change anything you like before it publishes.",
  },
  {
    q: "How does checkout work for my customers?",
    a: "The payment box opens on your own page rather than sending anyone to another site. Cards from any country work, and card details go straight to the payment provider, which means OrangeLink never sees or stores them. Digital files are delivered automatically the moment payment clears.",
  },
  {
    q: "What does OrangeLink charge?",
    a: "A flat subscription for the platform, and nothing on top of what you sell. Your buyers pay into your own Razorpay account, so your sales never pass through us and we take no cut of them. Payment processing fees are charged by Razorpay directly, as they would be anywhere. Monthly pricing is still being finalised, so the figure in the comparison above is a placeholder rather than a live price.",
  },
  {
    q: "Can I use my own domain?",
    a: "Not yet. Custom domains are on the roadmap but are not live, so pages currently sit at your OrangeLink address. We would rather say so here than let you find out after signing up.",
  },
];

const footerLinks = [
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
  ["/refund-policy", "Refund Policy"],
  ["/contact", "Contact"],
];

const btnDark =
  "t-small rounded-md bg-text-primary px-3.5 py-2 font-medium text-white transition-[opacity,transform] duration-100 ease-out hover:opacity-90 active:scale-[0.97]";
const btnGhost =
  "t-small rounded-md border border-border bg-surface-1 px-3.5 py-2 font-medium text-text-primary transition-[background-color,transform] duration-100 ease-out hover:bg-surface-2 active:scale-[0.97]";

function SectionHeader({
  index,
  eyebrow,
  title,
  body,
}: {
  index: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rise">
      <p className="t-mono text-text-muted">
        <span className="text-[var(--accent-strong)]">{index} / </span>
        {eyebrow}
      </p>
      {/* max-width sits on the heading itself: `ch` resolves against the
          element's own font-size, so on a wrapper it would measure the
          16px body text and clamp the heading to a sliver. */}
      <h2 className="t-title mt-3 max-w-[26ch] text-balance">{title}</h2>
      <p className="t-body mt-2 max-w-[54ch] text-text-secondary">{body}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="theme-marketing min-h-screen bg-background text-text-primary">
      <SiteNav />

      <main className="mx-auto w-full max-w-[560px] px-5">
        {/* Hero */}
        <section className="pb-16 pt-16">
          <h1 className="t-display rise max-w-[24ch] text-balance">
            Stop Managing Five Tools to Run One Simple Business.
          </h1>
          <p className="t-body rise rise-1 mt-4 max-w-[52ch] text-text-secondary">
            Links, digital products, and checkout. All on one page, live in
            minutes.
          </p>
          <div className="rise rise-2 mt-6 flex flex-wrap items-center gap-2">
            <Link href="/signup" className={btnDark}>
              Claim Your Page
            </Link>
            <Link href="/jane" className={btnGhost}>
              See a live page
            </Link>
          </div>
          <p className="t-small rise rise-3 mt-4 text-text-muted">
            Free to start.
          </p>
        </section>

        {/* 01 — the animated centrepiece */}
        <section id="how" className="scroll-mt-16 pb-16">
          <SectionHeader
            index="01"
            eyebrow="how it works"
            title="Watch the whole thing work, start to finish."
            body="Four short walkthroughs: setting up, making a sale, moving your old page over, and growing your list."
          />
          <div className="rise rise-2 mt-7">
            <SaleTimeline />
          </div>
        </section>

        {/* 02 — features */}
        <section id="features" className="scroll-mt-16 pb-16">
          <SectionHeader
            index="02"
            eyebrow="what goes on it"
            title="Everything the page needs, already in it."
            body="Drag the blocks into any order you like. Nothing here needs another subscription sitting behind it."
          />
          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`lift rise rise-${Math.min(i + 1, 6)} flex flex-col rounded-md border border-border bg-surface-1 p-6 ${
                  feature.wide ? "sm:col-span-2" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="t-heading">{feature.title}</p>
                  {feature.soon && (
                    <span className="t-mono rounded border border-border px-1.5 py-0.5 text-text-muted">
                      Soon
                    </span>
                  )}
                </div>
                <p
                  className={`t-small mt-2 leading-relaxed text-text-secondary ${
                    feature.wide ? "max-w-[58ch]" : ""
                  }`}
                >
                  {feature.body}
                </p>

                {feature.example && (
                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                    <code className="t-mono rounded border border-border bg-background px-2 py-1.5 text-text-secondary">
                      {feature.example.from}
                    </code>
                    <span aria-hidden className="t-mono text-[var(--accent-strong)]">
                      &rarr;
                    </span>
                    <code className="t-mono rounded border border-border bg-background px-2 py-1.5 text-text-primary">
                      {feature.example.to}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 03 — the page itself */}
        <section className="pb-16">
          <SectionHeader
            index="03"
            eyebrow="your page"
            title="It looks like your page, because it is."
            body="Your name, your products, your checkout, at your own address. The only thing we add is one small line at the bottom."
          />
          <div className="rise rise-2 mt-7 rounded-md border border-border bg-surface-2 px-5 pb-6 pt-8">
            <DeviceMockup />
            {/* Not built yet, so it carries the same "Soon" tag as the
                custom domain card rather than reading as a live feature. */}
            <div className="mx-auto mt-7 flex max-w-[44ch] flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-2">
                <p className="t-heading">Customize your page with AI</p>
                <span className="t-mono rounded border border-border px-1.5 py-0.5 text-text-muted">
                  Soon
                </span>
              </div>
              <p className="t-small leading-relaxed text-text-secondary">
                Describe the look you want and it restyles your page to match. Colours, fonts, layout, in one go.
              </p>
            </div>
          </div>
        </section>

        {/* 04 — the comparison */}
        <section id="compare" className="scroll-mt-16 pb-16">
          <SectionHeader
            index="04"
            eyebrow="the usual way vs. this"
            title="A Simpler Way to Run Your Business"
            body="Stop paying for five different tools. A link page here, a checkout there, an email tool, a booking tool. Four logins and four bills, every month, whether you sell anything or not."
          />
          <div className="rise rise-2 mt-7">
            <ValueStack />
          </div>
        </section>

        {/* Questions */}
        <section id="faq" className="scroll-mt-16 pb-16">
          <h2 className="t-title rise">Questions</h2>
          <div className="rise rise-1 mt-5">
            <Faq items={faqItems} />
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-border py-8">
          <div>
            <BrandLockup />
            <p className="t-small mt-1 text-text-secondary">
              One page for your links, your products and your checkout.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {footerLinks.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="link-underline t-small text-text-secondary hover:text-text-primary"
              >
                {label}
              </Link>
            ))}
          </nav>
          <span className="t-small text-text-muted">
            © {new Date().getFullYear()} OrangeLink. All rights reserved.
          </span>
        </footer>
      </main>
    </div>
  );
}
