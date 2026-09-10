"use client";

import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { blockTypeMeta } from "@/lib/block-defaults";
import { fetchLinkPreview } from "@/app/(dashboard)/dashboard/links/actions";
import type { Block, Product, UnlockCondition, UnlockConditionType } from "@/lib/types";

const SOCIAL_PLATFORMS = ["x", "instagram", "tiktok", "youtube"];

const UNLOCK_OPTIONS: { value: UnlockConditionType | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "follow_instagram", label: "Follow on Instagram" },
  { value: "follow_tiktok", label: "Follow on TikTok" },
];

// datetime-local inputs want "YYYY-MM-DDTHH:mm" in local time, not ISO/UTC.
function toInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromInputValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function BlockInspector({
  block,
  products,
  onChange,
}: {
  block: Block;
  products: Product[];
  onChange: (updates: Partial<Block> & { password?: string | null }) => void;
}) {
  const config = block.config as Record<string, unknown>;
  const unlockCondition = config.unlock_condition as UnlockCondition | undefined;
  // Held locally: the saved value is a hash the server never sends back, so
  // there is nothing to prefill this from.
  const [password, setPassword] = useState("");
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function set(key: string, value: unknown) {
    onChange({ config: { ...config, [key]: value } });
  }

  async function fetchPreview() {
    const url = config.url as string | undefined;
    if (!url) return;
    setFetchingPreview(true);
    setFetchError(null);
    const result = await fetchLinkPreview(url);
    setFetchingPreview(false);
    if (!result.ok) {
      setFetchError(result.error);
      return;
    }
    // Only fills in what's actually there — a page missing og:image
    // shouldn't clear a badge/description the creator already typed.
    onChange({
      config: {
        ...config,
        ...(result.data.title ? { label: result.data.title } : {}),
        ...(result.data.description ? { description: result.data.description } : {}),
        ...(result.data.image ? { image: result.data.image } : {}),
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-label uppercase tracking-wide text-text-muted">
        {blockTypeMeta[block.type].label}
      </p>

      {block.type === "link" && (
        <>
          <Field label="URL">
            {(p) => (
              <Input
                {...p}
                value={(config.url as string) ?? ""}
                onChange={(e) => set("url", e.target.value)}
                // Fetching on blur covers "paste a URL and it just fills
                // in" without firing on every keystroke while typing.
                onBlur={fetchPreview}
              />
            )}
          </Field>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!config.url || fetchingPreview}
            onClick={fetchPreview}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {fetchingPreview ? "Fetching…" : "Fetch title, image & description"}
          </Button>
          {fetchError && <p className="text-small text-danger">{fetchError}</p>}

          <Field label="Label">
            {(p) => (
              <Input
                {...p}
                value={(config.label as string) ?? ""}
                onChange={(e) => set("label", e.target.value)}
              />
            )}
          </Field>
          <Field label="Description" hint="Optional">
            {(p) => (
              <Input
                {...p}
                value={(config.description as string) ?? ""}
                onChange={(e) => set("description", e.target.value)}
              />
            )}
          </Field>
          <Field label="Preview image URL" hint="Auto-filled above, or paste your own">
            {(p) => (
              <Input
                {...p}
                value={(config.image as string) ?? ""}
                onChange={(e) => set("image", e.target.value)}
              />
            )}
          </Field>
          <Field label="Badge" hint="Optional, e.g. a discount code, shown as a small overlay">
            {(p) => (
              <Input
                {...p}
                value={(config.badge as string) ?? ""}
                onChange={(e) => set("badge", e.target.value)}
                placeholder="SAVE20"
              />
            )}
          </Field>
        </>
      )}

      {block.type === "text" && (
        <Field label="Text">
          {(p) => (
            <textarea
              {...p}
              value={(config.text as string) ?? ""}
              onChange={(e) => set("text", e.target.value)}
              rows={4}
              className="w-full rounded-md border border-border bg-surface-1 px-4 py-3 text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-soft"
            />
          )}
        </Field>
      )}

      {block.type === "image" && (
        <Field label="Image URL" hint="Paste a link. Uploads land in a later milestone.">
          {(p) => (
            <Input
              {...p}
              value={(config.url as string) ?? ""}
              onChange={(e) => set("url", e.target.value)}
            />
          )}
        </Field>
      )}

      {block.type === "product" && (
        <Field label="Product">
          {(p) => (
            <select
              {...p}
              value={(config.product_id as string) ?? ""}
              onChange={(e) => set("product_id", e.target.value)}
              className="h-11 w-full rounded-md border border-border bg-surface-1 px-3 text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-soft"
            >
              <option value="">Select a product…</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {block.type === "email_capture" && (
        <>
          <Field label="Headline">
            {(p) => (
              <Input
                {...p}
                value={(config.headline as string) ?? ""}
                onChange={(e) => set("headline", e.target.value)}
              />
            )}
          </Field>
          <Field label="Button text">
            {(p) => (
              <Input
                {...p}
                value={(config.cta_text as string) ?? ""}
                onChange={(e) => set("cta_text", e.target.value)}
              />
            )}
          </Field>
        </>
      )}

      {block.type === "social_icons" && (
        <Field label="Platforms">
          {() => (
            <div className="flex flex-col gap-2">
              {SOCIAL_PLATFORMS.map((platform) => {
                const active = ((config.platforms as string[]) ?? []).includes(
                  platform,
                );
                return (
                  <label
                    key={platform}
                    className="flex items-center gap-2.5 text-body text-text-primary"
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => {
                        const current = (config.platforms as string[]) ?? [];
                        set(
                          "platforms",
                          e.target.checked
                            ? [...current, platform]
                            : current.filter((p) => p !== platform),
                        );
                      }}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="capitalize">{platform}</span>
                  </label>
                );
              })}
            </div>
          )}
        </Field>
      )}

      {/* An icon with no URL renders as a plain mark rather than a dead
          link, so these are optional but worth filling in. */}
      {block.type === "social_icons" &&
        ((config.platforms as string[]) ?? []).length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            {((config.platforms as string[]) ?? []).map((platform) => (
              <Field key={platform} label={`${platform} link`}>
                {(p) => (
                  <Input
                    {...p}
                    value={
                      ((config.links as Record<string, string>) ?? {})[platform] ?? ""
                    }
                    onChange={(e) =>
                      set("links", {
                        ...((config.links as Record<string, string>) ?? {}),
                        [platform]: e.target.value,
                      })
                    }
                    placeholder={`https://${platform === "x" ? "x.com" : platform + ".com"}/yourhandle`}
                  />
                )}
              </Field>
            ))}
          </div>
        )}

      {block.type === "embed" && (
        <Field label="Embed URL">
          {(p) => (
            <Input
              {...p}
              value={(config.embed_url as string) ?? ""}
              onChange={(e) => set("embed_url", e.target.value)}
            />
          )}
        </Field>
      )}

      {block.type === "booking" && (
        <Field label="Calendly URL">
          {(p) => (
            <Input
              {...p}
              value={(config.url as string) ?? ""}
              onChange={(e) => set("url", e.target.value)}
            />
          )}
        </Field>
      )}

      {block.type === "divider" && (
        <p className="text-small text-text-muted">
          A thin divider line. Nothing to configure.
        </p>
      )}

      <div className="mt-2 flex flex-col gap-4 border-t border-border pt-4">
        <p className="text-label uppercase tracking-wide text-text-muted">
          Unlock condition
        </p>
        <p className="text-small text-text-muted">
          Shows a &quot;Follow to unlock&quot; state instead of the real
          content. Honor system: clicking the CTA opens the profile and
          unlocks immediately, since no platform lets us verify a follow.
        </p>

        <Field label="Requirement">
          {(p) => (
            <select
              {...p}
              value={(unlockCondition?.type as string) ?? ""}
              onChange={(e) => {
                const type = e.target.value as UnlockConditionType | "";
                set(
                  "unlock_condition",
                  type ? { type, url: unlockCondition?.url ?? "", label: unlockCondition?.label } : undefined,
                );
              }}
              className="h-11 w-full rounded-md border border-border bg-surface-1 px-3 text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-soft"
            >
              {UNLOCK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        {unlockCondition && (
          <>
            <Field label="Profile URL" hint="Where the follow CTA sends visitors">
              {(p) => (
                <Input
                  {...p}
                  value={unlockCondition.url ?? ""}
                  onChange={(e) =>
                    set("unlock_condition", { ...unlockCondition, url: e.target.value })
                  }
                  placeholder="https://instagram.com/yourhandle"
                />
              )}
            </Field>
            <Field label="Button text" hint="Optional, defaults to “Follow to unlock”">
              {(p) => (
                <Input
                  {...p}
                  value={unlockCondition.label ?? ""}
                  onChange={(e) =>
                    set("unlock_condition", { ...unlockCondition, label: e.target.value })
                  }
                />
              )}
            </Field>
          </>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-4 border-t border-border pt-4">
        <p className="text-label uppercase tracking-wide text-text-muted">
          Visibility
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Field label="Show from" className="flex-1">
            {(p) => (
              <Input
                {...p}
                type="datetime-local"
                value={toInputValue(block.visible_from)}
                onChange={(e) =>
                  onChange({ visible_from: fromInputValue(e.target.value) })
                }
              />
            )}
          </Field>
          <Field label="Show until" className="flex-1">
            {(p) => (
              <Input
                {...p}
                type="datetime-local"
                value={toInputValue(block.visible_until)}
                onChange={(e) =>
                  onChange({ visible_until: fromInputValue(e.target.value) })
                }
              />
            )}
          </Field>
        </div>

        {block.is_password_protected ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-small text-text-secondary">
              <Lock className="h-3.5 w-3.5" />
              This block is password protected.
            </p>
            <button
              type="button"
              onClick={() => {
                setPassword("");
                onChange({ password: null });
              }}
              className="w-fit text-small font-medium text-danger"
            >
              Remove password
            </button>
          </div>
        ) : (
          <Field
            label="Set a password"
            hint="Visitors enter this to unlock the block."
          >
            {(p) => (
              <div className="flex gap-2">
                <Input
                  {...p}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank for no password"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!password.trim()}
                  onClick={() => onChange({ password })}
                >
                  Set
                </Button>
              </div>
            )}
          </Field>
        )}
      </div>
    </div>
  );
}
