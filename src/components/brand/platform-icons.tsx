import type { ReactElement } from "react";

// lucide-react dropped brand marks, so these are small inline outlines
// rather than pulling in a whole brand-icon package for a handful of
// glyphs. Shared by the storefront's social icons and the post planner.
type Icon = (props: { className?: string }) => ReactElement;

export const PLATFORM_ICONS: Record<string, Icon> = {
  x: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.53 3h3.02l-6.6 7.54L21.75 21h-5.86l-4.6-6-5.26 6H3l7.06-8.07L2.5 3h6l4.16 5.5L17.53 3Zm-1.06 16.2h1.67L7.62 4.72H5.83l10.64 14.48Z" />
    </svg>
  ),
  instagram: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  tiktok: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M14 4v10.2a3.3 3.3 0 1 1-3.3-3.3" />
      <path d="M14 4c.5 2.4 2.2 4 4.6 4.3" />
    </svg>
  ),
  youtube: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
      <path d="M10.5 9.2v5.6l5-2.8-5-2.8Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  threads: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...props}>
      <path d="M16.5 11.2c-.3-2.6-1.9-4-4.4-4-2.6 0-4.3 1.9-4.3 4.8s1.7 4.8 4.4 4.8c2 0 3.4-1 3.4-2.6 0-1.5-1.2-2.4-3-2.4-1.5 0-2.4.7-2.4 1.6 0 .9.8 1.4 1.8 1.4" />
      <path d="M19 12c0 4.4-2.9 7.5-7 7.5S5 16.4 5 12s2.9-7.5 7-7.5c3.2 0 5.5 1.7 6.4 4.6" />
    </svg>
  ),
  facebook: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" {...props}>
      <path d="M14 8h2.5V4.5H14A4 4 0 0 0 10 8.5V11H7.5v3.5H10V21h3.5v-6.5H16l.5-3.5h-3V9a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  linkedin: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 10.5V16M8 7.8v.1M11.5 16v-3.2a2.3 2.3 0 0 1 4.6 0V16M11.5 10.5V16" />
    </svg>
  ),
};
