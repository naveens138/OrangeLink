"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { PLATFORM_ICONS } from "@/components/brand/platform-icons";
import { pageTemplates, templateStyle, type PageTemplate } from "@/lib/page-templates";
import { applyPageTemplate } from "@/app/(dashboard)/dashboard/links/actions";
import { cn } from "@/lib/utils";

export interface TemplateSample {
  name: string;
  bio: string | null;
  avatar: string | null;
  links: string[];
  socials: string[];
}

// Cards are laid out at this width and zoomed to fit the column, so they
// keep the same proportions on a phone and on a wide screen.
const CARD_WIDTH = 300;

/**
 * The template gallery: every template as a phone-shaped card showing the
 * creator's own name, photo and links in that style. Clicking a card
 * applies it straight away; the page shows it on the next load.
 */
export function TemplateGallery({
  pageId,
  username,
  current,
  hasCustomDesign,
  sample,
}: {
  pageId: string;
  username: string;
  current: string | null;
  hasCustomDesign: boolean;
  sample: TemplateSample;
}) {
  const [selected, setSelected] = useState<string | null>(hasCustomDesign ? null : current);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();

  function choose(template: PageTemplate) {
    if (template.id === selected || pendingId) return;
    const previous = selected;
    setSelected(template.id);
    setPendingId(template.id);
    setMessage(null);
    startTransition(async () => {
      const result = await applyPageTemplate(pageId, template.id);
      setPendingId(null);
      if (result.ok) {
        setMessage({ ok: true, text: `Your page now uses ${template.name}.` });
      } else {
        setSelected(previous);
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2">Templates</h1>
          <p className="mt-1 text-body text-text-secondary">
            {pageTemplates.length} designs, shown with your own name and links. Tap one to use it.
          </p>
        </div>
        <Link
          href={`/${username}`}
          target="_blank"
          className="flex items-center gap-1 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-small font-medium text-text-primary transition-colors hover:bg-surface-2"
        >
          View your page
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {hasCustomDesign && !message && (
        <p className="rounded-md border border-border bg-surface-1 px-4 py-3 text-small text-text-secondary">
          Your page uses an AI design right now. Picking a template replaces it.
        </p>
      )}

      {message && (
        <p
          role="status"
          className={cn(
            "rounded-md border px-4 py-3 text-small",
            message.ok
              ? "border-border bg-surface-1 text-text-primary"
              : "border-danger/30 bg-danger/5 text-danger",
          )}
        >
          {message.text}
          {message.ok && (
            <>
              {" "}
              <Link href={`/${username}`} target="_blank" className="font-medium underline underline-offset-2">
                See it live
              </Link>
            </>
          )}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 md:grid-cols-3">
        {pageTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            sample={sample}
            selected={selected === template.id}
            pending={pendingId === template.id}
            onChoose={() => choose(template)}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  sample,
  selected,
  pending,
  onChoose,
}: {
  template: PageTemplate;
  sample: TemplateSample;
  selected: boolean;
  pending: boolean;
  onChoose: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    setZoom(el.clientWidth / CARD_WIDTH);
    const observer = new ResizeObserver(([entry]) => setZoom(entry.contentRect.width / CARD_WIDTH));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const look = templateStyle(template);
  const initial = sample.name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onChoose}
        aria-pressed={selected}
        aria-label={`Use the ${template.name} template`}
        className={cn(
          "group relative block w-full overflow-hidden rounded-[26px] text-left outline-none transition-[box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:ring-text-primary sm:rounded-[32px]",
          selected
            ? "ring-2 ring-text-primary ring-offset-2 ring-offset-background"
            : "hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)]",
        )}
      >
        <div
          ref={frameRef}
          className="theme-storefront storefront-screen aspect-[9/17] w-full overflow-hidden"
          style={look.style}
          data-buttons={look.buttons}
        >
          <div
            style={{ width: CARD_WIDTH, zoom }}
            className="pointer-events-none relative flex flex-col items-center px-5 pt-12 text-center text-text-primary"
          >
            <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full bg-white/80 text-[28px] font-semibold text-[#141413] shadow-[0_0_0_3px_rgba(255,255,255,0.7)]">
              {sample.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sample.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <p className="mt-3 text-[19px] font-bold leading-tight">{sample.name}</p>
            {sample.bio && (
              <p className="mt-1 line-clamp-2 max-w-[34ch] text-[13px] font-medium leading-snug text-text-secondary">
                {sample.bio}
              </p>
            )}

            <div className="mt-6 flex w-full flex-col gap-3">
              {sample.links.map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className="storefront-pill storefront-link flex min-h-[46px] w-full items-center justify-center rounded-[var(--link-radius)] px-4 py-2 text-[13px] font-semibold leading-tight"
                >
                  <span className="line-clamp-1">{label}</span>
                </span>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              {sample.socials.map((platform) => {
                const Icon = PLATFORM_ICONS[platform];
                return Icon ? <Icon key={platform} className="h-6 w-6" /> : null;
              })}
            </div>
          </div>
        </div>

        {/* Hover hint, and the in-use badge. */}
        {!selected && (
          <span className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className="rounded-full bg-[#141413] px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg">
              Use template
            </span>
          </span>
        )}
        {selected && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#141413] px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
            <Check className="h-3 w-3" />
            {pending ? "Saving" : "In use"}
          </span>
        )}
      </button>
      <div className="px-1">
        <p className="text-small font-medium text-text-primary">{template.name}</p>
        <p className="text-[12px] text-text-muted">{template.vibe}</p>
      </div>
    </div>
  );
}
