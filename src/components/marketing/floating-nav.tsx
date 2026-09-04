"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const items = [
  { href: "#features", label: "Features" },
  { href: "#testimonials", label: "Testimonials" },
];

// Deliberately theme-invariant (near-black chrome on any page background) —
// mirrors the floating pill nav from the Outpace-style reference: a fixed
// piece of chrome with enough contrast to sit on top of anything.
export function FloatingNav() {
  return (
    <motion.div
      initial={{ y: 32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1], delay: 0.2 }}
      className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <nav className="flex items-center gap-1 rounded-pill border border-white/10 bg-[#141414]/95 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <Link
          href="/"
          aria-label="OrangeLink home"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-small font-semibold text-white"
        >
          O
        </Link>
        <div className="hidden items-center gap-0.5 sm:flex">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-pill px-4 py-2 text-small text-white/65 transition-colors duration-[170ms] hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>
        <Link
          href="/signup"
          className="rounded-pill bg-accent px-5 py-2 text-small font-medium text-white transition-colors duration-[170ms] hover:bg-accent-hover"
        >
          Get started
        </Link>
      </nav>
    </motion.div>
  );
}
