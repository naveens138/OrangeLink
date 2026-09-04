"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { addPixel, removePixel } from "@/app/(dashboard)/dashboard/analytics/actions";
import type { TrackingPixel, TrackingPixelProvider } from "@/lib/types";

const PROVIDER_LABELS: Record<TrackingPixelProvider, string> = {
  meta_pixel: "Meta Pixel",
  ga4: "Google Analytics 4",
  tiktok_pixel: "TikTok Pixel",
};

const PROVIDER_HINTS: Record<TrackingPixelProvider, string> = {
  meta_pixel: "Events Manager > Data Sources > your pixel — a numeric id.",
  ga4: "Admin > Data Streams > your stream — starts with G-.",
  tiktok_pixel: "Events > Web Events > Manage — the Pixel Code id.",
};

export function PixelManager({ initialPixels }: { initialPixels: TrackingPixel[] }) {
  const [pixels, setPixels] = useState(initialPixels);
  const [modalOpen, setModalOpen] = useState(false);
  const [provider, setProvider] = useState<TrackingPixelProvider>("meta_pixel");
  const [pixelId, setPixelId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function openModal() {
    setProvider("meta_pixel");
    setPixelId("");
    setError(null);
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await addPixel(formData);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPixels((prev) => {
      const exists = prev.some((p) => p.id === result.pixel.id || p.provider === result.pixel.provider);
      return exists
        ? prev.map((p) => (p.provider === result.pixel.provider ? result.pixel : p))
        : [...prev, result.pixel];
    });
    setModalOpen(false);
  }

  async function onRemove(id: string) {
    setPendingId(id);
    const previous = pixels;
    setPixels((prev) => prev.filter((p) => p.id !== id));
    const result = await removePixel(id);
    if (!result.ok) setPixels(previous);
    setPendingId(null);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-h3">Tracking pixels</h2>
        <Button size="sm" onClick={openModal}>
          <Plus className="h-4 w-4" />
          Add pixel
        </Button>
      </div>

      {pixels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-small text-text-secondary">
            No pixels connected — nothing extra is injected into your public page.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pixels.map((pixel) => (
            <Card key={pixel.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-body text-text-primary">{PROVIDER_LABELS[pixel.provider]}</p>
                <p className="font-mono text-small text-text-muted">{pixel.pixel_id}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(pixel.id)}
                disabled={pendingId === pixel.id}
                aria-label="Remove"
                className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add a tracking pixel">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Provider">
            {(p) => (
              <select
                {...p}
                name="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as TrackingPixelProvider)}
                className="h-11 w-full rounded-md border border-border bg-surface-1 px-3 text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-soft"
              >
                {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Pixel / measurement ID" hint={PROVIDER_HINTS[provider]}>
            {(p) => (
              <Input
                {...p}
                name="pixelId"
                required
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
              />
            )}
          </Field>

          {error && (
            <p className="flex items-center gap-1.5 text-small text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          <p className="text-small text-text-muted">
            Injected into your public page&apos;s standard install snippet — this id isn&apos;t secret, it&apos;s meant to live in the page source.
          </p>

          <Button type="submit" disabled={saving} className="mt-1 w-full">
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
