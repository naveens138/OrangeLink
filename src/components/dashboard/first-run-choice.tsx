import Link from "next/link";
import { ArrowRight, Download, Sparkles } from "lucide-react";

/**
 * Shown on the Overview until the creator's page has its first block.
 *
 * Landing on an empty dashboard with no instruction was the weakest part
 * of the signup flow — this asks the one question that actually branches:
 * are you moving a page across, or starting fresh? It disappears on its
 * own once there is anything on the page, so it never becomes clutter.
 */
export function FirstRunChoice({ username }: { username: string }) {
  return (
    <section className="rounded-lg border border-border bg-surface-1 p-6">
      <h2 className="text-h3">Let&apos;s get your page started</h2>
      <p className="mt-1 text-body text-text-secondary">
        Your page is live at orangelink.in/{username}, but there&apos;s nothing
        on it yet. Pick whichever is less work.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/import"
          className="group flex flex-col rounded-md border border-border bg-background p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong"
        >
          <Download className="h-[18px] w-[18px] text-accent" strokeWidth={1.5} />
          <span className="mt-6 flex items-center gap-1.5 text-h3">
            I already have a page
            <ArrowRight className="h-4 w-4 text-text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
          <span className="mt-1.5 text-body text-text-secondary">
            Paste the link to your Linktree, Stan or similar page and we&apos;ll
            bring the links across. You review everything before it goes on.
          </span>
        </Link>

        <Link
          href="/dashboard/links"
          className="group flex flex-col rounded-md border border-border bg-background p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong"
        >
          <Sparkles className="h-[18px] w-[18px] text-accent" strokeWidth={1.5} />
          <span className="mt-6 flex items-center gap-1.5 text-h3">
            Start from scratch
            <ArrowRight className="h-4 w-4 text-text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
          <span className="mt-1.5 text-body text-text-secondary">
            Add your first link, product or booking block yourself and arrange
            the page how you want it.
          </span>
        </Link>
      </div>
    </section>
  );
}
