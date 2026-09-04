import "server-only";
import { Environment, LogLevel, Paddle, type PaddleOptions } from "@paddle/paddle-node-sdk";

/**
 * Single Paddle SDK instance per process — matches the pattern already used
 * for Dodo/Razorpay (src/lib/dodo/client.ts, src/lib/razorpay/client.ts).
 * Environment is read from NEXT_PUBLIC_PADDLE_ENV, same var the client-side
 * pricing page reads (src/lib/env-client.ts) — one source of truth for
 * which Paddle account (sandbox vs production) the whole app talks to.
 */
export function getPaddleInstance(): Paddle {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error("PADDLE_API_KEY is not set.");
  }

  const env = process.env.NEXT_PUBLIC_PADDLE_ENV;
  if (env !== "sandbox" && env !== "production") {
    throw new Error(
      "NEXT_PUBLIC_PADDLE_ENV must be set to 'sandbox' or 'production' — refusing to default this.",
    );
  }

  const options: PaddleOptions = {
    environment: env === "sandbox" ? Environment.sandbox : Environment.production,
    logLevel: LogLevel.error,
  };

  return new Paddle(apiKey, options);
}
