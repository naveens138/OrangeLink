"use client";

import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  attachProductFile,
  createProduct,
  updateProduct,
} from "@/app/(dashboard)/dashboard/products/actions";
import type { Product, ProductType } from "@/lib/types";

const TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: "digital_file", label: "Digital file" },
  { value: "course", label: "Course" },
  { value: "coaching", label: "1:1 coaching" },
  { value: "booking", label: "Booking" },
  { value: "membership", label: "Membership" },
];

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "INR", "AUD", "CAD"];

export function ProductFormModal({
  open,
  onClose,
  product,
  dodoConfigured,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** undefined = creating a new product */
  product?: Product;
  dodoConfigured: boolean;
  onSaved: (product: Product) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadState, setUploadState] = useState<
    { status: "idle" } | { status: "uploading" } | { status: "done"; name: string } | { status: "error"; message: string }
  >({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(product);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const result = product
      ? await updateProduct(product.id, formData)
      : await createProduct(formData);

    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (file) {
      setUploadState({ status: "uploading" });
      const fileData = new FormData();
      fileData.set("file", file);
      const uploaded = await attachProductFile(result.product.id, fileData);
      setUploadState(
        uploaded.ok
          ? { status: "done", name: uploaded.fileName }
          : { status: "error", message: uploaded.error },
      );
    }

    setSaving(false);
    onSaved(result.product);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit product" : "New product"}
      maxWidthClassName="max-w-[480px]"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Name">
          {(p) => (
            <Input {...p} name="name" required defaultValue={product?.name} />
          )}
        </Field>

        <Field label="Description">
          {(p) => (
            <textarea
              {...p}
              name="description"
              rows={3}
              defaultValue={product?.description ?? ""}
              className="w-full rounded-md border border-border bg-surface-1 px-4 py-3 text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-soft"
            />
          )}
        </Field>

        <Field label="Type">
          {(p) => (
            <select
              {...p}
              name="type"
              defaultValue={product?.type ?? "digital_file"}
              className="h-11 w-full rounded-md border border-border bg-surface-1 px-3 text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-soft"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="flex gap-3">
          <Field label="Price" className="flex-1">
            {(p) => (
              <Input
                {...p}
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={
                  product ? (product.price_cents / 100).toFixed(2) : undefined
                }
              />
            )}
          </Field>
          <Field label="Currency" className="w-28">
            {(p) => (
              <select
                {...p}
                name="currency"
                defaultValue={product?.currency ?? "USD"}
                className="h-11 w-full rounded-md border border-border bg-surface-1 px-3 text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-soft"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <Field
          label="Digital file"
          hint={
            product?.file_url
              ? "A file is already attached. Choosing a new one replaces it."
              : "Delivered as a short-lived download link only after payment succeeds."
          }
        >
          {(p) => (
            <div className="flex items-center gap-2">
              <input
                {...p}
                ref={fileInputRef}
                type="file"
                className="w-full text-small text-text-secondary file:mr-3 file:rounded-pill file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-small file:text-text-primary"
              />
            </div>
          )}
        </Field>
        {uploadState.status === "uploading" && (
          <p className="text-small text-text-muted">Uploading file…</p>
        )}
        {uploadState.status === "error" && (
          <p className="text-small text-danger">{uploadState.message}</p>
        )}

        {!dodoConfigured && (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-small text-warning">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Payments aren&apos;t connected. This product will save, but
              won&apos;t be purchasable until Dodo Payments keys are added.
            </span>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-small text-danger">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}

        <Button type="submit" disabled={saving} className="mt-1 w-full">
          {saving ? (
            "Saving…"
          ) : (
            <>
              <Check className="h-4 w-4" />
              {isEditing ? "Save changes" : "Create product"}
            </>
          )}
        </Button>
      </form>
    </Modal>
  );
}
