"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Check, Download, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { dodoCheckoutMode } from "@/lib/env-client";
import { getOrderStatus, startCheckout } from "@/app/(public)/[username]/p/[productId]/checkout-actions";
import { loadRazorpayCheckoutScript } from "@/lib/razorpay/load-checkout-script";
import { getVisitorId, track } from "@/lib/analytics/client";
import type { Product } from "@/lib/types";

const CHECKOUT_ELEMENT_ID = "dodo-inline-checkout";
// Dodo fulfills via webhook, not the frontend event stream (see the webhook
// handler's comment) — this is only how long we wait for that webhook to
// land before telling the buyer to check back instead of leaving them
// staring at a spinner forever.
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 20; // ~30s

type Stage =
  | { name: "form" }
  | { name: "starting" }
  | { name: "checkout" }
  | { name: "confirming" }
  | { name: "done"; downloadUrl: string | null }
  | { name: "timeout" }
  | { name: "error"; message: string };

let dodoInitialized = false;

export function CheckoutModal({
  product,
  username,
  open,
  onClose,
}: {
  product: Product;
  username: string;
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [stage, setStage] = useState<Stage>({ name: "form" });
  const sessionIdRef = useRef<string | null>(null);
  const pollCountRef = useRef(0);

  // Only picks which SDK mode ('test'/'live') to initialize with — it is NOT
  // a signal that checkout actually works. The API key that determines that
  // is a server-only secret this component can never see, so "is Dodo
  // configured" is answered honestly by attempting startCheckout() and
  // showing whatever it returns, not by guessing from a public env var.
  const mode = dodoCheckoutMode();

  // Reset for a fresh attempt each time the modal reopens. This component
  // itself never unmounts (only Modal's portal content does), so there is no
  // prop this could instead be derived from at render time — "open" flipping
  // true is an external re-trigger, the same category as the theme-provider
  // mount sync elsewhere in this codebase.
  useEffect(() => {
    if (open) {
      sessionIdRef.current = null;
      pollCountRef.current = 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage({ name: "form" });
    }
  }, [open]);

  useEffect(() => {
    if (stage.name !== "confirming") return;
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    const interval = setInterval(async () => {
      pollCountRef.current += 1;
      const result = await getOrderStatus(sessionId);

      if (result.status === "paid") {
        clearInterval(interval);
        setStage({ name: "done", downloadUrl: result.downloadUrl });
        return;
      }
      if (pollCountRef.current >= MAX_POLLS) {
        clearInterval(interval);
        setStage({ name: "timeout" });
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [stage.name]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    track({ username, eventType: "checkout_start", productId: product.id });

    // Razorpay is preferred when configured: its signature verification is
    // synchronous, so the buyer gets a definitive result (and their download
    // link) in one round trip instead of the polling Dodo's async webhook
    // requires. Both are real, working providers — this is a same-page
    // choice of which one actually has credentials right now, not a
    // fallback-on-failure.
    // Payments are per-creator Razorpay now (migrations/0011): whether
    // checkout works is a property of the creator's own connected account,
    // not of a platform env var, and create-order answers that honestly.
    // The Dodo path below predates that and was never per-creator, so it is
    // no longer routed to — kept intact because Dodo is paused, not dropped.
    const useRazorpay: boolean = true;
    if (useRazorpay) {
      await onSubmitRazorpay();
    } else {
      await onSubmitDodo();
    }
  }

  async function onSubmitRazorpay() {
    setStage({ name: "starting" });

    const res = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        email,
        name: name || email,
        visitorId: getVisitorId(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStage({ name: "error", message: data.error ?? "Couldn't start checkout." });
      return;
    }

    try {
      await loadRazorpayCheckoutScript();
    } catch (e) {
      setStage({
        name: "error",
        message: e instanceof Error ? e.message : "Couldn't load checkout.",
      });
      return;
    }

    if (!window.Razorpay) {
      setStage({ name: "error", message: "Payment provider failed to load." });
      return;
    }

    const rzp = new window.Razorpay({
      // The creator's own publishable key, returned by create-order — the
      // payment is taken on their Razorpay account, not the platform's.
      key: data.key_id,
      amount: data.amount,
      currency: data.currency,
      name: "OrangeLink",
      description: product.name,
      order_id: data.order_id,
      prefill: { name: name || undefined, email },
      // Razorpay's widget renders in its own overlay and can't read our CSS
      // custom properties — this is the light-mode accent hex from
      // DESIGN_SYSTEM.md §2, the closest we can hand it.
      theme: { color: "#F45100" },
      handler: async (response) => {
        setStage({ name: "confirming" });
        try {
          const verifyRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // productId tells the server which creator's account to verify
            // the signature against; it grants nothing on its own.
            body: JSON.stringify({ ...response, productId: product.id }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.ok) {
            setStage({ name: "done", downloadUrl: verifyData.downloadUrl ?? null });
          } else {
            setStage({
              name: "error",
              message:
                verifyData.error ??
                "Payment verification failed. If you were charged, contact support.",
            });
          }
        } catch {
          setStage({
            name: "error",
            message: "Couldn't confirm payment. If you were charged, contact support.",
          });
        }
      },
      modal: {
        // The buyer closed the widget without paying — a normal outcome,
        // not an error, so this returns them to the form rather than
        // showing a scary red message.
        ondismiss: () => setStage({ name: "form" }),
      },
    });

    rzp.on("payment.failed", (resp) => {
      setStage({
        name: "error",
        message: resp.error?.description ?? "Payment failed. No charge was made.",
      });
    });

    rzp.open();
  }

  async function onSubmitDodo() {
    setStage({ name: "starting" });

    const result = await startCheckout(product.id, email, name || email, getVisitorId());
    if (!result.ok) {
      setStage({ name: "error", message: result.error });
      return;
    }
    sessionIdRef.current = result.sessionId;
    setStage({ name: "checkout" });

    const { DodoPayments } = await import("dodopayments-checkout");

    if (!dodoInitialized) {
      DodoPayments.Initialize({
        mode: mode ?? "test",
        displayType: "inline",
        onEvent: (event) => {
          if (event.event_type === "checkout.redirect_requested") {
            setStage({ name: "confirming" });
          }
          if (event.event_type === "checkout.error") {
            setStage({
              name: "error",
              message: "Something went wrong during payment. No charge was made.",
            });
          }
        },
      });
      dodoInitialized = true;
    }

    // Mounting needs the target div in the DOM, which only exists once the
    // "checkout" stage above has rendered — deferred to the next tick.
    setTimeout(() => {
      DodoPayments.Checkout.open({
        checkoutUrl: result.checkoutUrl,
        elementId: CHECKOUT_ELEMENT_ID,
        options: { manualRedirect: true, showSecurityBadge: true },
      });
    }, 0);
  }

  return (
    <Modal open={open} onClose={onClose} title="Checkout">
      {stage.name === "done" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-5 w-5" />
          </div>
          <p className="text-h3">You&apos;re in.</p>
          {stage.downloadUrl ? (
            <>
              <p className="text-body text-text-secondary">
                Your download is ready.
              </p>
              <a href={stage.downloadUrl} target="_blank" rel="noopener noreferrer">
                <Button className="mt-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
              <p className="text-small text-text-muted">
                This link expires in 48 hours.
              </p>
            </>
          ) : (
            <p className="text-body text-text-secondary">
              Payment received. {product.name} is on its way.
            </p>
          )}
        </div>
      ) : stage.name === "timeout" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertCircle className="h-8 w-8 text-warning" />
          <p className="text-h3">Still confirming</p>
          <p className="text-body text-text-secondary">
            Your payment is being processed. If it went through, it&apos;ll
            finish shortly. Check back on this page.
          </p>
        </div>
      ) : stage.name === "confirming" ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <p className="text-body text-text-secondary">Confirming your payment…</p>
        </div>
      ) : stage.name === "checkout" ? (
        <div id={CHECKOUT_ELEMENT_ID} className="min-h-[420px] w-full" />
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-3">
            <div className="h-12 w-12 shrink-0 rounded-md bg-surface-3" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body text-text-primary">{product.name}</p>
            </div>
            <p className="font-mono text-body text-text-primary">
              {formatPrice(product.price_cents, product.currency)}
            </p>
          </div>

          <Field label="Email">
            {(props) => (
              <Input
                {...props}
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label="Name" hint="Optional">
            {(props) => (
              <Input
                {...props}
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>

          {stage.name === "error" && (
            <p className="flex items-center gap-1.5 text-small text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              {stage.message}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-body text-text-secondary">Total</span>
            <span className="font-mono text-h3">
              {formatPrice(product.price_cents, product.currency)}
            </span>
          </div>

          <Button
            type="submit"
            disabled={stage.name === "starting"}
            className="w-full"
          >
            {stage.name === "starting" ? "Starting checkout…" : "Continue to payment"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
