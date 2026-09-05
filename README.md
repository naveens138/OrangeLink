# OrangeLink

Creator "operating system" — one public page (link-in-bio + storefront + portfolio) backed by a dashboard. Spec lives in [`BUILD_BRIEF.md`](./BUILD_BRIEF.md), [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md), and [`schema.sql`](./schema.sql).

## Status

**Milestones 0–5 are built and running against a real Supabase database.** Nothing runs on mock data any more.

- **Milestone 0** — design tokens (dark + light), theme provider, core primitives, responsive dashboard shell
- **Milestone 1** — Supabase auth (signup / login / logout), username claim, session gate, public page route
- **Milestone 2** — drag-and-drop block editor persisting to Postgres, all block types, curated theme presets, block scheduling, per-block password protection. Extended with: an optional tabbed "Links"/"Shop" public page view (page-level toggle, only shown when a page has both block kinds); rich link cards with auto-fetched title/image/description (reuses Milestone 3's import pipeline) plus an optional badge/discount-code overlay; and honor-system "follow to unlock" gated blocks (Instagram/TikTok), which unlock client-side on CTA click and log a `follow_unlock_clicked` analytics event since no platform API can verify an actual follow — see `PROGRESS.md`.
- **Milestone 3** — import from any link-in-bio tool (see below)
- **Milestone 4** — product CRUD, digital file upload (private Storage bucket, signed download URLs), and in-page checkout via **two** payment providers (see below). A real card payment has now gone through end-to-end via Razorpay. Order bumps and coupon codes are not built yet.
- **Milestone 5** — email capture block writes to `email_subscribers` for real; ESP sync for Kit (ConvertKit), Beehiiv, and MailerLite, with API keys stored in Supabase Vault (not a plaintext column) behind `SECURITY DEFINER` wrappers scoped to `service_role`/the owning creator. ESP sync is now verified end-to-end against a real Kit (ConvertKit) account — a page-captured subscriber confirmed landing in the live list — see `PROGRESS.md`.
- **Milestone 6** — anonymous visitor tracking (`localStorage` id, no cookie banner needed) feeding a real event stream (`page_view` / `block_click` / `product_view` / `checkout_start` / `checkout_complete`) through a public `/api/track` route; first-touch UTM attribution denormalized onto `orders` at checkout time; a funnel + by-source dashboard at `/dashboard/analytics` (the Overview page's stat cards now read real numbers too); pixel embed settings for Meta Pixel / GA4 / TikTok Pixel injected into the public page. Verified for real end-to-end (see `PROGRESS.md`) except the actual completed-payment step, which — like Milestone 4's card entry — sits behind Razorpay's PCI-isolated iframe that browser automation can't reach.

Milestones 7–10 (comment-to-DM automation, media kit, Calendly, polish) are styled placeholders that name the milestone that fills them in.

### Platform billing (Paddle) — not a BUILD_BRIEF milestone, currently paused and unrouted

`src/app/_pricing/` (renamed from `pricing/` — Next.js's underscore convention excludes a folder from the App Router entirely) holds a built Starter/Pro/Advanced subscription pricing page where **creators pay OrangeLink** for the platform itself, via [Paddle](https://www.paddle.com) (Paddle Billing, sandbox). This is the opposite money direction from the "Payments" section below, which is a creator's *own* storefront selling to *their* buyers — the two are deliberately kept on separate tables (`paddle_customers`/`paddle_subscriptions` vs. `customers`/`orders`). Country-localized prices and a monthly/yearly toggle via `Paddle.PricePreview()`, checkout via `Paddle.Checkout.open()`, subscription state mirrored into Postgres by a signature-verified webhook at `/api/webhooks/paddle`. Real sandbox catalog (3 products, 6 prices, 7-day trial, GB/IE/AU price overrides) and the webhook's verify-and-write path are both confirmed working against real data — see `PROGRESS.md`. Paddle does **not** support marketplace/split payouts to creators (confirmed against real docs) — irrelevant here since this is platform billing, not a creator storefront, but worth knowing if that question ever comes up again.

**Unrouted, not deleted**, since going live meant either finishing Paddle env var setup for a half-configured page or hiding it — the user chose to hide it (deliberate decision, see `PROGRESS.md`) until payment-provider strategy for subscriptions is settled. Restoring it is a folder rename back to `pricing/`.

See [`PROGRESS.md`](./PROGRESS.md) for the detailed, dated session-by-session log — what was verified, what wasn't, and what to pick up next.

> **Design note:** the current UI is functional, not final. It will be replaced once Figma designs land.

## Getting started

```bash
npm install
npm run dev
```

Requires `.env.local` (see below). Sign in to the seeded demo account with **jane@example.com** / **OrangeLinkDemo123!**, or visit [/jane](http://localhost:3000/jane) for the public page.

## Deployment

**Live**: https://orangelink-six.vercel.app (Vercel project `naveens138/orangelink`), deployed via the Vercel CLI. Not yet connected to GitHub for continuous deployment — the repo hasn't been pushed to `origin` yet, so shipping a change means `vercel --prod` by hand until that's set up (`vercel git connect` once the push happens). Razorpay's webhook (`/api/webhooks/razorpay`) is registered against the live URL and verified working — see `PROGRESS.md` for the full setup log, including a real Razorpay API gotcha (webhook `events` must be an object of `{eventName: true}`, not an array of strings, despite what several online examples show).

## Environment

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Where from | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | everything |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same | everything |
| `SUPABASE_SERVICE_ROLE_KEY` | same (secret) | public page reads, username checks |
| `DATABASE_URL` | Settings → Database → URI | `scripts/` only — migrations and seeding |
| `DODO_PAYMENTS_*` | Dodo Dashboard → Developer | checkout — **pending account verification, ~72h as of 2026-09-02** |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Dashboard → Settings → API Keys | checkout — **set, this is the working provider right now** |
| `PADDLE_API_KEY` / `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` / `NEXT_PUBLIC_PADDLE_ENV` / `PADDLE_NOTIFICATION_WEBHOOK_SECRET` | Paddle Dashboard → Developer Tools | platform billing (sandbox), currently unrouted — see "Platform billing" above. Not needed in production while `/pricing` is hidden. |
| `RESEND_API_KEY` | Resend dashboard | Milestone 4 (receipts) — **not yet set** |
| `ANTHROPIC_API_KEY` | console.anthropic.com | optional — AI title cleanup on import |

`.env.local` is gitignored. The service-role key and `DATABASE_URL` bypass Row Level Security — they are used only in server code and `scripts/`, never shipped to the browser.

## Database

```bash
node scripts/apply-schema.mjs   # creates the 23 tables from schema.sql
node scripts/migrate.mjs        # applies migrations/*.sql (tracked in schema_migrations)
node scripts/seed.mjs           # demo creator, page, products, blocks (idempotent)
```

Verification helpers: `scripts/check-rls.mjs` (RLS status per table) and `scripts/verify-anon-lockdown.mjs` (asserts the public anon key can't read anything it shouldn't).

### Security notes

- `schema.sql` enables RLS on 10 of 23 tables. Because PostgREST exposes every table in `public` and the anon key ships to browsers, the other 13 — including `connected_accounts.access_token`, `esp_integrations.api_key_encrypted`, `order_items`, and `deliveries.signed_url` — were world-readable and world-writable. [`migrations/0001_harden_rls.sql`](./migrations/0001_harden_rls.sql) enables deny-by-default RLS on all of them.
- Block passwords are stored as bcrypt hashes and never leave the database. The editor sets them through `set_block_password`, and the public page checks attempts through `verify_block_password` — the browser only ever learns whether one attempt was correct.
- Public storefront reads use the service role filtered to `published = true` (per `BUILD_BRIEF.md` §5) rather than opening these tables to the anon key.
- Still outstanding per the brief: `connected_accounts` / `esp_integrations` store tokens in plaintext columns. They should move to Supabase Vault or app-level encryption before those integrations ship (Milestones 5 and 7).

## Import (Milestone 3)

Works on **any** link-in-bio page, not a fixed list. `src/lib/import/`:

1. **Generic extraction** tries three strategies best-first — embedded hydration JSON (`__NEXT_DATA__`, `__NUXT__`, RSC `__next_f` streams, `window.__INITIAL_STATE__`), then JSON-LD, then anchors. Reading the hydration blob beats scraping markup: it survives redesigns and carries ordering plus hidden flags the DOM never shows.
2. **Platform refiners** run *instead of* the generic pass for known domains (Linktree, Stan, Beacons, Lnk.Bio, Campsite, Milkshake, Direct.me, Shorby, Koji). Each falls back to generic if the expected shape is missing, so a redesign degrades instead of breaking.
3. **Normalization** to `parsed_blocks` — strips tracking params, folds bare social profiles into one `social_icons` block, flags duplicates and placeholder URLs.
4. **AI cleanup** (optional) tidies titles and categorises links in one batched call, `claude-haiku-4-5` — cheap and fast, the right tier for short label tidying (override with `IMPORT_CLEANUP_MODEL`). Off without `ANTHROPIC_API_KEY`; also degrades cleanly on a live key with no credits, a rejected key, or a rate limit — import still works, titles arrive as scraped, and the review screen names the specific reason (e.g. *"the Anthropic account is out of credits"*).
5. **Manual paste** fallback when nothing usable is found — with a key the model structures the text, without one a line-scan pulls out URLs and same-line titles.

Nothing is written until the creator confirms. Imports **append** (never overwrite), and the created block ids are returned so the whole import undoes in one click.

### Security

The scraper fetches arbitrary user-supplied URLs from our server, which is an SSRF surface. [`safe-url.ts`](./src/lib/import/safe-url.ts) resolves each host and refuses private address space — loopback, RFC1918, CGNAT, link-local (including the `169.254.169.254` cloud-metadata endpoint), and their IPv6 equivalents including IPv4-mapped and NAT64 forms — plus non-http(s) schemes. Every redirect hop is re-validated, since a public URL redirecting to a private one is the standard bypass. Requests are capped at 2 MB and 10s.

Known residual risk: DNS rebinding between the check and the connection. Closing it needs the socket pinned to the validated IP via a custom undici dispatcher — worth doing if this ever runs on a schedule or over untrusted bulk input.

```bash
npx tsx scripts/test-ssrf-guard.mjs   # 26 SSRF cases
npx tsx scripts/test-extract.mjs      # extraction strategies + normalization
```

## Payments (Milestone 4)

**Razorpay is the only payment provider going forward (user decision).** Dodo Payments and the Paddle platform-billing work (`/pricing`, `src/lib/paddle/`) are paused, not removed — their code, tables, and env vars are left exactly as they were, just not being built on. `BUILD_BRIEF.md` §4 names Stripe; Dodo was the original substitute before this decision.

- **Razorpay** — [`src/lib/razorpay/`](./src/lib/razorpay/), Standard Checkout (`checkout.js` overlay), fulfilling through the shared [`src/lib/payments/fulfill-order.ts`](./src/lib/payments/fulfill-order.ts) into `orders` / `order_items` / `customers` / `deliveries`. Two independent, idempotent confirmation paths, both re-fetching the order from Razorpay's own API rather than trusting anything client-supplied:
  - `/api/razorpay/create-order` creates the order (product/creator/buyer in Razorpay's own `notes`); `/api/razorpay/verify-payment` verifies the HMAC signature (Razorpay's own `validatePaymentVerification`, not hand-rolled) synchronously from the browser's checkout.js callback and fulfills in the same response — the buyer's download link comes back immediately.
  - [`/api/webhooks/razorpay`](./src/app/api/webhooks/razorpay/route.ts) is the server-to-server safety net for when that callback never fires (closed tab, network drop, JS error): verifies `X-Razorpay-Signature` (HMAC over the **raw** body — re-serializing an already-parsed body produces a different signature, a real footgun Razorpay's own docs example doesn't avoid) on `payment.captured`, then calls the same `fulfillOrder()`. Both paths share one idempotency key (`orders.provider_payment_id`'s unique index), so whichever arrives first wins and the other is a no-op.
  - Verified against the real test-mode API, including the webhook: a genuinely-signed payload fulfilled correctly, a forged signature was rejected, and a duplicate genuine payload didn't double-fulfill, for both the checkout-callback path and the webhook path independently. A real card payment through the hosted iframe has been confirmed once, live (see `PROGRESS.md`); the webhook itself isn't registered with Razorpay yet — it needs a public URL (Razorpay rejects `localhost` at registration) — so real Razorpay-initiated deliveries aren't proven yet, only the handler's own verify-and-write logic (self-signed synthetic payload) is.
- **Razorpay Route** (marketplace split payouts to creators) — investigated, **not viable right now**: requires ₹40 lakh domestic (or ₹5 lakh export) turnover in the current/prior fiscal year that OrangeLink hasn't cleared, linked accounts are shaped for registered businesses rather than individual creators, and — the deciding factor regardless of the other two — linked accounts are only available in India and Malaysia, ruling it out for a global creator base. See `PROGRESS.md` for the full sourcing.
- **Manual payout tracking** — [`/admin/payouts`](./src/app/admin/payouts/page.tsx), the fallback since Route isn't viable: a `payouts` ledger and a `creator_payout_balances` view (gross sales minus platform fee minus what's already been paid out), gated by a minimal `ADMIN_EMAILS` allowlist (there's no admin/role system elsewhere in this app — introduced just enough for this, not a full RBAC build). Recording a payout here doesn't send money; the transfer happens by real bank transfer outside the app, this just logs that it happened. Verified for real in the browser, including both branches of the admin gate — see `PROGRESS.md`.
- **International payment acceptance** — not enabled by default: a self-serve dashboard request (Payment Methods → International Payments → Request), ~5 business day review, no IEC needed for a digital-products business. Needed the standard website policy pages first (About/Contact/Shipping/Refund/Terms/Privacy — added, see below). **Request submitted** — now in Razorpay's review queue.

## Notes

- **Policy pages** (`/about`, `/contact`, `/shipping-policy`, `/refund-policy`, `/terms`, `/privacy`) exist to unblock requesting Razorpay international payment activation, which requires them — request has since been submitted. Shipping Policy is written for a digital-only business (no physical shipping) rather than left as a literal shipping page.
- **Google OAuth** is wired up (`GoogleButton` → Supabase → [`/auth/callback`](./src/app/auth/callback/route.ts) PKCE exchange) but only works once the provider is enabled in the Supabase dashboard. Two separate allowlists are involved, which is the usual source of confusion:
  - **Google Cloud Console → Authorized redirect URIs**: `https://<project-ref>.supabase.co/auth/v1/callback` — Supabase's URL, never the app's.
  - **Supabase → Authentication → URL Configuration → Redirect URLs**: `http://localhost:3000/**` (plus the production domain) — this is what authorizes the final hop to `/auth/callback`.

  The Google client ID and secret live only in the Supabase dashboard; the app never sees them, so they are not in `.env.local`.
- Next 16 renamed the `middleware` convention to `proxy` — session refresh lives in [`src/proxy.ts`](./src/proxy.ts).

## What's next

Registering the Razorpay webhook once there's a public URL, or Milestone 7 (comment-to-DM automation). The international payments request is submitted and just needs Razorpay's review now — nothing to do there. Dodo and Paddle are paused, not next. See `PROGRESS.md` for the full detail.
