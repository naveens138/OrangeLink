"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Check, Download, Loader2, Tag } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatProductPrice } from "@/lib/format";
import { dodoCheckoutMode } from "@/lib/env-client";
import {
  getCheckoutOffers,
  getOrderStatus,
  quoteSelection,
  startCheckout,
  type BumpOffer,
} from "@/app/(public)/[username]/p/[productId]/checkout-actions";
import type { CheckoutQuote } from "@/lib/payments/pricing";
import { loadRazorpayCheckoutScript } from "@/lib/razorpay/load-checkout-script";
import { getVisitorId, track } from "@/lib/analytics/client";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHECKOUT_ELEMENT_ID = "dodo-inline-checkout";
// Dodo fulfills via webhook, not the frontend event stream (see the webhook
// handler's comment) — this is only how long we wait for that webhook to
// land before telling the buyer to check back instead of leaving them
// staring at a spinner forever.
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 20; // ~30s

interface Download {
  productName: string;
  url: string;
}

type Stage =
  | { name: "form" }
  | { name: "starting" }
  | { name: "checkout" }
  | { name: "confirming" }
  | { name: "done"; downloads: Download[] }
  | { name: "timeout" }
  | { name: "error"; message: string };

let dodoInitialized = false;

/**
 * Both checkout routes return a list of links, one per digital item. The
 * single `downloadUrl` beside it is the main product's, kept for the older
 * Dodo path that only ever sells one thing.
 */
