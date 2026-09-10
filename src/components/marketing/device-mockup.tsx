"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MoreVertical, Share } from "lucide-react";
import { SocialIconsBlock } from "@/components/blocks/social-icons-block";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/types";

/**
 * The product shot: the demo creator's page (/jane) as it looks on a phone.
 *
 * Built from the same classes and images the live page uses (see
 * src/components/public/public-page-view.tsx and the block components) so
 * it stays in step with the real styling instead of going stale the way a
 * captured screenshot would. It is a replica rather than the real
 * components because those record analytics and link out on click, and a
 * marketing picture should do neither.
 *
 * The page is laid out at a real phone width (390px) and zoomed to fit
 * whatever width the frame ends up, so the proportions match what a
 * visitor's phone shows and nothing is cut off when the frame shrinks on a
 * small screen. The Links / Shop switch works and the screen scrolls.
 */

const PHONE_WIDTH = 390;
// Frame at its full 320px, minus the 9px bezel each side. The starting
// value until the real width is measured.
const DEFAULT_ZOOM = 302 / PHONE_WIDTH;

const products = [
  { name: "JANE LR Preset Pack MK1-MK6", price: "$38.00", image: "/demo/moto/cover-presets.jpg" },
  { name: "Cinematic Riding LUTs", price: "$29.00", image: "/demo/moto/cover-luts.jpg" },
  { name: "1:1 Moto Filmmaking Call", price: "$55.00", image: "/demo/moto/cover-call.jpg" },
];

const links = [
  { label: "NEW JANE LR Preset Pack | Out now", image: "/demo/moto/cover-presets.jpg" },
  { label: "Northbound Gloves | Use code JANE10 to get 10% off", image: "/demo/moto/gloves.jpg" },
  { label: "Ironhide Moto | Use code JANE15 to get 15% off", image: "/demo/moto/jacket.jpg" },
  { label: "Kickstand Boot Co. | Use code JANE20 to get 20% off", image: "/demo/moto/boots.jpg" },
];

// Icons only: no links, so they render as plain marks.
const socials = { config: { platforms: ["youtube", "instagram", "tiktok"] } } as unknown as Block;

const glassButton =
  "flex h-10 items-center justify-center rounded-full bg-white/70 text-text-primary shadow-[0_0_0_1px_rgba(0,0,0,0.06)]";

