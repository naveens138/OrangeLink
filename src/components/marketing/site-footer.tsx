import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand";

const footerLinks = [
  ["/creator-program", "Creator Program"],
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
  ["/refund-policy", "Refund Policy"],
  ["/shipping-policy", "Shipping Policy"],
  ["/contact", "Contact"],
];

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-4 border-t border-border py-8">
      <div>
        <BrandLockup />
        <p className="t-small mt-1 text-text-secondary">
          One link for everything you share and sell.
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
  );
}
