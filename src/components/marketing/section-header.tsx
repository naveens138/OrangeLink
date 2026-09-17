/** The "01 / eyebrow" numbered heading used by every marketing section. */
export function SectionHeader({
  index,
  eyebrow,
  title,
  body,
}: {
  index: string;
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="rise">
      <p className="t-mono text-text-muted">
        <span className="text-[var(--accent-strong)]">{index} / </span>
        {eyebrow}
      </p>
      {/* max-width sits on the heading itself: `ch` resolves against the
          element's own font-size, so on a wrapper it would measure the
          16px body text and clamp the heading to a sliver. */}
      <h2 className="t-title mt-3 max-w-[26ch] text-balance">{title}</h2>
      {body && <p className="t-body mt-2 max-w-[54ch] text-text-secondary">{body}</p>}
    </div>
  );
}

export const btnDark =
  "t-small rounded-md bg-text-primary px-3.5 py-2 font-medium text-white transition-[opacity,transform] duration-100 ease-out hover:opacity-90 active:scale-[0.97]";
export const btnGhost =
  "t-small rounded-md border border-border bg-surface-1 px-3.5 py-2 font-medium text-text-primary transition-[background-color,transform] duration-100 ease-out hover:bg-surface-2 active:scale-[0.97]";
