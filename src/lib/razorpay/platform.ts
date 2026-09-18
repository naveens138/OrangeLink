import "server-only";
import Razorpay from "razorpay";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * OrangeLink's own Razorpay account, for creators paying us.
 *
 * Deliberately not the client in ./client.ts: that one is built per creator
 * from credentials in the database, because a storefront sale is money
 * moving to the creator. Platform billing is money moving to OrangeLink, so
 * it uses one account's keys from the environment, and the two must never be
 * mixed up — charging a plan on a creator's own account would take their
 * money and pay it to themselves.
 */

export interface PlatformCredentials {
  keyId: string;
  keySecret: string;
}

export function getPlatformCredentials(): PlatformCredentials | null {
  const keyId = process.env.RAZORPAY_PLATFORM_KEY_ID;
  const keySecret = process.env.RAZORPAY_PLATFORM_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function createPlatformRazorpayClient(): Razorpay | null {
  const credentials = getPlatformCredentials();
  if (!credentials) return null;
  return new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret });
}

/**
 * Verifies the signature Razorpay's checkout returns after a subscription is
 * authorized: HMAC-SHA256(payment_id + "|" + subscription_id) — note the
 * order, which is the reverse of the one-off payment signature in ./client.ts
 * and a genuinely easy thing to get backwards.
 */
export function verifySubscriptionSignature(params: {
  subscriptionId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const expected = createHmac("sha256", params.keySecret)
    .update(`${params.paymentId}|${params.subscriptionId}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(params.signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verifies a platform webhook body against the platform webhook secret,
 * constant-time, over the raw body exactly as received.
 */
export function verifyPlatformWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_PLATFORM_WEBHOOK_SECRET;
  if (!secret) return false;
  try {
    return validateWebhookSignature(rawBody, signature, secret);
  } catch {
    return false;
  }
}
