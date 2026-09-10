import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand/brand";

const LAST_UPDATED = "September 3, 2026";

export function PolicyPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="inline-flex">
          <BrandLockup />
        </Link>
        <Link href="/" className="text-small text-text-secondary hover:text-text-primary">
          Back to home
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-24 pt-6 md:px-0">
        <h1 className="text-h1">{title}</h1>
        <p className="mt-2 text-small text-text-muted">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 flex flex-col gap-6 text-body text-text-secondary">{children}</div>
      </main>
    </div>
  );
}

export function PolicySection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h3 text-text-primary">{heading}</h2>
      {children}
    </section>
  );
}

export function PolicyList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i} className="list-disc">
          {item}
        </li>
      ))}
    </ul>
  );
}
