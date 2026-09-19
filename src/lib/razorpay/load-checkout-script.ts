// Razorpay's checkout.js is a plain script that attaches window.Razorpay —
// there's no ESM package for the browser widget itself (only the Node SDK,
// which is server-only). Loaded on demand rather than in the app shell since
// most visitors never open a checkout modal.

export interface RazorpayCheckoutOptions {
  key: string;
  /** Set for a one-off order; a subscription takes its amount from the plan. */
  amount?: number | string;
  currency?: string;
  name: string;
  description?: string;
  /** A storefront purchase: the creator's own order. */
  order_id?: string;
  /** A platform plan subscription. Mutually exclusive with order_id. */
  subscription_id?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id?: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    /** Returned in place of the order id when checkout was opened for a subscription. */
    razorpay_subscription_id?: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: { error: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay checkout can only load in the browser."));
  }
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load the payment provider's script."));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}
