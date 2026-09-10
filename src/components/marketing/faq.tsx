"use client";

import { useState } from "react";

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Plain text on white, hairline dividers, no icons — the open state is
 * carried by the answer itself and by aria-expanded for assistive tech.
 * Uses a CSS grid-rows transition rather than animating height, so it
 * stays smooth without measuring anything.
 */
export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="border-t border-border">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-b border-border">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="group flex w-full items-baseline justify-between gap-6 py-5 text-left"
            >
              <span className="t-heading text-text-primary transition-colors duration-150 group-hover:text-accent">
                {item.q}
              </span>
              <span
                aria-hidden
                className={`t-small shrink-0 text-text-muted transition-opacity duration-200 ${
                  isOpen ? "opacity-0" : "opacity-100"
                }`}
              >
                Read
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="t-body max-w-[62ch] pb-6 text-text-secondary">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
