import { NextResponse } from "next/server";
import { Webhooks } from "@dodopayments/nextjs";
import type { z } from "zod/v3";
import type {
  PaymentSucceededPayloadSchema,
  PaymentFailedPayloadSchema,
} from "@dodopayments/core";
import { fulfillOrder } from "@/lib/payments/fulfill-order";

type PaymentSucceededPayload = z.infer<typeof PaymentSucceededPayloadSchema>;
type PaymentFailedPayload = z.infer<typeof PaymentFailedPayloadSchema>;

/**
 * Dodo's source of truth for fulfillment — per their own integration guide:
 * "Always fulfill on payment.succeeded from the webhook, not on the browser
 * redirect." The frontend (CheckoutModal) only ever polls the *result* of
 * what this handler writes; it never fulfills anything itself.
 *
 * The Webhooks() adapter verifies the Standard Webhooks signature (HMAC
 * SHA256 over webhook-id.webhook-timestamp.body) before this ever runs, and
 * returns 401 on a bad signature — see @dodopayments/core.
 */

async function onPaymentSucceeded(payload: PaymentSucceededPayload) {
  // The adapter's payload is { type, data }; `data` carries every payment
  // field (payment_id, customer, total_amount, ...) — see
  // @dodopayments/core's PaymentSucceededPayloadSchema.
  const payment = payload.data;
  const productId = String(payment.metadata?.orangelink_product_id ?? "");
  const creatorId = String(payment.metadata?.orangelink_creator_id ?? "");
  const visitorId = payment.metadata?.orangelink_visitor_id || null;

  if (!productId || !creatorId) {
    // A payment with no OrangeLink metadata isn't one this app created (e.g.
    // a test webhook fired from the Dodo dashboard) — nothing to fulfill,
    // and retrying won't change that.
    console.warn(
      `[dodo webhook] payment.succeeded ${payment.payment_id} has no orangelink metadata, skipping`,
    );
    return;
  }

  const result = await fulfillOrder({
    productId,
    creatorId,
    visitorId,
    email: payment.customer.email,
    name: payment.customer.name,
    amountCents: payment.total_amount,
    currency: payment.currency,
    provider: "dodo",
    providerPaymentId: payment.payment_id,
    providerCheckoutSessionId: payment.checkout_session_id ?? null,
  });

  if (!result.ok) {
    console.error(`[dodo webhook] fulfillment failed:`, result.error);
  } else if (result.alreadyProcessed) {
    console.info(`[dodo webhook] payment ${payment.payment_id} already processed`);
  }
}

async function onPaymentFailed(payload: PaymentFailedPayload) {
  console.info(`[dodo webhook] payment failed: ${payload.data.payment_id}`);
}

const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;

// Webhooks() validates its secret eagerly at construction — an empty string
// throws immediately, which would otherwise fail the production build itself
// (not just requests) whenever this env var isn't set yet. The handler is
// only built when a key exists; without one, this route answers honestly
// that it isn't configured instead of crashing the build.
export const POST = webhookKey
  ? Webhooks({ webhookKey, onPaymentSucceeded, onPaymentFailed })
  : async () =>
      NextResponse.json(
        { error: "Dodo webhooks are not configured (DODO_PAYMENTS_WEBHOOK_KEY unset)." },
        { status: 501 },
      );
