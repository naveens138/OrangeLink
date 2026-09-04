import "server-only";
import DodoPayments from "dodopayments";

/**
 * Server-only Dodo Payments client. `bearerToken` and `environment` are read
 * explicitly rather than left to the SDK's own env-var fallback, so a missing
 * key fails at the call site with a clear message instead of the SDK's
 * generic "no auth" error.
 */
export function createDodoClient() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DODO_PAYMENTS_API_KEY is not set — payments are not configured.",
    );
  }
  return new DodoPayments({
    bearerToken: apiKey,
    environment:
      process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
        ? "live_mode"
        : "test_mode",
  });
}
