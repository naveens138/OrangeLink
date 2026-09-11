"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDodoConfigured } from "@/lib/env";
import { archiveDodoProduct } from "@/lib/dodo/products";
import {
  buildStoragePath,
  deleteProductFile,
  uploadProductFile,
} from "@/lib/storage/product-files";
import type { Product } from "@/lib/types";

export type ProductActionResult =
  | { ok: true; product: Product }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

interface ParsedProductInput {
  name: string;
  description: string | null;
  type: string;
  currency: string;
  price_cents: number;
}

function parseProductInput(
  formData: FormData,
): { error: string } | ParsedProductInput {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "digital_file");
  const currency = String(formData.get("currency") ?? "USD").toUpperCase();
  const priceRaw = String(formData.get("price") ?? "0");
  const priceCents = Math.round(Number(priceRaw) * 100);

  if (!name) return { error: "Name is required." };
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { error: "Enter a valid price." };
  }

  return {
    name,
    description: description || null,
    type,
    currency,
    price_cents: priceCents,
  };
}

export async function createProduct(
  formData: FormData,
): Promise<ProductActionResult> {
  const { supabase, user } = await requireUser();
  const parsed = parseProductInput(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { data: product, error } = await supabase
    .from("products")
    .insert({ creator_id: user.id, ...parsed })
    .select()
    .single();

  if (error || !product) {
    return { ok: false, error: error?.message ?? "Couldn't create the product." };
  }

  revalidatePath("/dashboard/products");
  return { ok: true, product: product as Product };
}

export async function updateProduct(
  productId: string,
  formData: FormData,
): Promise<ProductActionResult> {
  const { supabase } = await requireUser();
  const parsed = parseProductInput(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { data: product, error } = await supabase
    .from("products")
    .update(parsed)
    .eq("id", productId)
    .select()
    .single();

  if (error || !product) {
    return { ok: false, error: error?.message ?? "Couldn't update the product." };
  }

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/links");
  return { ok: true, product: product as Product };
}

// Products are no longer mirrored into Dodo on save: checkout runs on each
// creator's own Razorpay account, which needs no product catalogue, and the
// sync added a Dodo API round trip to every save. The Dodo code stays in
// lib/dodo for if it is ever switched back on. Deleting still archives a
// product that an earlier sync created, so nothing is left live in Dodo.

export async function deleteProduct(
  productId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();

  const { data: product } = await supabase
    .from("products")
    .select("name, file_url, dodo_product_id")
    .eq("id", productId)
    .maybeSingle();

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { ok: false, error: error.message };

  if (product?.file_url) {
    await deleteProductFile(product.file_url).catch(() => {});
  }
  if (product?.dodo_product_id && isDodoConfigured()) {
    await archiveDodoProduct(product.dodo_product_id, product.name ?? "product").catch(
      () => {},
    );
  }

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/links");
  return { ok: true };
}

export async function attachProductFile(
  productId: string,
  formData: FormData,
): Promise<{ ok: true; fileName: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }
  if (file.size > 500 * 1024 * 1024) {
    return { ok: false, error: "That file is larger than the 500MB limit." };
  }

  const { data: product } = await supabase
    .from("products")
    .select("file_url")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { ok: false, error: "Product not found." };

  const path = buildStoragePath(user.id, productId, file.name);
  const uploaded = await uploadProductFile(path, file);
  if (!uploaded.ok) return { ok: false, error: uploaded.error };

  const previousPath = product.file_url as string | null;

  const { error } = await supabase
    .from("products")
    .update({ file_url: path })
    .eq("id", productId);
  if (error) return { ok: false, error: error.message };

  if (previousPath) await deleteProductFile(previousPath).catch(() => {});

  revalidatePath("/dashboard/products");
  return { ok: true, fileName: file.name };
}
