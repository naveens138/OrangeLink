import { Check } from "lucide-react";

/**
 * Fallback landing page for Dodo's `return_url`.
 *
 * The primary flow never navigates here — CheckoutModal runs the inline
 * checkout with `manualRedirect: true` and polls order status in-page. This
 * page only exists because a checkout session requires a valid return_url,
 * and some payment methods (certain wallet flows) can redirect the full page
 * regardless of that setting.
 */
export default function CheckoutCompletePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
        <Check className="h-5 w-5" />
      </div>
      <h1 className="text-h2 text-text-primary">Payment complete</h1>
      <p className="max-w-sm text-body text-text-secondary">
        You can close this tab and return to the page you were purchasing
        from.
      </p>
    </div>
  );
}
