"use client";

import { useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeAvatar, uploadAvatar } from "@/app/(dashboard)/dashboard/settings/actions";

const SIZE = 512;

/**
 * Crops the chosen photo to a centred square and shrinks it to 512px JPEG
 * in the browser, so a 5MB phone photo uploads as ~60KB and fits the server
 * action's body limit.
 */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.86),
  );
}

export function AvatarUploader({ initialUrl, name }: { initialUrl: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      let blob: Blob;
      try {
        blob = await toSquareJpeg(file);
      } catch {
        setError("Couldn't read that photo. Try a JPG or PNG.");
        return;
      }
      const form = new FormData();
      form.set("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      const result = await uploadAvatar(form);
      if (result.ok) setUrl(result.url);
      else setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        aria-label="Change profile photo"
        className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-h2 text-text-secondary"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
          {pending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </button>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
            {pending ? "Uploading…" : url ? "Change photo" : "Upload photo"}
          </Button>
          {url && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await removeAvatar();
                  if (result.ok) setUrl(null);
                  else setError(result.error);
                })
              }
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-[12px] text-text-muted">Square photos look best. It&apos;s cropped to a circle on your page.</p>
        {error && <p className="text-small text-danger">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