export function DeviceMockup() {
  const [tab, setTab] = useState<"links" | "shop">("links");
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    // Measure once now: ResizeObserver only reports on a rendered frame,
    // which a backgrounded tab may not produce for a while.
    setZoom(el.clientWidth / PHONE_WIDTH);
    const observer = new ResizeObserver(([entry]) => {
      setZoom(entry.contentRect.width / PHONE_WIDTH);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="rounded-[46px] bg-[#1d1d1f] p-[9px]">
        <div className="theme-storefront storefront-screen overflow-hidden rounded-[38px]">
          {/* Status bar and dynamic island, above the scrolling page the way
              a phone keeps them. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-[46px] items-center justify-between bg-gradient-to-b from-[#f6f5f2] from-60% to-[#f6f5f2]/0 px-7 text-[#1d1d1f]">
            <span className="text-[13px] font-semibold tracking-[-0.01em]">9:41</span>
            <span className="absolute left-1/2 top-2.5 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-[#1d1d1f]" />
            <span className="flex items-center gap-1.5">
              <span className="flex items-end gap-[2px]" aria-hidden>
                {[4, 6, 8, 10].map((h) => (
                  <span key={h} className="w-[3px] rounded-[1px] bg-current" style={{ height: h }} />
                ))}
              </span>
              <span className="relative h-[11px] w-[22px] rounded-[3px] border border-current/40 p-[1.5px]" aria-hidden>
                <span className="block h-full w-[75%] rounded-[1.5px] bg-current" />
                <span className="absolute -right-[3px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r bg-current/40" />
              </span>
            </span>
          </div>

          <div ref={screenRef} className="relative h-[600px] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div style={{ width: PHONE_WIDTH, zoom }} className="px-5 pb-10 pt-[76px] text-text-primary">
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <span className={cn(glassButton, "w-10")}>
                  <Image src="/logo-orange.png" alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn(glassButton, "px-4 text-[14px] font-semibold")}>Subscribe</span>
                  <span className={cn(glassButton, "w-10")}>
                    <Share className="h-[18px] w-[18px]" />
                  </span>
                </div>
              </div>

              {/* Profile */}
              <div className="mt-7 flex flex-col items-center text-center">
                <div className="h-[120px] w-[120px] overflow-hidden rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.8)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo/moto/avatar.jpg" alt="" className="h-full w-full object-cover" />
                </div>
                <p className="mt-4 text-[28px] font-bold leading-tight tracking-[-0.01em]">JANE</p>
                <p className="mt-1 text-[16px] font-semibold leading-snug text-text-primary/80">
                  Discount codes, links, and presets
                </p>
                <div className="mt-5">
                  <SocialIconsBlock block={socials} />
                </div>
              </div>

              {/* Links / Shop */}
              <div className="mt-6 flex justify-center">
                <div className="flex items-center rounded-full bg-black/[0.05] p-1">
                  {(["links", "shop"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={cn(
                        "rounded-full px-6 py-2 text-[14px] font-semibold transition-colors duration-200",
                        tab === t ? "bg-text-primary text-white" : "text-text-primary hover:text-text-secondary",
                      )}
                    >
                      {t === "links" ? "Links" : "Shop"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                {tab === "links" ? (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setTab("shop")}
                      className="storefront-pill w-full overflow-hidden rounded-[32px] p-3 pb-4"
                    >
                      <div className="flex gap-[3px] overflow-hidden rounded-[24px] bg-[#e9e7e3]">
                        {products.map((p) => (
                          <div
                            key={p.name}
                            className="aspect-[3/5] w-[38%] shrink-0 bg-white bg-cover bg-center"
                            style={{ backgroundImage: `url(${p.image})` }}
                          />
                        ))}
                      </div>
                      <p className="mt-3 text-[14px] font-semibold">See Full Shop</p>
                      <p className="text-[13px] text-text-secondary">3 products</p>
                    </button>

                    {links.map((l) => (
                      <div key={l.label} className="storefront-pill flex min-h-[64px] items-center rounded-full p-2">
                        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={l.image} alt="" className="h-full w-full object-cover" />
                        </span>
                        <span className="min-w-0 flex-1 px-3 text-center text-[14px] font-medium leading-snug">
                          {l.label}
                        </span>
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center text-text-secondary">
                          <MoreVertical className="h-4 w-4" />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {products.map((p, i) => {
                      const wide = i === products.length - 1;
                      return (
                        <div key={p.name} data-wide={wide || undefined} className={wide ? "col-span-2" : undefined}>
                          <div className="storefront-pill relative flex h-full flex-col overflow-hidden rounded-[28px]">
                            <div className="in-data-wide:px-4 in-data-wide:pt-4">
                              <div
                                className="aspect-square w-full bg-white bg-cover bg-center in-data-wide:mx-auto in-data-wide:max-w-[56%] in-data-wide:rounded-[22px]"
                                style={{ backgroundImage: `url(${p.image})` }}
                              />
                            </div>
                            <div className="flex-1 px-4 pb-4 pr-11 pt-3 in-data-wide:px-11 in-data-wide:text-center">
                              <p className="line-clamp-2 text-[14px] font-medium leading-snug">{p.name}</p>
                              <p className="mt-0.5 text-[13px] text-text-secondary">{p.price}</p>
                            </div>
                            <MoreVertical className="absolute bottom-5 right-4 h-4 w-4 text-text-secondary" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-12 flex justify-center">
                <span className="rounded-full bg-text-primary px-5 py-3 text-[14px] font-semibold text-white shadow-[0_6px_20px_rgba(0,0,0,0.15)]">
                  Get your own OrangeLink
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
