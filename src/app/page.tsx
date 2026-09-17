import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SaleTimeline } from "@/components/marketing/sale-timeline";
import { DeviceMockup } from "@/components/marketing/device-mockup";
import { ValueStack } from "@/components/marketing/value-stack";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { SectionHeader, btnDark, btnGhost } from "@/components/marketing/section-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { isDomainsConfigured } from "@/lib/vercel/domains";

// Structure and rhythm follow runner.now: one narrow centred column, small
// dense type, hairline-boxed cards, numbered section eyebrows, and a single
// animated card (SaleTimeline) carrying the page rather than motion
// sprinkled everywhere.
//
// Claims stay limited to what actually ships. Comment-to-DM is a
// placeholder in the dashboard, so it isn't claimed. Custom
// domains show as live only when the deployment has the Vercel API token
// they need (checked at build time), and as "Soon" otherwise.

const domainsLive = isDomainsConfigured();

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
    title: "Links that fill themselves in",
    body: "Paste a link and we add the title, image and description for you. No typing it all out.",
    example: {
      from: "youtube.com/watch?v=…",
      to: "Title · Image · Description",
    },
    wide: true,
  },
  {
    title: "One link for every bio",
    body: "Use it on Instagram, TikTok and YouTube. Update your page once and it changes everywhere.",
  },
  {
    title: "Sell right on your page",
    body: "Checkout opens on your page, so nobody gets sent to a site they don't know.",
  },
  {
    title: "Move your page in one click",
    body: "Bring your Linktree or Stan page over. Check it, then publish.",
  },
  {
    title: "You call the shots",
    body: "You set every price and approve every product. The money goes straight to you.",
  },
  {
    title: "See what sells",
    body: "Track clicks, views and sales, and see which post sent each one.",
  },
  {
    title: "Use your own domain",
    body: "Put your page on a domain you own. We set up HTTPS for you.",
    soon: !domainsLive,
  },
];

const faqItems: FaqItem[] = [
  {
    q: "What is OrangeLink?",
    a: "One page for your links, your digital products and your checkout. You share one link, and people can browse and buy without leaving it.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. Add blocks and drag them into place. There's nothing to install or host.",
  },
  {
    q: "Can I bring over my Linktree or Stan page?",
    a: "Yes. Paste your page's link and we copy your links over. Check everything and change what you like before it goes live.",
  },
  {
    q: "How do my customers pay?",
    a: "Checkout opens right on your page. Razorpay takes the payment, so we never see or store card details. Digital files are ready to download the moment the payment goes through.",
  },
  {
    q: "What does OrangeLink cost?",
    a: "One monthly plan, and no cut of your sales. People pay into your own Razorpay account, so your money never passes through us. Razorpay charges its usual fees. We're still setting the price, so the one above is a placeholder.",
  },
  {
    q: "Can I use my own domain?",
    a: domainsLive
      ? "Yes. Add it in your dashboard, copy one DNS record to where you bought it, and your page goes live there with HTTPS. Your orangelink.in link keeps working too."
      : "Not yet. It's almost ready. Until then, your page lives at orangelink.in/yourname.",
  },
];

// The same starters the AI designer offers in the dashboard.
const aiPrompts = [
  "Calm and minimal, sage green, serif",
  "Bold and sporty, deep red, square buttons",
  "Warm sunset, rounded and friendly",
];

export default function Home() {
  return (
    <div className="theme-marketing min-h-screen bg-background text-text-primary">
      <SiteNav />

      <main className="mx-auto w-full max-w-[560px] px-5">
        {/* Hero */}
        <section className="pb-16 pt-16">
          <h1 className="t-display rise max-w-[24ch] text-balance">
            One link for everything you share and sell.
          </h1>
          <p className="t-body rise rise-1 mt-4 max-w-[52ch] text-text-secondary">
            Share your links, sell digital products and get paid. All from one
            page you can set up in minutes.
          </p>
          <div className="rise rise-2 mt-6 flex flex-wrap items-center gap-2">
            <Link href="/signup" className={btnDark}>
              Claim your page
            </Link>
            <Link href="/jane" className={btnGhost}>
              See a live page
            </Link>
          </div>
          <p className="t-small rise rise-3 mt-4 text-text-muted">
            Free to start. No card needed.
          </p>
        </section>

        {/* 01 — the animated centrepiece */}
        <section id="how" className="scroll-mt-16 pb-16">
          <SectionHeader
            index="01"
            eyebrow="how it works"
            title="From sign up to first sale, step by step."
            body="Four quick walkthroughs: set up, make a sale, move your old page, grow your list."
          />
          <div className="rise rise-2 mt-7">
            <SaleTimeline />
          </div>
        </section>

        {/* 02 — features */}
        <section id="features" className="scroll-mt-16 pb-16">
          <SectionHeader
            index="02"
            eyebrow="what you get"
            title="Everything your page needs, built in."
            body="Put blocks in any order you like. None of them need another subscription."
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
            title="Your page, your brand."
            body="Your name, your products and your link. Design the look with a simple AI prompt."
          />
          <div className="rise rise-2 mt-7 rounded-md border border-border bg-surface-2 px-5 pb-6 pt-8">
            <DeviceMockup />
            <div className="mx-auto mt-7 flex max-w-[44ch] flex-col items-center gap-2 text-center">
              <p className="t-heading">Design your page with AI</p>
              <p className="t-small leading-relaxed text-text-secondary">
                Describe the look you want. AI picks the colors, fonts and layout to match.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {aiPrompts.map((prompt) => (
                  <span
                    key={prompt}
                    className="t-small rounded-full border border-border bg-background px-3 py-1 text-text-secondary"
                  >
                    &ldquo;{prompt}&rdquo;
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 04 — the comparison */}
        <section id="compare" className="scroll-mt-16 pb-16">
          <SectionHeader
            index="04"
            eyebrow="why switch"
            title="One page instead of four tools."
            body="A link page, a checkout, an email tool and a booking tool. That's four logins and four bills, every month, even when you don't sell."
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

        <SiteFooter />
      </main>
    </div>
  );
}
