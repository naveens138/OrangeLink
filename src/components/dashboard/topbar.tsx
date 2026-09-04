import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOut } from "@/app/(auth)/actions";
import type { Creator } from "@/lib/types";

export function Topbar({ creator }: { creator: Creator }) {
  const initial = (creator.display_name ?? creator.username)
    .charAt(0)
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface-1 px-4 md:px-8">
      <div className="text-body font-semibold text-text-primary md:hidden">
        Orange<span className="text-accent">Link</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <Link
          href={`/${creator.username}`}
          target="_blank"
          className="flex items-center gap-1.5 rounded-pill border border-border px-3 py-1.5 text-small text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
        >
          View page
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <ThemeToggle />
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-body font-medium text-accent">
          {initial}
        </div>
      </div>
    </header>
  );
}
