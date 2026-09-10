import "server-only";
import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface CreatorPaymentCredentials {
  keyId: string;
  keySecret: string;
  /** Null until the creator registers the webhook in their dashboard. */
  webhookSecret: string | null;
}

/**
 * Loads a creator's own Razorpay credentials.
 *
 * Buyers pay the creator directly, so every call into Razorpay on behalf of
 * a sale must be made with that creator's keys — never the platform's. The
 * decrypted values come back through a SECURITY DEFINER wrapper granted to
 * service_role alone (migrations/0011), so they are never reachable from
 * the browser.
 */
export async function getCreatorPaymentCredentials(
  creatorId: string,
): Promise<CreatorPaymentCredentials | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .rpc("get_creator_payment_credentials", { p_creator_id: creatorId })
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    key_id: string | null;
    key_secret: string | null;
    webhook_secret: string | null;
  };
  if (!row.key_id || !row.key_secret) return null;

  return {
    keyId: row.key_id,
    keySecret: row.key_secret,
    webhookSecret: row.webhook_secret,
  };
}

/** A Razorpay SDK client bound to one creator's account. */
export function createRazorpayClientFor(credentials: CreatorPaymentCredentials) {
  return new Razorpay({
    key_id: credentials.keyId,
    key_secret: credentials.keySecret,
  });
}

/**
 * Verifies the HMAC-SHA256(order_id + "|" + payment_id, key_secret)
 * signature Razorpay's checkout returns, against the creator's own secret.
 *
 * Uses the SDK's utility rather than a hand-rolled comparison — it does the
 * same computation but with a constant-time compare, and re-implementing it
 * risks a timing side-channel or a "|" vs "-" separator typo that only
 * shows up in production.
 */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  return validatePaymentVerification(
    { order_id: params.orderId, payment_id: params.paymentId },
    params.signature,
    params.keySecret,
  );
}

/**
 * Verifies a webhook body against a creator's webhook secret.
 *
 * The SDK's validateWebhookSignature reads the platform's own secret from
 * module scope in some versions, so the comparison is done here against the
 * secret we were handed — constant-time, over the raw body exactly as
 * received.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): boolean {
  const expected = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  // timingSafeEqual throws on length mismatch, which itself leaks nothing
  // useful — a wrong-length signature is simply invalid.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
