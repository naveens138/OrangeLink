import "server-only";
import { createDodoClient } from "./client";
import type { Currency, TaxCategory } from "dodopayments/resources/misc";

/** Our product `type` doesn't map one-to-one onto Dodo's tax categories — this
 * is a judgment call, not a canonical mapping the API defines. */
const TAX_CATEGORY: Record<string, TaxCategory> = {
  digital_file: "digital_products",
  course: "edtech",
  coaching: "live_tutoring",
  booking: "live_tutoring",
  membership: "saas",
};

export interface SyncableProduct {
  id: string;
  dodo_product_id: string | null;
  type: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
}

/**
 * Creates or updates the product's counterpart in Dodo and returns its id.
 *
 * Digital file delivery deliberately is NOT configured on the Dodo side
 * (`digital_product_delivery`) — per BUILD_BRIEF.md §5, delivery goes through
 * our own `deliveries` table with a short-lived Supabase signed URL, created
 * by the webhook handler once payment succeeds, not through Dodo's built-in
 * delivery mechanism.
 */
export async function syncProductToDodo(
  product: SyncableProduct,
): Promise<string> {
  const client = createDodoClient();
  const taxCategory = TAX_CATEGORY[product.type] ?? "digital_products";

  const price = {
    type: "one_time_price" as const,
    currency: product.currency.toUpperCase() as Currency,
    price: product.price_cents,
    discount: 0,
  };

  if (product.dodo_product_id) {
    await client.products.update(product.dodo_product_id, {
      name: product.name,
      description: product.description,
      price,
      metadata: { orangelink_product_id: product.id },
    });
    return product.dodo_product_id;
  }

  const created = await client.products.create({
    name: product.name,
    description: product.description,
    price,
    tax_category: taxCategory,
    metadata: { orangelink_product_id: product.id },
  });
  return created.product_id;
}

export async function archiveDodoProduct(
  dodoProductId: string,
  lastKnownName: string,
): Promise<void> {
  const client = createDodoClient();
  // The SDK exposes no delete or publish/unpublish toggle for products (only
  // create/retrieve/update), so there is no way to actually deactivate a Dodo
  // product from this app. Renaming it is the only visible signal available —
  // it shows up as obviously defunct in the Dodo dashboard. Functionally this
  // is cosmetic, not a security concern: nothing in OrangeLink can reference
  // the product to start a checkout once our own `products` row is gone.
  try {
    await client.products.update(dodoProductId, {
      name: `[deleted] ${lastKnownName}`,
      metadata: { orangelink_deleted: "true" },
    });
  } catch {
    // best-effort — the local delete already succeeded by the time this runs
  }
}
