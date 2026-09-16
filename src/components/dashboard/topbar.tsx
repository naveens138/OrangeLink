import Link from "next/link";
import { ArrowUpRight, LogOut } from "lucide-react";
import { BrandLockup } from "@/components/brand/brand";
import { signOut } from "@/app/(auth)/actions";
import type { Creator } from "@/lib/types";

/**
 * Set like the landing page's nav: sticky, frosted, a hairline underneath,
 * and its two button styles. The dashboard runs on the landing page's light
 * palette, so there is no theme switch here.
 */
export function Topbar({ creator }: { creator: Creator }) {
  const initial = (creator.display_name ?? creator.username).charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
      <Link href="/dashboard" className="inline-flex md:hidden">
        <BrandLockup />
      </Link>
      <p className="hidden font-mono text-label uppercase tracking-[0.1em] text-text-muted md:block">
        your page <span className="text-text-primary">/{creator.username}</span>
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={`/${creator.username}`}
          target="_blank"
          className="flex items-center gap-1 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-small font-medium text-text-primary transition-[background-color,transform] duration-100 hover:bg-surface-2 active:scale-[0.97]"
        >
          View page
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-text-primary text-small font-medium text-white">
          {creator.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
      </div>
    </header>
  );
}
