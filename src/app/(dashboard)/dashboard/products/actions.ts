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
  // Razorpay's minimum charge is 1.00 in any currency; 0 means free.
  if (priceCents > 0 && priceCents < 100) {
    return { error: "Paid products start at 1.00. Use 0 to make it free." };
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

  // The page only shows products that have a product block, so a new
  // product gets one at the end of the page straight away. Otherwise it
  // exists in Products but never appears in the Shop. Best-effort: the
  // product is already saved, and the block can still be added by hand.
  await addProductBlock(supabase, user.id, product.id);

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/links");
  return { ok: true, product: product as Product };
}

async function addProductBlock(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  creatorId: string,
  productId: string,
) {
  const { data: page } = await supabase
    .from("pages")
    .select("id, blocks(position)")
    .eq("creator_id", creatorId)
    .eq("is_primary", true)
    .maybeSingle();
  if (!page) return;

  const positions = ((page.blocks ?? []) as { position: number }[]).map((b) => b.position);
  const { error } = await supabase.from("blocks").insert({
    page_id: page.id,
    type: "product",
    position: positions.length ? Math.max(...positions) + 1 : 0,
    config: { product_id: productId },
  });
  if (error) console.error("[products] couldn't add product block:", error.message);
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

  // Take its block off the page too, so the Shop isn't left with an empty slot.
  await supabase.from("blocks").delete().eq("type", "product").eq("config->>product_id", productId);

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

export interface OrderBumpRow {
  offerProductId: string;
  discountPercent: number | null;
}

/**
 * The order bumps attached to one product. RLS keeps this to the creator's
 * own products (migrations/0020), so an id belonging to someone else simply
 * returns nothing.
 */
export async function getOrderBumps(productId: string): Promise<OrderBumpRow[]> {
  const { supabase } = await requireUser();

  const { data } = await supabase
    .from("product_offers")
    .select("offer_product_id, discount_percent, position")
    .eq("primary_product_id", productId)
    .eq("offer_type", "order_bump")
    .order("position", { ascending: true });

  return (data ?? []).map((row) => ({
    offerProductId: row.offer_product_id as string,
    discountPercent: row.discount_percent === null ? null : Number(row.discount_percent),
  }));
}

/**
 * Replaces the whole bump list for a product in one go — simpler than
 * diffing, and the list is never more than a handful of rows. The insert is
 * still checked by RLS, so a bump product the creator doesn't own is
 * rejected by the database rather than only by this function.
 */
export async function setOrderBumps(
  productId: string,
  bumps: OrderBumpRow[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();

  if (bumps.length > 5) {
    return { ok: false, error: "Five order bumps is the most a checkout can carry." };
  }
  if (bumps.some((bump) => bump.offerProductId === productId)) {
    return { ok: false, error: "A product can't be its own order bump." };
  }
  for (const bump of bumps) {
    if (bump.discountPercent !== null) {
      if (!Number.isFinite(bump.discountPercent) || bump.discountPercent < 0 || bump.discountPercent > 100) {
        return { ok: false, error: "A bump discount has to be between 0 and 100 percent." };
      }
    }
  }

  const { error: clearError } = await supabase
    .from("product_offers")
    .delete()
    .eq("primary_product_id", productId)
    .eq("offer_type", "order_bump");
  if (clearError) return { ok: false, error: clearError.message };

  if (bumps.length > 0) {
    const { error } = await supabase.from("product_offers").insert(
      bumps.map((bump, index) => ({
        primary_product_id: productId,
        offer_product_id: bump.offerProductId,
        offer_type: "order_bump",
        discount_percent: bump.discountPercent,
        position: index,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { ok: true };
}
