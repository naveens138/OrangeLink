"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { PLATFORM_ICONS } from "@/components/brand/platform-icons";
import { pageTemplates, templateStyle, type PageTemplate } from "@/lib/page-templates";
import { DEFAULT_PRESET, themePresets } from "@/lib/theme-presets";
import { applyPageTemplate, updatePageTheme } from "@/app/(dashboard)/dashboard/links/actions";
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

// The page's own look, before any template: offered first so a creator can
// always go back to it.
const CLASSIC = "classic";

/**
 * Every template as a big phone-shaped card showing the creator's own name,
 * photo and links in that style, as Linktree shows its templates. Clicking
 * a card applies and saves it straight away. Opened from the Templates
 * button on the Links page.
 */
export function TemplateGallery({
  pageId,
  current,
  hasCustomDesign,
  sample,
  onApplied,
}: {
  pageId: string;
  /** The page's template id, or null for the classic look. */
  current: string | null;
  hasCustomDesign: boolean;
  sample: TemplateSample;
  onApplied: (templateId: string | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(
    hasCustomDesign ? null : (current ?? CLASSIC),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function choose(id: string) {
    if (id === selected || pendingId) return;
    const previous = selected;
    setSelected(id);
    setPendingId(id);
    setError(null);
    startTransition(async () => {
      const result =
        id === CLASSIC
          ? await updatePageTheme(pageId, { preset: DEFAULT_PRESET, template: null, custom: null })
          : await applyPageTemplate(pageId, id);
      setPendingId(null);
      if (result.ok) {
        onApplied(id === CLASSIC ? null : id);
      } else {
        setSelected(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {hasCustomDesign && (
        <p className="rounded-md border border-border bg-surface-1 px-4 py-3 text-small text-text-secondary">
          Your page uses an AI design right now. Picking a template replaces it.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-small text-danger">
          {error}
        </p>
      )}

      {/* Big cards: one per row on a phone. */}
      <div className="mx-auto grid w-full max-w-[380px] grid-cols-1 gap-y-9 sm:max-w-none sm:grid-cols-2 sm:gap-x-5 lg:grid-cols-3">
        <TemplateCard
          name="Classic"
          vibe="The OrangeLink look: white into soft peach"
          look={{
            style: { "--storefront-gradient": themePresets[DEFAULT_PRESET].gradient } as React.CSSProperties,
            buttons: "solid",
          }}
          sample={sample}
          selected={selected === CLASSIC}
          pending={pendingId === CLASSIC}
          onChoose={() => choose(CLASSIC)}
        />
        {pageTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            name={template.name}
            vibe={template.vibe}
            look={templateStyle(template, { preview: true })}
            sample={sample}
            selected={selected === template.id}
            pending={pendingId === template.id}
            onChoose={() => choose(template.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  name,
  vibe,
  look,
  sample,
  selected,
  pending,
  onChoose,
}: {
  name: string;
  vibe: string;
  look: { style: React.CSSProperties; buttons: PageTemplate["buttons"] };
  sample: TemplateSample;
  selected: boolean;
  pending: boolean;
  onChoose: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    setZoom(el.clientWidth / CARD_WIDTH);
    const observer = new ResizeObserver(([entry]) => setZoom(entry.contentRect.width / CARD_WIDTH));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const initial = sample.name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onChoose}
        aria-pressed={selected}
        aria-label={`Use the ${name} template`}
        className={cn(
          "group relative block w-full overflow-hidden rounded-[36px] text-left outline-none transition-[box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:ring-text-primary",
          selected
            ? "ring-2 ring-text-primary ring-offset-2 ring-offset-background"
            : "hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)]",
        )}
      >
        <div
          ref={frameRef}
          className="theme-storefront storefront-screen aspect-[9/18] w-full overflow-hidden"
          style={look.style}
          data-buttons={look.buttons}
        >
          <div
            style={{ width: CARD_WIDTH, zoom }}
            className="pointer-events-none relative flex flex-col items-center px-5 pt-14 text-center text-text-primary"
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

        {!selected && (
          <span className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className="rounded-full bg-[#141413] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-lg">
              Use template
            </span>
          </span>
        )}
        {selected && (
          <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-[#141413] px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
            <Check className="h-3 w-3" />
            {pending ? "Saving" : "In use"}
          </span>
        )}
      </button>
      <div className="px-1">
        <p className="text-body font-medium text-text-primary">{name}</p>
        <p className="text-small text-text-muted">{vibe}</p>
      </div>
    </div>
  );
}
