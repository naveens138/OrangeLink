"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#compare", label: "Compare" },
  { href: "#faq", label: "FAQ" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  // The bar only materialises once there is content behind it to separate
  // from — a scroll edge effect rather than a permanent hairline. Only the
  // background tint is animated; toggling backdrop-filter would force an
  // expensive repaint of everything underneath.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 8));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md transition-[background-color,box-shadow] duration-[220ms] ${
        scrolled
          ? "bg-background/80 shadow-[0_1px_0_rgba(0,0,0,0.06)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 w-full max-w-[560px] items-center justify-between gap-5 px-5">
        <Link href="/" className="flex items-center gap-1.5">
          <Image
            src="/logo.png"
            alt=""
            width={20}
            height={20}
            priority
            className="h-5 w-5 object-contain"
          />
          <span className="t-small font-semibold tracking-[-0.02em] text-text-primary">
            OrangeLink
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="t-small hidden text-text-secondary transition-colors duration-150 hover:text-text-primary sm:inline"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/signup"
            className="t-small rounded-md bg-text-primary px-3 py-1.5 font-medium text-white transition-[opacity,transform] duration-100 ease-out hover:opacity-90 active:scale-[0.97]"
          >
            Claim Your Page
          </Link>
        </nav>
      </div>
    </header>
  );
}
