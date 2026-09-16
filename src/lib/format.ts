export function formatPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * `date.toLocaleDateString()` with no arguments reads the *runtime's*
 * locale and timezone — different between the server (wherever Node is
 * actually running) and the browser, which produces a different string on
 * each and a hydration mismatch the moment this appears in SSR'd JSX. Both
 * are pinned explicitly here for exactly the reason formatPrice already
 * pins its locale: same input always produces the same output everywhere.
 */
export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** A product's price as shown to buyers: "Free" at 0, otherwise formatPrice. */
export function formatProductPrice(cents: number, currency = "USD") {
  return cents === 0 ? "Free" : formatPrice(cents, currency);
}
