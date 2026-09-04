import "server-only";
import Razorpay from "razorpay";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";

export function createRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET unset).");
  }
  return new Razorpay({ key_id, key_secret });
}

/**
 * Verifies the HMAC-SHA256(order_id + "|" + payment_id, key_secret) signature
 * Razorpay's checkout returns after a Standard Checkout payment.
 *
 * Uses the SDK's own utility rather than a hand-rolled crypto.createHmac
 * comparison — it does the same computation but with a constant-time
 * compare, and re-implementing it risks a subtle timing side-channel or a
 * "|" vs "-" separator typo that only breaks in production.
 */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) return false;
  return validatePaymentVerification(
    { order_id: params.orderId, payment_id: params.paymentId },
    params.signature,
    key_secret,
  );
}
