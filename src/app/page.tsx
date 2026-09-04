import { Link2, ShoppingBag, Upload } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { FloatingNav } from "@/components/marketing/floating-nav";
import { PagePreviewCard } from "@/components/marketing/page-preview-card";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { IconSquare } from "@/components/marketing/icon-square";

const features = [
  {
    icon: Link2,
    title: "One link, everything you sell.",
    body: "Links, products, and checkout live on one page that looks like you built it — not a template.",
  },
  {
    icon: ShoppingBag,
    title: "Checkout that never leaves your page.",
    body: "In-page checkout with Apple Pay and Google Pay. No redirect to an unfamiliar payment portal.",
  },
  {
    icon: Upload,
    title: "Import your old page in one click.",
    body: "Bring your Linktree or Stan page over, review what changed, then go live.",
  },
];

const testimonials = [
  {
    quote:
      "Switched over in an afternoon. My whole shop finally feels like one thing instead of five different tools.",
    name: "Priya Nandan",
    role: "Illustrator",
    initial: "P",
  },
  {
    quote:
      "The checkout staying on my own page instead of bouncing people to Stripe is the whole reason I moved.",
    name: "Marcus Webb",
    role: "Course creator",
    initial: "M",
  },
  {
    quote:
      "Import took ten minutes and it actually asked me to review before publishing. Nothing got clobbered.",
    name: "Sofia Reyes",
    role: "Podcaster",
    initial: "S",
  },
  {
    quote:
      "Dark mode that's actually dark, not just inverted. Small thing, but it's the first page tool that got it right.",
    name: "Daniel Osei",
    role: "Photographer",
    initial: "D",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <span className="text-body font-semibold tracking-tight text-text-primary">
          Orange<span className="text-accent">Link</span>
        </span>
        <ThemeToggle />
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center gap-12 px-6 pb-20 pt-10 md:flex-row md:items-center md:justify-between md:gap-8 md:px-16 md:pb-28 md:pt-16">
        <div className="flex max-w-xl flex-col items-center text-center md:items-start md:text-left">
          <p className="text-label uppercase tracking-widest text-text-muted">
            For creators
          </p>
          <h1 className="mt-4 text-h1 md:text-display">
            <span className="font-normal text-text-secondary">
              One page for{" "}
            </span>
            <span className="font-bold text-text-primary">
              everything you sell.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-body-lg text-text-secondary">
            Links, products, checkout, and your audience — in one page that
            looks like you, not a template.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup">
              <Button className="w-full sm:w-auto">Get started free</Button>
            </Link>
            <Link href="/jane">
              <Button variant="secondary" className="w-full sm:w-auto">
                View a demo page
              </Button>
            </Link>
          </div>
        </div>

        <PagePreviewCard />
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 px-6 py-24 md:px-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="max-w-md text-h2">
            <span className="font-normal text-text-secondary">Focused. </span>
            <span className="font-bold text-text-primary">
              Built for conversion.
            </span>
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-4">
                <IconSquare icon={feature.icon} />
                <h3 className="text-h3">{feature.title}</h3>
                <p className="text-body text-text-secondary">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="scroll-mt-24 px-6 py-24 md:px-16"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="max-w-md text-h2">
            <span className="font-normal text-text-secondary">
              Creators talk.{" "}
            </span>
            <span className="font-bold text-text-primary">
              Here&apos;s what they&apos;re saying.
            </span>
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10 md:px-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <span className="text-small text-text-muted">
            © {new Date().getFullYear()} OrangeLink
          </span>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-small text-text-secondary">
            <Link href="/about" className="hover:text-text-primary">
              About
            </Link>
            <Link href="/contact" className="hover:text-text-primary">
              Contact
            </Link>
            <Link href="/shipping-policy" className="hover:text-text-primary">
              Shipping Policy
            </Link>
            <Link href="/refund-policy" className="hover:text-text-primary">
              Refund Policy
            </Link>
            <Link href="/terms" className="hover:text-text-primary">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-text-primary">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>

      <FloatingNav />
    </div>
  );
}