function toDownloads(
  data: { downloads?: Download[]; downloadUrl?: string | null },
  productName: string,
): Download[] {
  if (Array.isArray(data.downloads) && data.downloads.length > 0) return data.downloads;
  return data.downloadUrl ? [{ productName, url: data.downloadUrl }] : [];
}

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
  const [offers, setOffers] = useState<BumpOffer[]>([]);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  // True while the server is re-pricing. The totals on screen are the old
  // ones until it answers, so they're dimmed and paying is held back rather
  // than letting someone pay against a number that's about to change.
  const [quoting, setQuoting] = useState(false);
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

  // The bumps this creator attached to this product. Fetched when the modal
  // opens rather than with the page, so a visitor who never opens checkout
  // never pays for the query.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getCheckoutOffers(product.id)
      .then((result) => {
        if (!cancelled) setOffers(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, product.id]);

  // Every total on screen is priced on the server. Re-quoted whenever the
  // selection or the applied code changes, so the buyer and the payment
  // routes are always looking at the same arithmetic.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Marking the quote stale is the start of the request this effect is
    // making, not state derivable from a render — the totals on screen stay
    // as they were until the server answers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuoting(true);
    quoteSelection(product.id, selectedBumps, appliedCode)
      .then((result) => {
        if (cancelled) return;
        setQuoting(false);
        if (!result.ok) return;
        setQuote(result.quote);
        // A code that stopped being valid (expired, or claimed by someone
        // else while this modal sat open) is dropped rather than left
        // looking applied against a total that no longer reflects it. The
        // reason stays on screen: dropping the code re-quotes without one,
        // and that second answer has nothing to say about it.
        if (result.quote.couponRejected) {
          setCouponMessage(result.couponMessage);
          setAppliedCode(null);
        } else if (result.quote.coupon) {
          setCouponMessage(null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, product.id, selectedBumps, appliedCode]);

  const subtotalCents = quote?.subtotalCents ?? product.price_cents;
  const discountCents = quote?.discountCents ?? 0;
  const totalCents = quote?.totalCents ?? product.price_cents;
  const payable = totalCents > 0;

  function toggleBump(productId: string) {
    setSelectedBumps((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponMessage(null);
    setAppliedCode(code);
  }

  function removeCoupon() {
    setAppliedCode(null);
    setCouponInput("");
    setCouponMessage(null);
  }

  useEffect(() => {
    if (stage.name !== "confirming") return;
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    const interval = setInterval(async () => {
      pollCountRef.current += 1;
      const result = await getOrderStatus(sessionId);

      if (result.status === "paid") {
        clearInterval(interval);
        setStage({
          name: "done",
          downloads: result.downloadUrl
            ? [{ productName: product.name, url: result.downloadUrl }]
            : [],
        });
        return;
      }
      if (pollCountRef.current >= MAX_POLLS) {
        clearInterval(interval);
        setStage({ name: "timeout" });
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [stage.name, product.name]);

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
    // "Free" is whatever the server priced at zero — a free product, or a
    // code that covered the whole thing.
    if (!payable) {
      await onSubmitFree();
    } else if (useRazorpay) {
      await onSubmitRazorpay();
    } else {
      await onSubmitDodo();
    }
  }

  // Free products skip payment entirely: the email is all it takes.
  async function onSubmitFree() {
    setStage({ name: "starting" });
    try {
      const res = await fetch("/api/checkout/free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          email,
          name: name || email,
          visitorId: getVisitorId(),
          bumpProductIds: selectedBumps,
          couponCode: appliedCode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStage({ name: "done", downloads: toDownloads(data, product.name) });
      } else {
        setStage({ name: "error", message: data.error ?? "Couldn't get this for you." });
      }
    } catch {
      setStage({ name: "error", message: "Couldn't reach OrangeLink. Check your connection." });
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
        bumpProductIds: selectedBumps,
        couponCode: appliedCode,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      // 409 means the code lapsed between quoting and paying. Dropping it
      // re-quotes at full price, so the buyer sees the new total before
      // deciding, rather than being charged a number they never saw.
      if (res.status === 409) {
        setAppliedCode(null);
        setCouponMessage(data.error ?? "That code is no longer valid.");
        setStage({ name: "form" });
        return;
      }
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
            setStage({ name: "done", downloads: toDownloads(verifyData, product.name) });
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
    <Modal open={open} onClose={onClose} title={payable ? "Checkout" : "Get it free"}>
      {stage.name === "done" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-5 w-5" />
          </div>
          <p className="text-h3">You&apos;re in.</p>
          {stage.downloads.length > 0 ? (
            <>
              <p className="text-body text-text-secondary">
                {stage.downloads.length === 1
                  ? "Your download is ready."
                  : "Your downloads are ready."}
              </p>
              <div className="mt-2 flex w-full flex-col items-center gap-2">
                {stage.downloads.map((download) => (
                  <a
                    key={download.url}
                    href={download.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button className="w-full">
                      <Download className="h-4 w-4" />
                      {stage.downloads.length === 1 ? "Download" : download.productName}
                    </Button>
                  </a>
                ))}
              </div>
              <p className="text-small text-text-muted">
                {stage.downloads.length === 1 ? "This link expires" : "These links expire"} in
                48 hours.
              </p>
            </>
          ) : (
            <p className="text-body text-text-secondary">
              {payable ? "Payment received. " : ""}
              {product.name} is on its way.
            </p>
          )}
        </div>
      ) : stage.name === "timeout" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertCircle className="h-8 w-8 text-warning" />
          <p className="text-h3">Still confirming</p>
          <p className="text-body text-text-secondary">
            Your payment is still going through. Check back on this page in a
            minute.
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
              {formatProductPrice(product.price_cents, product.currency)}
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

          {/* Order bumps: the creator's own products offered alongside this
              one. Ticking one re-prices the whole checkout on the server. */}
          {offers.map((offer) => {
            const checked = selectedBumps.includes(offer.productId);
            return (
              <label
                key={offer.productId}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border border-dashed p-3 transition-colors",
                  checked ? "border-accent bg-accent/[0.06]" : "border-border hover:border-text-muted",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleBump(offer.productId)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-body text-text-primary">Add {offer.name}</span>
                    <span className="flex shrink-0 items-baseline gap-1.5 font-mono text-body">
                      {offer.priceCents < offer.listPriceCents && (
                        <s className="text-small text-text-muted">
                          {formatProductPrice(offer.listPriceCents, product.currency)}
                        </s>
                      )}
                      <span className="text-text-primary">
                        {formatProductPrice(offer.priceCents, product.currency)}
                      </span>
                    </span>
                  </span>
                  {offer.description && (
                    <span className="mt-0.5 block text-small text-text-secondary">
                      {offer.description}
                    </span>
                  )}
                </span>
              </label>
            );
          })}

          {/* Coupon. Applying one only sets the code; the discount itself is
              worked out server-side by the quote above. */}
          {appliedCode ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
              <span className="flex items-center gap-1.5 text-small text-text-secondary">
                <Tag className="h-3.5 w-3.5" />
                <span className="font-mono text-text-primary">{appliedCode}</span> applied
              </span>
              <button
                type="button"
                onClick={removeCoupon}
                className="text-small text-text-muted underline underline-offset-2 hover:text-text-primary"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label="Discount code" hint="Optional">
                  {(props) => (
                    <Input
                      {...props}
                      placeholder="SAVE10"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        setCouponMessage(null);
                      }}
                      onKeyDown={(e) => {
                        // Enter here applies the code; it must not submit
                        // the form and start a payment.
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyCoupon();
                        }
                      }}
                    />
                  )}
                </Field>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={applyCoupon}
                disabled={!couponInput.trim()}
              >
                Apply
              </Button>
            </div>
          )}

          {couponMessage && (
            <p className="flex items-center gap-1.5 text-small text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              {couponMessage}
            </p>
          )}

          {stage.name === "error" && (
            <p className="flex items-center gap-1.5 text-small text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              {stage.message}
            </p>
          )}

          <div
            className={cn(
              "flex flex-col gap-2 border-t border-border pt-4 transition-opacity",
              quoting && "opacity-50",
            )}
          >
            {discountCents > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-small text-text-secondary">Subtotal</span>
                  <span className="font-mono text-small text-text-secondary">
                    {formatProductPrice(subtotalCents, product.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-small text-text-secondary">
                    Discount{quote?.coupon ? ` (${quote.coupon.code})` : ""}
                  </span>
                  <span className="font-mono text-small text-success">
                    −{formatProductPrice(discountCents, product.currency)}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-body text-text-secondary">Total</span>
              <span className="font-mono text-h3">
                {formatProductPrice(totalCents, product.currency)}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={stage.name === "starting" || quoting}
            className="w-full"
          >
            {stage.name === "starting"
              ? payable
                ? "Starting checkout…"
                : "Getting it…"
              : payable
                ? "Continue to payment"
                : "Get it free"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
