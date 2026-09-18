// Only NEXT_PUBLIC_* vars are safe to read from client components.
export function isStripeConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function dodoCheckoutMode(): "test" | "live" | null {
  const env = process.env.NEXT_PUBLIC_DODO_PAYMENTS_ENVIRONMENT;
  if (env === "live_mode") return "live";
  if (env === "test_mode") return "test";
  return null;
}

// There is no platform-wide Razorpay key id any more. The key id is still
// not a secret — checkout.js needs it in the browser — but it now belongs to
// the creator being bought from, and reaches the client in the
// /api/razorpay/create-order response rather than from an env var.
//
// Platform billing (creators paying OrangeLink) works the same way: its key
// id comes back from /api/billing/subscribe, not from an env var here.
