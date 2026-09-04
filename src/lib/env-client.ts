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

// The key id is not a secret (Razorpay's own checkout.js requires it
// client-side to open the widget) — only RAZORPAY_KEY_SECRET must stay
// server-only, and it never has a NEXT_PUBLIC_ counterpart.
export function razorpayKeyId(): string | null {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null;
}

// Paddle's client-side token, like Razorpay's key id above, is meant to be
// public — Paddle.js requires it in the browser to open checkout/preview
// prices. Scoped to those operations only; never grants account access.
export function paddleClientToken(): string | null {
  return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? null;
}

/**
 * "sandbox" or "production" — deliberately never defaulted. A silent
 * fallback here is the one Paddle mistake that's easy to make invisible:
 * unlike a missing token (checkout just fails to open), a wrong-but-present
 * environment would run real Paddle.js calls against the wrong account
 * without any obvious symptom. Throws instead, so a misconfigured deploy
 * fails loudly at first render rather than quietly.
 */
export function paddleEnvironment(): "sandbox" | "production" {
  const env = process.env.NEXT_PUBLIC_PADDLE_ENV;
  if (env !== "sandbox" && env !== "production") {
    throw new Error(
      "NEXT_PUBLIC_PADDLE_ENV must be set to 'sandbox' or 'production' (got: " +
        JSON.stringify(env) +
        "). Refusing to default this — see .env.local.example.",
    );
  }
  return env;
}
