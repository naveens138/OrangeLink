import "server-only";
import { createDodoClient } from "./client";

export interface CreateCheckoutSessionInput {
  dodoProductId: string;
  productId: string;
  creatorId: string;
  visitorId?: string | null;
  email: string;
  name?: string;
  returnUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
}

/**
 * Creates a Dodo checkout session for a single product.
 *
 * `metadata` carries our own ids so the webhook handler can resolve the
 * OrangeLink product/creator without reverse-mapping from Dodo's product_cart
 * — see BUILD_BRIEF.md's note that attribution/fulfillment should be fast and
 * direct rather than joined through extra lookups.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CheckoutSessionResult> {
  const client = createDodoClient();

  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: input.dodoProductId, quantity: 1 }],
    customer: { email: input.email, name: input.name || input.email },
    return_url: input.returnUrl,
    metadata: {
      orangelink_product_id: input.productId,
      orangelink_creator_id: input.creatorId,
      orangelink_visitor_id: input.visitorId ?? "",
    },
  });

  if (!session.checkout_url) {
    throw new Error("Dodo did not return a checkout URL for this session.");
  }

  return { sessionId: session.session_id, checkoutUrl: session.checkout_url };
}
