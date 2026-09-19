import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createSignedDownloadUrl } from "@/lib/storage/product-files";
import { fulfillOrder } from "@/lib/payments/fulfill-order";
import { quoteCheckout } from "@/lib/payments/pricing";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Claims a free (price 0) product: no payment provider involved, the buyer
 * just leaves an email. It goes through fulfillOrder like a paid sale, so
 * the claim shows up in Orders and the email lands in the creator's
 * customer list.
 *
 * Only published products whose whole checkout totals 0 are claimable here,
 * whether that's a free product or a coupon covering the lot; the price is
 * quoted from the database, never taken from the request. Claiming the same
 * product again with the same email re-issues the download link instead of
 * adding another order.
 */
export async function POST(request: NextRequest) {
  let body: {
    productId?: string;
    email?: string;
    name?: string;
    visitorId?: string;
    bumpProductIds?: string[];
    couponCode?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const productId = String(body.productId ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim().slice(0, 120) || email;
  if (!productId || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "A product and a valid email are required." },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, creator_id, price_cents, currency, is_published, type, file_url")
    .eq("id", productId)
    .maybeSingle();

  if (!product || !product.is_published) {
    return NextResponse.json({ error: "This product isn't available." }, { status: 404 });
  }

  // Free isn't only "priced at 0" any more: a full-value coupon, or a free
  // product with free bumps attached, also comes to nothing. The total is
  // re-priced here rather than trusted, so this route can never be used to
  // claim something that actually costs money.
  const quoted = await quoteCheckout({
    productId: product.id,
    bumpProductIds: Array.isArray(body.bumpProductIds) ? body.bumpProductIds : [],
    couponCode: typeof body.couponCode === "string" ? body.couponCode : null,
  });
  if (!quoted.ok) {
    return NextResponse.json({ error: quoted.error }, { status: 404 });
  }
  const quote = quoted.quote;

  if (quote.totalCents !== 0) {
    return NextResponse.json({ error: "This product isn't free." }, { status: 400 });
  }

  const existing = await findExistingClaim(supabase, product.creator_id, product.id, email);
  if (existing) {
    const downloadUrl =
      product.type === "digital_file" && product.file_url
        ? (await createSignedDownloadUrl(product.file_url))?.url ?? null
        : null;
    return NextResponse.json({ ok: true, downloadUrl });
  }

  const result = await fulfillOrder({
    productId: product.id,
    creatorId: product.creator_id,
    visitorId: body.visitorId || null,
    email,
    name,
    amountCents: 0,
    currency: product.currency,
    items: quote.lines.map((line) => ({
      productId: line.productId,
      unitPriceCents: line.unitPriceCents,
      isOrderBump: line.isOrderBump,
    })),
    subtotalCents: quote.subtotalCents,
    discountCents: quote.discountCents,
    couponId: quote.coupon?.id ?? null,
    provider: "free",
    // orders.provider_payment_id is unique; a free claim has no provider
    // id of its own, so each claim gets a fresh one.
    providerPaymentId: `free_${crypto.randomUUID()}`,
  });

  if (!result.ok) {
    console.error("[free checkout] fulfillment failed:", result.error);
    return NextResponse.json(
      { error: "Couldn't complete this right now. Try again in a moment." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    downloadUrl: result.downloadUrl,
    downloads: result.downloads,
  });
}

async function findExistingClaim(
  supabase: ReturnType<typeof createServiceRoleClient>,
  creatorId: string,
  productId: string,
  email: string,
): Promise<boolean> {
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("email", email)
    .maybeSingle();
  if (!customer) return false;

  const { data: claims } = await supabase
    .from("orders")
    .select("id, order_items!inner(product_id)")
    .eq("customer_id", customer.id)
    .eq("payment_provider", "free")
    .eq("order_items.product_id", productId)
    .limit(1);
  return Boolean(claims && claims.length > 0);
}
