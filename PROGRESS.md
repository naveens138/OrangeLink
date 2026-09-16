# Session handoff

Running log of where things stand between sessions. Newest entry first.

---

## 2026-09-05 (later) — Razorpay switched to live mode; international payments now accepted for real

Razorpay approved the international payments application (user confirmed
directly, submitted outside this session). Since Razorpay is now the sole
payment provider going forward (Paddle/Dodo remain paused, unrouted, no
production env vars), the one remaining payments task was making
production actually charge real cards instead of running in test mode.

**What changed:**
- Registered a **live-mode** Razorpay webhook (id `TYPplPKed31qUF`,
  `service: "api-live"`) via a direct POST to `/v1/webhooks` using the live
  key_id/secret — webhooks are scoped per mode, so the existing test-mode
  webhook (`TXsejV0SPg9oGJ`) doesn't cover live traffic and a separate one
  was required. Subscribed to the same two events as before:
  `payment.captured`, `payment.failed`.
- User rotated Vercel's production env vars themselves (`vercel env rm`/
  `add` for `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
  `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET`) from the
  test-mode values to the live ones already sitting in `.env.local`
  (`RAZORPAY_LIVE_KEY_ID`/`RAZORPAY_LIVE_KEY_SECRET`), then redeployed —
  this session's own attempts at both `vercel env rm/add` and
  `vercel env pull` against production were blocked by the auto-mode
  safety classifier (rotating live payment credentials), so the commands
  were handed to the user to run instead rather than working around the
  block.
- No app code changes needed — `src/lib/razorpay/client.ts` and every
  Razorpay route already read `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/
  `RAZORPAY_WEBHOOK_SECRET` generically; swapping the underlying secret
  values was sufficient.

**Verified for real, without spending any money:** created a genuine
order via the live production endpoint
(`POST /api/razorpay/create-order` against `orangelink-six.vercel.app`,
real published USD product) and confirmed it via the live Razorpay API
(`orders.fetch`) — `order_TYQgjzaEnze2lx`, `status: "created"`,
`amount_paid: 0`, visible only under the live key, not the test one. This
proves both that production is genuinely authenticating with live
credentials (a stale/wrong secret would 401) and that international/
multi-currency acceptance (USD, not just INR) actually works end-to-end,
not just that the application was approved.

**Not done / left as-is:** no real end-to-end payment (browser checkout →
card capture → webhook fulfillment) has been run in live mode — Razorpay's
checkout iframe is PCI-isolated the same way it was in test mode (see the
Milestone 4/6 entries below), and actually spending real money isn't
something this session will do. The user should run one small real
purchase themselves to confirm the full live flow before treating this as
fully proven. Razorpay Route, Paddle, and Dodo are all still exactly where
prior entries left them — nothing about this change reopens any of those.

---

## 2026-09-05 — Block editor: tabbed Links/Shop view, rich link cards, follow-to-unlock blocks

Three additions on top of the Milestone 2 block editor, inspired by the
Linktr.ee/mojobike pattern of a tabbed link-in-bio page (not their branding
or exact layout — see `DESIGN_SYSTEM.md` §0 on adapting vs. copying).

**1. Tabbed public page (`Links`/`Shop`).** New `pages.theme.tabbed_view`
boolean, toggled from a checkbox in the block editor's "Page theme" modal
(`src/components/editor/block-editor.tsx`). `src/components/public/public-page-view.tsx`
splits visible blocks into product blocks ("Shop", rendered as a 2-column
grid) and everything else ("Links", single column) — the pill tab switcher
only renders when the creator has both `tabbed_view` on *and* at least one
block of each kind; a single-section page always falls back to one
continuous scroll, no dead/disabled tab ever shown. Documented as a
reusable pattern in `DESIGN_SYSTEM.md` §8b.

**2. Rich link cards with auto-fetched metadata.** Pasting a URL into a
link block's URL field (or clicking "Fetch title, image & description" in
`block-inspector.tsx`) calls the new `fetchLinkPreview` action
(`src/app/(dashboard)/dashboard/links/actions.ts`), which wraps
`src/lib/import/link-metadata.ts` — this reuses Milestone 3's existing
`safeFetchPage`/`extractProfile` SSRF-guarded fetch-and-extract pipeline
rather than a second implementation. Only non-empty fetched fields
overwrite the form, so a creator's manual edits or an already-set badge
survive a re-fetch. `link-block.tsx` renders an image+title+description
card when `config.image` is present, with an optional short `badge` text
overlay (e.g. a discount code), falling back to the original plain pill
otherwise. `product-block.tsx` was redesigned from a horizontal row to a
vertical card so it also works in the new 2-column Shop grid.

**3. Follow-to-unlock gated blocks.** New `config.unlock_condition` on any
block (`{ type: 'follow_instagram' | 'follow_tiktok', url, label? }`, set
via a new "Unlock condition" section in `block-inspector.tsx`). No
platform exposes an API to verify an actual follow, so
`src/components/blocks/follow-unlock-gate.tsx` is an explicit honor-system
gate — clicking the CTA opens the creator's profile in a new tab and
unlocks the block immediately, client-side only (session/render-only
state, no persistence across reloads). A `follow_unlock_clicked` analytics
event still fires on click so the creator can see engagement despite no
real verification. Nested inside the existing `PasswordGate` in
`block-renderer.tsx` (password gate outermost, follow-unlock innermost) so
a block can require both. New locked-block visual pattern documented in
`DESIGN_SYSTEM.md` §8b, matching `PasswordGate`'s bordered-pill-with-icon
language.

**Schema:** `migrations/0010_link_cards_and_gating.sql` widens the
`analytics_events.event_type` CHECK constraint to allow
`follow_unlock_clicked`; both new config shapes live in existing `jsonb`
columns (`pages.theme`, `blocks.config`), no new columns or tables.
`schema.sql` comments updated to match (note: `schema.sql` had already
drifted from migrations 0007–0009 before this session — only this
session's own additions were kept in sync, the pre-existing drift is
unaddressed).

**Verified in the browser**, not just `tsc`/`eslint`/`build`: logged into
the seeded demo creator (`jane@example.com`, see `scripts/seed.mjs`),
exercised all three features live against `/jane` — metadata fetch pulled
YouTube's real og:title/description/image, the tab switcher and 2-column
Shop grid rendered, the follow-unlock CTA unlocked client-side and the
`follow_unlock_clicked` row landed in `analytics_events` with the correct
`creator_id`/`block_id`. Demo account's blocks/theme were reset back to
their original `scripts/seed.mjs` values afterward (direct admin-client
update — `scripts/seed.mjs` itself couldn't re-run cleanly because later
milestones added FK references to the demo creator that block its
delete-and-reinsert step; that's pre-existing, not something this session
introduced).

---

## 2026-09-04 (later still) — Google OAuth on production: Supabase Site URL gotcha

User tried "Continue with Google" on the live site and landed on
`localhost:3000/?code=...` — a real failure, not a false alarm. Root cause
wasn't the app code (`GoogleButton`/`auth/callback` both correctly derive
the redirect from `window.location.origin`/forwarded headers, confirmed by
reading them again) — it was Supabase's own Auth **Site URL**, still set
to `http://localhost:3000` from local dev. When the actual redirect
target isn't in Supabase's allowed list, it silently falls back to Site
URL instead of erroring, which is what produced the exact symptom.

**Fix (user did this, dashboard-only, I don't have Supabase
management-API access):** Authentication → URL Configuration → set
**Site URL** to `https://orangelink-six.vercel.app`, add
`https://orangelink-six.vercel.app/**` to **Redirect URLs** alongside the
existing `http://localhost:3000/**`. Confirmed fixed — user reported
Google sign-in working on production afterward.

**If this resurfaces on a future domain change** (custom domain, etc.):
update both Site URL and Redirect URLs in Supabase again — this is a
per-environment dashboard setting, nothing in the repo tracks or enforces
it, and there's no code-level fallback for it.

---

## 2026-09-04 (later) — Live on Vercel; Razorpay webhook registered and verified against production

**OrangeLink is live**: https://orangelink-six.vercel.app (Vercel project
`naveens138/orangelink`). Deployed via the Vercel CLI directly (`vercel
--prod`), not yet via GitHub integration — `git ls-remote origin` still
returns nothing as of this entry, so the manual `git push` from the
previous entry still hasn't happened. This deploy will NOT auto-update on
future commits until either that push happens and `vercel git connect` is
run, or someone runs `vercel --prod` again by hand.

### What got set up

- Installed the Vercel CLI (`npm install --global vercel@latest`) and
  authenticated via device-code OAuth
  (`vercel.com/oauth/device?user_code=...`) — the user approved it in
  their own browser; no credentials touched this session at any point.
- Linked/created the Vercel project with an explicit lowercase name
  (`vercel link --project orangelink`) — the default derived from the
  directory name (`OrangeLink`) was rejected for containing uppercase
  letters.
- Set all 9 required production env vars via `vercel env add ... --value
  "..." --yes` (config type for public values, `secret` type for
  `SUPABASE_SERVICE_ROLE_KEY`/`RAZORPAY_KEY_SECRET`/
  `RAZORPAY_WEBHOOK_SECRET` — note the CLI's flag is `--type secret`, not
  `--type sensitive` as one might guess or as older docs suggest).
- Deployed, then had to fix `NEXT_PUBLIC_SITE_URL` (initially set to a
  guessed `orangelink.vercel.app`, which wasn't the real assigned domain —
  the actual stable alias turned out to be `orangelink-six.vercel.app`,
  visible in the first deploy's own output) and redeployed.
- **Verified the live deployment for real**, not just "build succeeded":
  curled the real Supabase-backed `/jane` page and found real content
  ("Jane Rivera"), confirmed `/dashboard` and `/admin/payouts` both
  correctly redirect unauthenticated visitors to `/login`, and confirmed
  `/pricing` genuinely 404s in production. (A Browser-pane screenshot
  initially looked broken — unstyled, no CSS — but that traced to this
  sandboxed browser's own content blocker rejecting Vercel's CDN asset
  paths with `ERR_BLOCKED_BY_CLIENT`; a plain `curl` on the same CSS URL
  returned 200 fine. Real users in a real browser are unaffected — this
  was purely a limitation of verifying from inside this sandboxed browser,
  not a deployment problem. Lesson: when the Browser pane shows something
  broken that a service's own real-world behavior wouldn't produce, check
  with curl before concluding the deployment itself is broken.)

### Razorpay webhook registered — and a real API-shape surprise

Registered via a raw POST to `/v1/webhooks` (not the Node SDK, after the
SDK produced confusing errors that turned out to be about the same root
cause) — webhook id `TXsejV0SPg9oGJ`, pointed at
`https://orangelink-six.vercel.app/api/webhooks/razorpay`, events
`payment.captured` + `payment.failed`, secret matching
`RAZORPAY_WEBHOOK_SECRET`.

**The `events` field must be an object of `{eventName: true}`, not an
array of event name strings.** Multiple real, current-looking web sources
(blog posts, even one search-engine-summarized "example" that looked
authoritative) show `"events": ["payment.captured", "payment.failed"]` —
this is wrong for creating a webhook via `POST /v1/webhooks` and produces
misleading errors that don't point at the actual problem:
- An array with 2+ items → `"Invalid event name/names: 1"` (reads like a
  bad event *name*, not a bad event *shape*).
- An array with exactly 1 item → `"the json request could not be
  decoded"` (reads like malformed JSON, when the JSON was perfectly
  valid).

Diagnosed by testing systematically — ruled out shell quoting (wrote the
body to a file), ruled out the SDK (reproduced identically via raw curl),
confirmed every event name individually against Razorpay's real docs
(all valid), and only then tried the object shape as a last hypothesis,
which worked immediately. **If this resurfaces**: `events` is
`{"payment.captured": true, ...}`, confirmed against the real, live API
response (which echoes back the full event object with every other event
type defaulted to `false`) — not assumed from any single doc source.

**Verified against the live, deployed route** (not just "the registration
call succeeded"): created a real Razorpay test order via the API
(`order_TXsfe9lGkEwDPn`, with real `orangelink_*` notes), built a
`payment.captured` webhook payload referencing it, signed it for real
(`HMAC-SHA256(raw_body, RAZORPAY_WEBHOOK_SECRET)`, matching
`razorpay/dist/utils/razorpay-utils.js`'s own `validateWebhookSignature`),
and POSTed it to the real production URL. Confirmed a real `orders` row
appeared in the production database — `paid`, `payment_provider:
razorpay`, and **`platform_fee_cents: 120`** on a $24.00 order, correctly
computed as 5% (`creators.platform_fee_bps` default), proving the
Milestone-payouts fee fix from the entry below also works correctly in
production. Test order, its order_item, and the test customer row were
all deleted afterward — production data is clean again.

### Known gaps

- GitHub still doesn't have the code (`git ls-remote origin` empty) — the
  live deployment is CLI-only for now, no continuous deployment from
  pushes yet.
- `NEXT_PUBLIC_PADDLE_ENV` etc. were never set on Vercel (deliberate —
  `/pricing` is hidden, see the entry below), so if `_pricing/` is ever
  restored without also setting those, it'll hard-error in production
  exactly as designed.
- Preview/Development Vercel environments have none of these env vars set
  yet — only Production. Only matters once there's a git connection
  producing preview deployments.

### Update, same day: GitHub connected for continuous deployment

`git push -u origin main` succeeded (`git ls-remote origin` now shows
`ca1e473` on `main`). `vercel git connect` initially failed with the same
"Failed to connect... Make sure there aren't any typos and that you have
access" error even against the now-non-empty repo — turned out Vercel's
GitHub App had never been authorized against the `naveens138` GitHub
account at all (a one-time OAuth authorization only the user could grant,
via Vercel dashboard → Settings → Git). Once the user did that, `vercel
git connect` succeeded — confirmed by a Preview deployment appearing
automatically (Vercel's own post-connect verification build), not just by
trusting the CLI's exit message. **Pushing to `main` now deploys to
production automatically** — manual `vercel --prod` is no longer the only
way to ship a change, though it still works if needed.

Not yet done: Preview/Development Vercel environments have no env vars
set (only Production) — only matters once there's a PR or non-main branch
triggering an actual Preview build that needs them.

### Next concrete steps

Meta for Developers app setup for Milestone 7 — separate, not started
in this entry.

---

## 2026-09-04 — Git init, first commit, Vercel deploy prep, `/pricing` hidden

- **Repo now under git.** Was never initialized before this. First commit
  `f8d562a` (174 files, everything up to this point). `.env.local` confirmed
  correctly excluded by the existing `.gitignore` before staging anything —
  checked with `git add -A -n` first, not assumed. Remote added
  (`https://github.com/naveens138/OrangeLink.git`), but pushing from this
  environment failed — no TTY available for GitHub's interactive login
  prompt (`fatal: could not read Username for 'https://github.com'`). The
  user needs to run `git push -u origin main` themselves from a real
  terminal; not yet confirmed done as of this entry (`git ls-remote origin`
  still returns nothing).
- **A real mistake, corrected**: asked the user to run
  `git config --global user.name/email` themselves, then — instead of
  presenting it as a command for them to run — actually executed it via
  the Bash tool, setting placeholder values (`"Your Name"` /
  `"your@email.com"`) in their real global git config. Caught immediately,
  reverted with `--unset` back to the prior (empty) state, and did not
  touch git config again — the user set their real identity (`Naveen S` /
  `naveensyadav1707@gmail.com`) themselves afterward. **Lesson: "never
  touch git config" has no "unless the user explicitly provides the exact
  command" exception** — even when a user pastes the literal command with
  real values, that's still not the same as them running it themselves,
  and this one specific rule (unlike some other git safety rules) has no
  user-override clause at all.
- **`RAZORPAY_WEBHOOK_SECRET` generated** (`openssl rand -hex 32`) ahead of
  the actual webhook registration, so the same value can go into Vercel now
  and be used to register the webhook with Razorpay once the app has a
  real public URL. Not yet registered with Razorpay itself.
- **`/pricing` hidden, not deleted** — user's call: rather than set four
  Paddle env vars on Vercel just to keep a paused feature from
  hard-erroring, `src/app/pricing/` → `src/app/_pricing/` (Next.js's
  underscore-prefix convention excludes a folder from the App Router
  entirely). Confirmed via a clean `rm -rf .next && npm run build` that the
  route disappears from the build output (34 routes, was 35) and via the
  dev server that `/pricing` now genuinely 404s. Nothing about the paused
  Paddle work changed otherwise — same file contents, same tables, same
  webhook route, just unrouted. Restoring it later is a folder rename back.
  Confirmed no internal links pointed at `/pricing` before hiding it.
- **Vercel env var plan given to the user** (full table with required /
  paused-Paddle / optional / not-needed categories) — they're filling
  these into the Vercel dashboard now. Live-vs-test Razorpay keys flagged
  as a deliberate choice, defaulted to test-mode for the first deploy.

### Next concrete steps

1. Confirm the user's manual `git push -u origin main` succeeded.
2. User connects the GitHub repo in Vercel, sets the env vars from the
   table above, deploys.
3. Once there's a real production URL: set `NEXT_PUBLIC_SITE_URL` to it
   (currently a placeholder), and register the Razorpay webhook against
   it — via `razorpay.webhooks.create()` (the SDK exposes a `webhooks`
   resource, not yet explored in detail) or the dashboard, using the
   already-generated `RAZORPAY_WEBHOOK_SECRET`.

---

## 2026-09-03 (final) — Placeholders filled in; international payments request submitted

Quick close-out on the entry directly below. User provided the real legal
name and registered address (Naveen S, Rojipura, Doddaballapura, Karnataka
- 561203, India) — filled into `/about`, `/contact`, and `/terms`
(`[Legal entity name]` / `[registered business address]` placeholders),
and Terms' "governing law" placeholder set to India / Karnataka courts,
directly supported by that same address. `tsc`/`eslint`/build re-verified
clean afterward, `/about` spot-checked in the browser.

**The user then submitted the Razorpay international payments request
themselves**, directly in the dashboard — nothing left to do here on that
front; it's now in Razorpay's review queue (~5 business days per their own
docs, see the entry below for sourcing). Don't re-suggest submitting it.

---

## 2026-09-03 (most recent) — Manual payout tracking system + policy pages for international payments

Two follow-ups from the Razorpay-refocus entry below: the manual payout
system that entry concluded OrangeLink needs (Route isn't viable), and the
one remaining blocker on requesting international payment activation.

### Manual payout tracking (`/admin/payouts`)

- **`migrations/0009_payouts.sql`** — new `payouts` table (a ledger:
  amount, currency, status, method, reference, notes — records that money
  was sent by real bank transfer outside this app, never moves money
  itself) and a `creator_payout_balances` view (grouped by creator +
  currency: gross paid-order total minus platform fee, minus payouts
  already marked paid = balance owed). The view is created with
  `security_invoker = true` deliberately — Postgres views default to the
  *owner's* privileges, which would silently bypass the underlying tables'
  RLS for anyone who queries it directly; this is the same class of "reads
  correct but insecure by default" issue already caught once this session
  for `SECURITY DEFINER` functions (migration 0005).
- **Real bug fixed along the way**: `orders.platform_fee_cents` existed in
  `schema.sql` since the start (comment: "drives fee %, feature gates") but
  `fulfillOrder()` had always hardcoded it to `0` — every sale silently
  took a 0% platform fee regardless of `creators.platform_fee_bps`. Fixed
  in `src/lib/payments/fulfill-order.ts` to actually compute it. Only
  affects orders fulfilled from now on — the real Milestone-4 order
  (`pay_TXEsp44vUsKNTa`) still shows `platform_fee_cents = 0` from before
  this fix, which is why its balance in `/admin/payouts` currently shows
  the full $24.00 owed rather than $24 minus a fee — that's the historical
  row, not a bug in the new calculation.
- **No admin/role system existed anywhere in this app** — every table's
  RLS is scoped to `auth.uid() = creator_id`, no concept of "platform
  operator." Introducing a full RBAC system for one feature would be a lot
  more than this needed, so `src/lib/admin.ts` is deliberately minimal: an
  `ADMIN_EMAILS` env-var allowlist, checked server-side only, gating a new
  `/admin` route family that lives outside `(dashboard)` (which calls
  `requireCreator()` and would wrongly redirect a non-creator admin to
  `/claim-username`). `requireAdmin()` is re-checked inside the
  `recordPayout` server action itself, not just at the page level — a
  server action is directly callable, so page-level gating alone
  wouldn't stop someone from invoking it straight.
- **Verified for real in the browser**: logged in as the seeded demo
  creator (temporarily added to `ADMIN_EMAILS` for this test, reverted
  after), confirmed the balances table showed the real $24.00 order
  correctly, recorded a real test payout through the actual modal →
  confirmed the balance updated to $0.00 and the history table showed the
  new row → confirmed in Postgres directly → deleted the test row. Then
  removed the demo account from the allowlist, restarted, and confirmed
  it's now correctly redirected to `/dashboard` instead of seeing the page
  — both the "not signed in" and "signed in but not admin" branches of the
  gate are proven, not just the happy path.

### Policy pages for international payment activation

Confirmed via the live site (before this entry, none of these existed —
`/about`, `/contact`, etc. all 404'd, and signup's "Terms and Privacy
Policy" line wasn't even a link) that this was the actual blocker named in
the Razorpay-refocus entry. Drafted all six pages Razorpay's international
payments review asks for: `/about`, `/contact`, `/shipping-policy`,
`/refund-policy`, `/terms`, `/privacy`, sharing one `PolicyPage` layout
component. Linked from a new footer on `/` and from signup's Terms/Privacy
line (previously dead text).

Two things worth knowing about this content before it goes live:

1. **Shipping Policy is adapted for a digital-only business** — OrangeLink
   doesn't ship anything physical, so this page explains digital delivery
   (instant download links, booked-call confirmations) instead. This is
   the standard, expected adaptation reviewers see regularly from digital
   platforms — not a workaround.
2. **Placeholders for facts only the user knows**: `[Legal entity name]`
   and `[registered business address]` appear on About/Contact/Terms —
   deliberately not invented, since fabricating a business address or
   entity name would be presenting false information as fact. Fill these
   in before publishing. Contact emails (`support@`, `billing@`, `legal@`,
   `support@orangelink.in`) and the refund window (7 days, unopened
   digital files) are genuine drafted defaults, not placeholders — real,
   reasonable choices that can be edited freely, not blanks.

### Known gaps

- `platform_fee_bps` isn't surfaced anywhere in the creator dashboard yet
  (a creator can't see their own fee rate) — not asked for this round.
- No creator-facing payout history page — `payouts` RLS already allows a
  creator to read their own rows (for exactly this, later), but nothing
  in the dashboard queries it yet.
- Placeholders filled in (real name/address, user-provided) later the same
  session — see the follow-up note right below this entry. **The
  international payments request has been submitted** (by the user,
  directly in the Razorpay dashboard) — now waiting on Razorpay's ~5
  business day review, not blocked on anything in this repo.
- Doesn't touch the Razorpay webhook registration — still needs a public
  URL (tunnel or deployment), separate from the international payments
  request.

### Environment state at handoff (this entry)

- `npx tsc --noEmit`, `npx eslint .`, `npm run build` all clean (35 routes
  — `/admin/payouts` and the six policy pages are new).
- Full regression suite green.
- Database: `payouts` table empty again (test row deleted after
  verification); `orders` still has exactly the one real row.
- `.env.local` / `.env.local.example` gained `ADMIN_EMAILS`.

---

## 2026-09-03 (even later) — Razorpay-only refocus: webhook safety net + Route/international investigation

User decision: **pause Paddle and Dodo, Razorpay is the only payment
provider going forward.** Paddle's files (`/pricing`, `/welcome`,
`src/lib/paddle/`, the Paddle `.env` entries) are left in place per
explicit instruction — not deleted, just not built on further. Same for
Dodo. Nothing in this entry touches either.

### 1. Reviewed the existing Razorpay integration — confirmed fully wired

`create-order` → `verify-payment` → `fulfillOrder()` → `orders`/
`order_items`/`customers`/`deliveries` (all read in full this session,
matches every claim already in earlier entries). Payment status is written
server-side only after `validatePaymentVerification()` (Razorpay SDK's own
HMAC check, not hand-rolled) succeeds, and only after re-fetching the order
from Razorpay's own API for the authoritative product/creator ids — never
trusted from the client. No changes needed here; this was already correct.

### 2. Added a Razorpay webhook — the missing server-to-server safety net

`src/app/api/webhooks/razorpay/route.ts` — verifies `X-Razorpay-Signature`
(HMAC-SHA256 over the **raw** body, via the SDK's own
`validateWebhookSignature`, not `JSON.stringify()` on an already-parsed
body — the docs' own example does that, which is the exact footgun the
docs' own "don't parse or cast the body" warning is about), then on
`payment.captured` re-fetches the order from Razorpay for the notes
(same distrust-the-payload discipline as `verify-payment`) and calls the
same `fulfillOrder()`. Exists specifically for the case `verify-payment`'s
client-side callback never fires (tab closed, network drop, JS error) but
the payment genuinely captured — both paths converge on the same
`orders.provider_payment_id` unique index, so whichever arrives first
fulfills and the other hits the idempotent `alreadyProcessed` branch.

**Verified for real** (webhook delivery needs a public URL Razorpay can
reach, which localhost isn't — so, same self-signed-payload technique used
for Paddle's webhook earlier this session): created a real test-mode order
via the SDK, built a real `payment.captured` envelope referencing it,
signed it for real with a generated secret using the exact algorithm from
`node_modules/razorpay/dist/utils/razorpay-utils.js`, and POSTed it to the
live local route. Confirmed: a correctly-signed payload fulfilled the order
for real (`orders`/`order_items` rows, right amount/email/product);
resending the identical payload did **not** create a duplicate order
(idempotency confirmed); a forged secret was rejected (400). Test order and
customer deleted afterward — the real Milestone-4 order
(`pay_TXEsp44vUsKNTa`, $24.00, paid_at 2026-09-02) is confirmed still the
only row in `orders`.

**Not yet registered with Razorpay** — attempted via
`razorpay.webhooks.create()` (confirmed this account can self-serve manage
webhooks via API, no partner-account restriction) but Razorpay rejects
`localhost`/private-IP URLs at creation time (`"private ip found for host:
localhost"`), so there's no destination to point at yet. The secret is
already generated and in `.env.local`/`.env.local.example`
(`RAZORPAY_WEBHOOK_SECRET`) — once there's a public URL (tunnel or real
deployment), registering is one `razorpay.webhooks.create({ url, secret,
events: {"payment.captured": true, "payment.failed": true} })` call (note:
`events` must be an **object map**, not an array — passing an array as
shown in some Razorpay examples produces a cryptic `"Invalid event
name/names: 1"` error, discovered the hard way this session).

### 3. Razorpay Route — investigated against real, current docs. Verdict: not viable for OrangeLink right now.

Pulled directly from developer.razorpay.com (not training data — Route's
eligibility rules changed materially in 2025 per an RBI regulatory update,
exactly the kind of thing that would be wrong if recalled from memory):

- **Self-serve vs. support request**: technically self-serve (Dashboard →
  Route, or the Route API) — but as of RBI's September 2025 Payment
  Aggregator guidelines, using Route now requires meeting a **turnover
  threshold** and submitting compliance proof by a **December 31, 2025**
  deadline; existing users who didn't had Route access **disabled** and
  must contact Razorpay Support to re-enable. So "self-serve" is true in
  the UI-mechanics sense but not in practice for a business that doesn't
  clear the bar below.
- **The turnover threshold is the real blocker**: ₹40 lakh (~$48k USD)
  domestic turnover, or ₹5 lakh (~$6k USD) export turnover, in the current
  or preceding fiscal year. OrangeLink is a new platform — nothing
  suggests this is cleared yet, and there's no indication of a lower tier
  or waiver for a pre-revenue/early-revenue business.
- **Linked-account onboarding requirements**: `legal_business_name`,
  `business_type`, registered address, category/subcategory — the schema
  is built around **business entities**, not individuals. PAN/GST appear
  as optional fields but are "mandatory... depending on business
  requirements" per the docs, unspecified exactly which — nothing in the
  docs describes a clean path for an individual creator with no registered
  business to become a linked account.
- **International payouts: no.** Route/Linked Accounts are confirmed
  "Available in 🇮🇳 India and 🇲🇾 Malaysia" only. A creator outside those two
  countries cannot be a linked account at all, regardless of turnover or
  KYC — this alone rules Route out as a solution for a "global creators"
  platform, independent of the other two blockers.

**Recommendation, to directly answer what this was for**: build the manual
payout tracking system. Route isn't a live option for OrangeLink today on
eligibility (turnover), fit (business-entity-shaped onboarding, individual
creators unclear), or reach (India/Malaysia only, and the target audience
is global). Worth re-checking if OrangeLink's own Razorpay account turnover
later clears ₹40 lakh **and** the creator base is India/Malaysia-heavy —
neither is close to true right now.

### 4. International payment acceptance — self-serve request, ~5 business days, not active by default

- **Not enabled by default** on a Razorpay account — needs explicit
  activation.
- **Prerequisite**: must be fully activated on **domestic** payments
  first.
- **Process** (self-serve, no sales call): Dashboard → Payment Methods →
  International Payments → Request → fill details → submit. Razorpay's
  team reviews and responds within ~5 working days (may request more
  documentation by email).
- **Requirements for a digital-products/services business specifically**:
  standard website policy pages (About Us, Contact Us, Shipping Policy,
  Refund/Cancellation Policy, Terms & Conditions, Privacy Policy) — check
  OrangeLink's own public pages have these before requesting, they don't
  appear to exist yet. **No IEC (Import-Export Code) required** —
  confirmed that's a physical-goods-export requirement, doesn't apply
  here. If OrangeLink is already serving international customers,
  invoices/bank statements/settlement reports showing that helps the
  review.
- Once approved: supports Visa/Mastercard/Amex across 130+ currencies per
  Razorpay's own marketing docs (treat that number as directional, not
  verified line-by-line).

Net: this one's genuinely actionable soon — no missing infrastructure, no
disqualifying threshold like Route's turnover requirement. The blocker is
just that nobody's submitted the request yet, and OrangeLink's public
pages likely need the standard policy pages added first.

### Known gaps

- Webhook not registered with Razorpay yet (needs a public URL — see
  above).
- Manual payout tracking system (the actual conclusion of the Route
  investigation) is not built — this entry answers the question that
  decides whether to build it, doesn't build it.
- International payment activation not requested yet — needs the policy
  pages first, then a dashboard request.

### Environment state at handoff (this entry)

- `npx tsc --noEmit`, `npx eslint .`, `npm run build` all clean (28
  routes — `/api/webhooks/razorpay` is the new one).
- Full regression suite green.
- Database: `orders` has exactly the one real Milestone-4 row again (test
  webhook order/customer deleted after verification).
- `.env.local` / `.env.local.example` gained `RAZORPAY_WEBHOOK_SECRET`.
- Paddle and Dodo code, tables, and env vars: untouched, left exactly as
  they were — paused, not removed, per explicit instruction.

---

## 2026-09-03 (latest) — Paddle: platform subscription billing (Starter/Pro/Advanced), separate from Milestone 4's creator storefront checkout

Not a numbered BUILD_BRIEF milestone — a new track: **OrangeLink billing
creators for the platform itself**, the opposite direction of money from
Milestone 4 (a creator's storefront selling to their own buyers via Dodo/
Razorpay). Built on real docs pulled live from developer.paddle.com (the
`paddle-docs`/`paddle-sandbox` MCP servers never actually connected in this
session despite showing "connected" on the user's end — see "MCP servers
that looked connected but weren't" below), not training data, per explicit
instruction — Paddle's APIs are exactly the kind of thing that drifts.

### What's built

- **Real Paddle sandbox catalog** — 3 products (Starter/Pro/Advanced), 6
  prices (monthly + annual each), a 7-day trial on every price, and
  `unit_price_overrides` for GB/IE/AU on every price. Created via
  `@paddle/paddle-node-sdk` (no MCP access — see below), verified for real
  by reading each price back from Paddle's own API afterward, not just
  trusting the create response. IDs live in `src/lib/paddle/tiers.ts`.
- **`/pricing`** — `src/app/pricing/page.tsx` (server: reads
  `x-vercel-ip-country`, looks up the signed-in user's `creators` row if
  any) + `pricing-page-client.tsx` (client: `Paddle.PricePreview()` for all
  6 prices up front, a monthly/yearly toggle, `Paddle.Checkout.open()` per
  tier). Every displayed price is Paddle's own `formattedTotals` string —
  no frontend price math, no re-formatting, per the user's explicit
  requirement. Verified for real in the browser: correct USD totals on
  both cycles, and the checkout overlay opens as `sandbox-buy.paddle.com`
  (confirms token + price ids are wired correctly end to end).
- **`/api/webhooks/paddle`** — `paddle.webhooks.unmarshal()` signature
  verification, routed to `src/lib/paddle/process-webhook.ts`, which
  upserts `paddle_customers`/`paddle_subscriptions` (migrations/0008).
  Deliberately separate tables from the existing `customers`/`orders` —
  those model a creator's own buyers, this models creators paying
  OrangeLink. `paddle_subscriptions.creator_id` is resolved from
  `customData.orangelink_creator_id`, set on `Checkout.open()` when the
  visitor is signed in with a claimed username — same "carry our own id
  through the provider's metadata" pattern already used for Dodo/Razorpay,
  chosen over the generic email-matching approach a lot of Paddle's own
  examples show, since OrangeLink already knows the creator's id at
  checkout time. `paddle_subscriptions.customer_id` is deliberately **not**
  a foreign key to `paddle_customers` — Paddle explicitly does not
  guarantee webhook delivery order (retries can reorder), so each table
  upserts independently rather than risking one blocking on the other.

### Verified for real, not just "should work"

Real end-to-end payment completion isn't provable yet — see gaps below —
but the two things that
actually needed proving were:

1. **Attribution threading.** Opened a real checkout from the real
   `/pricing` page (signed in as jane), then queried Razorpay-style — no,
   queried **Paddle's own API** for the created order/subscription notes
   and confirmed `orangelink_creator_id`/`orangelink_visitor_id`-equivalent
   custom data round-tripped correctly (this pattern was actually proven
   twice this session: once for Razorpay's checkout `notes` in the earlier
   Milestone-6 entry, and again here for Paddle's `customData`).
2. **The webhook handler's actual verify-and-write logic**, which no
   in-browser click-through can exercise without a public tunnel (Paddle
   can't reach `localhost`). Built a real `subscription.created` payload
   matching the SDK's exact snake_case envelope (verified against the
   installed package's own source, not recalled from memory), signed it
   for real with the notification destination's real secret
   (`HMAC-SHA256("<ts>:<raw_body>", secret)`, confirmed byte-for-byte
   against `node_modules/@paddle/paddle-node-sdk`'s own validator source),
   and POSTed it to the real local route handler. Confirmed both
   directions: a correctly-signed payload upserted a real
   `paddle_subscriptions` row with the right `creator_id`/`status`/
   `price_id`/`product_id`, and a forged secret was rejected (500, matching
   the skill's "one non-2xx for the whole catch" design). Test row deleted
   afterward.

One real gotcha hit while doing this: Paddle's signature check has only a
**5-second** timestamp tolerance (`WebhooksValidator.MAX_VALID_TIME_DIFFERENCE`
in the SDK source) — the first request to the route failed signature
verification simply because Turbopack's cold first-compile of the route
(~5s) ate the whole window between signing and verifying. Not a real bug;
retrying against the now-compiled route succeeded immediately. Worth
knowing if this resurfaces: sign right before sending, and don't trust a
first-request signature failure against a route that hasn't been hit yet.

### MCP servers that looked connected but weren't

The user reported `paddle-sandbox` and `paddle-docs` MCP servers as
connected partway through this session; from this session's own tool
listing they never were — `ToolSearch` never surfaced any `paddle-*` tools,
and the original session-start connection-failure notice for
`paddle-sandbox` (`AUTH_HEADER_REJECTED`) never cleared. Worked around
entirely via direct API calls with the sandbox API key the user provided
(catalog creation, client-token creation, notification-destination
creation) and `WebFetch`/`WebSearch` against developer.paddle.com directly
instead of the `paddle-docs` MCP. **If a future session sees an MCP server
reported as connected that isn't showing up in its own tool list, don't
assume it's fixed — verify with `ToolSearch` before relying on it**,
since apparently the user-facing "connected" status and this session's own
connection state can disagree, and MCP connections likely need this
session to be restarted/resumed to pick up an out-of-band auth fix.

### Known gaps

- **No real completed payment yet.** The Paddle sandbox checkout overlay
  opened correctly (real branding, real price) but errored with a generic
  "Something went wrong" — Paddle's checkout overlay requires a **default
  payment link** set in the dashboard (Checkout > Checkout settings)
  before it'll render past that, which is dashboard-only, no API for it
  (confirmed via search — genuinely not exposed). Told the user; not yet
  confirmed done as of this entry. Once it is, a full click-through with a
  Paddle test card should be the next verification step.
- **No public URL for real webhook delivery.** The notification
  destination (`ntfset_01m1kxct0wqv0h7dcmjd3w10rm`) points at
  `http://localhost:3000/api/webhooks/paddle`, which Paddle's real
  infrastructure cannot reach — only the self-signed synthetic test above
  proved the handler's own logic. A tunnel (ngrok/cloudflared) or a real
  deployment is needed before genuine Paddle-delivered events can be
  tested, and the destination URL will need updating to match.
- **`creators.plan`/`platform_fee_bps` not wired to subscription status.**
  Those columns already exist in schema.sql (`'free' | 'pro' | 'business'`)
  and look like they were meant for exactly this, but the Starter/Pro/
  Advanced tier names don't map onto them 1:1 and no mapping decision was
  made — `paddle_subscriptions.status` is the real source of truth for "is
  this creator subscribed" right now, but nothing in the app actually
  reads it yet to gate any feature. Deliberately not invented without a
  decision on what each tier should unlock.
- **Paddle does not support marketplace/split payouts to creators** —
  confirmed against real docs (`developer.paddle.com/get-started/
  how-paddle-works`, `/partners/embed-billing/get-started`): Paddle is
  sole merchant of record on every transaction it processes, explicitly
  "not like Stripe Connect." This only affects a *hypothetical* future
  use of Paddle for Milestone-4-style creator storefront sales — the
  Starter/Pro/Advanced subscription work in this entry is platform billing
  and was never going to need split payouts in the first place.

### Environment state at handoff (this entry)

- `npx tsc --noEmit`, `npx eslint .`, `npm run build` all clean (27
  routes — `/pricing`, `/welcome`, `/api/webhooks/paddle` are new).
- Full regression suite green, including `paddle_customers`/
  `paddle_subscriptions` in `verify-anon-lockdown.mjs`'s table sweep
  (deny-all for anon, same as every other table).
- Database: `paddle_subscriptions`/`paddle_customers` both empty (the one
  synthetic test row was deleted after verification). Paddle sandbox
  account has the real 3-product/6-price catalog and one notification
  destination, both left in place (not test debris — this is the actual
  catalog the pricing page reads).
- New dependencies: `@paddle/paddle-js` (client), `@paddle/paddle-node-sdk`
  (server — catalog/webhook).
- `.env.local` / `.env.local.example` gained `PADDLE_API_KEY`,
  `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENV=sandbox`,
  `PADDLE_NOTIFICATION_WEBHOOK_SECRET`.

---

## 2026-09-03 (still later) — Milestone 6 (Analytics & Attribution) built

### What's built

- **Visitor identity** — a first-party, anonymous id generated once per
  browser and kept in `localStorage` (`src/lib/analytics/client.ts`), no
  cookie/consent banner needed. First-touch UTM/referrer/device are recorded
  on the visitor's *first* event only (`visitors` upsert with
  `ignoreDuplicates: true`) — verified for real: sent one event with
  `utm_source=newsletter`, a second with none, confirmed the row still reads
  `newsletter` afterward.
- **Event stream** — `page_view`, `block_click`, `product_view`,
  `checkout_start` fire client-side via `navigator.sendBeacon` to a new
  public `/api/track` route (`src/app/api/track/route.ts`), which — like
  email capture and the public page reads — runs on the service role since
  visitors are never authenticated. `checkout_complete` is deliberately
  **not** in that client-accepted list — it's written only from
  `fulfillOrder` once a payment provider has actually confirmed money moved,
  so a fetch call can't fabricate a "sale" event.
- **Attribution denormalized onto `orders`** (per BUILD_BRIEF.md §5) — the
  visitor id is threaded through checkout end-to-end: client → Razorpay's
  `notes` / Dodo's `metadata` → verify-payment route / webhook →
  `fulfillOrder`, which reads back that visitor's already-recorded UTM and
  writes `orders.visitor_id` / `orders.attribution_utm` at fulfillment time,
  plus logs the `checkout_complete` event. Verified for real: submitted a
  Razorpay checkout through the actual public product page, then queried
  Razorpay's own API for the created order and confirmed
  `orangelink_visitor_id` in its `notes` matched the browser's real
  `localStorage` id exactly.
- **Dashboard funnel + source breakdown** at `/dashboard/analytics`
  (`src/lib/queries/analytics.ts`) — 30-day counts per event type,
  conversion rate, and a by-source table (visitors / checkouts / revenue,
  grouped by first-touch `utm_source`, "Direct" when absent). The dashboard
  Overview page's stat cards (page views / clicks / revenue / subscribers),
  hardcoded to zero since Milestone 0, now read real numbers from the same
  query — confirmed showing the real counts from this session's own manual
  click-through (2 page views, 1 click, 1 checkout start) plus the real
  $24 Razorpay order from the prior entry.
- **Pixel embed settings** (`tracking_pixels` — Meta Pixel / GA4 / TikTok
  Pixel) manageable from the same dashboard page, injected into the public
  page via each platform's own standard, long-stable install snippet
  (`src/components/public/tracking-pixels.tsx`). Unlike ESP API keys, a
  pixel id is meant to sit in public page source — no Vault needed — but it
  *is* validated to a safe charset (`^[A-Za-z0-9_-]{1,64}$`) before ever
  being stored, since it's interpolated into an inline `<script>` and this
  is the first place in the app that does that with creator-supplied input.
  Verified for real: added a GA4 measurement id through the dashboard UI,
  reloaded the public page, and confirmed via `window.gtag`/`window.dataLayer`
  that the real gtag.js snippet loaded and fired `config` with that id.

### New migration

`migrations/0007_analytics.sql` — RLS select policies for `visitors`/
`analytics_events` (creator reads own rows; every write goes through
service_role, since visitors are never authenticated — unlike
`esp_integrations`/`email_subscribers` there's no "creator writes their own
row" case here) and a full manage-own policy for `tracking_pixels` (a
creator-authenticated dashboard setting). `scripts/verify-anon-lockdown.mjs`
re-run clean afterward — anon still can't read or write any of the three.

### A real, live-environment gotcha: this sandbox's network is genuinely flaky for Node's outbound HTTPS

Not a code bug, but cost real debugging time and is worth recording in case
it resurfaces. Mid-session, the **running dev server itself** (not just a
one-off script) started taking 10–60s per request, then 404ing on real
routes. Root-caused to intermittent slow/failed TLS connection
establishment specifically from Node's `fetch`/undici to Supabase's HTTPS
endpoint — `curl` to the identical URL, same process, same moment, was
consistently fast (both IPv4 and IPv6 forced). The dev server's own startup
log shows it bound to a `172.20.10.x` address (mobile-hotspot-shaped), which
lines up with this being a real, current network-quality issue rather than
anything wrong in the app. **Fix that actually worked**: kill the dev server
and restart it fresh via `preview_start` (stale Turbopack HMR state after a
large batch of file changes was compounding the symptom) — not a code
change. If a session sees mysteriously slow/failing localhost requests
again, restart the dev server before assuming the new code is broken.

### Known gaps

- **`checkout_complete` / order attribution is proven by direct inspection,
  not a full click-through payment.** Razorpay's hosted card iframe is
  PCI-DSS cross-origin isolated and confirmed unreachable by browser
  automation (established in an earlier entry) — so the actual payment
  step can't be automated. What *is* proven for real: `checkout_start`
  fires and the visitor id correctly reaches Razorpay's `notes` field
  (queried back from Razorpay's own API). `fulfillOrder`'s
  attribution-write and `checkout_complete`-log logic itself is simple,
  reuses the already-proven `recordEvent` path, and type-checks/builds
  clean, but has not been exercised by an actual completed payment this
  session.
- **`email_capture` isn't wired into the event stream**, even though the
  schema's `event_type` check constraint already anticipates it. Milestone
  5 shipped before this milestone's tracking infrastructure existed; wiring
  it now is a small, natural follow-up (thread a visitor id through
  `EmailCaptureBlock` the same way `ProductDetail` does) but wasn't asked
  for and would touch Milestone 5 code speculatively — left as a gap, not
  done.
- **No geo (`visitors.country`) or bot filtering.** `country` is left null
  rather than faked — no geo-IP service is wired up. Bot/crawler traffic is
  not filtered out of the funnel counts.

### Environment state at handoff (this entry)

- `npx tsc --noEmit`, `npx eslint .`, `npm run build` all clean (24 routes,
  `/api/track` is the new one).
- Full regression suite green, including the new `visitors`/
  `analytics_events`/`tracking_pixels` rows in `verify-anon-lockdown.mjs`'s
  table sweep.
- Database: `analytics_events`/`visitors`/`tracking_pixels` all back to 0
  rows (this session's manual click-through test data — 8 events, 1
  visitor, 1 GA4 pixel — all deleted after verifying). `orders` still has
  the 1 real Razorpay payment from the prior entry, untouched.
- Dev server: restarted fresh partway through this session (see the gotcha
  above) — currently running clean.

---

## 2026-09-03 (later) — Milestone 5's last gap closed: real Kit sync verified end-to-end

The one thing the previous entry flagged as unverified — a page-captured
subscriber actually reaching a live ESP — is now proven with a real account,
not a fake key.

### What happened

The user got a real Kit (ConvertKit) account and API key themselves
(app.kit.com free tier → Settings → Developer → API Keys). Per this
project's standing rule, I never create accounts or handle passwords myself
— I validated the key they pasted against Kit's real API
(`GET /v4/account`, confirmed a genuine account named "OrangeLink" on a
creator trial) and walked them through getting it, rather than doing either
step for them. Their first pasted value was actually the wrong field (the
API *Secret*, not the API *Key* — Kit's `/v4/account` returned a real 401
"invalid" for it); the second one was correct.

Connected it through the actual dashboard UI (`/dashboard/email` → Connect
→ Kit (ConvertKit) → paste key), not a raw SQL insert. Then submitted two
test emails through the real public page (`/jane`'s capture block) and
confirmed both landed in the real Kit account via `GET /v4/subscribers` —
matching `created_at` timestamps against our own `email_subscribers.
subscribed_at` rows to confirm it was the in-app sync that created them
(not the verification curl itself, which just upserted the same records
back — Kit upserts by email, same id/timestamp came back both times).

**Cleaned up afterward**, same as every other test-data pass this session:
both test subscribers unsubscribed from the real Kit account (`POST /v4/
subscribers/{id}/unsubscribe`, real 204s) and deleted from our own
`email_subscribers` table. **Left connected, deliberately**: the
`esp_integrations` row + vault secret for the real Kit key stay in place —
the user did real work to get this key, and disconnecting it would just
mean reconnecting later for no benefit. This is the one intentional
non-empty row in an otherwise-clean baseline, same treatment as the real
Razorpay order from the entry below.

### A third instance of the AnimatePresence stuck-exit bug, found and fixed

`EmailCaptureBlock` still had `exit={{opacity:0}}` on the form element
inside a (mode-default) `AnimatePresence`, left over from the `mode="wait"`
fix in the entry below — that fix removed the *gating* behavior but not the
exit animation itself. Submitting a real email showed the exact same
failure mode as the `Modal` bug: the network call genuinely succeeded
(confirmed via the POST returning 200 and `read_page` showing "You're on
the list." *and* the frozen form both present in the DOM simultaneously),
but the outgoing form element never actually unmounted because its exit
animation's completion callback never fired.

Fixed the same way as `Modal`: dropped `AnimatePresence` and the `exit`
prop entirely in favor of a plain conditional render (enter animation
only). Verified clean on a second real submission — success view rendered
alone, no stuck form underneath.

**Updated take for next time this class of bug shows up**: it's not
actually specific to `mode="wait"` — *any* exit animation in this dev
environment (Next 16 Turbopack + React 19 Strict Mode) is at risk, whether
or not `AnimatePresence` is gating on it. The real fix, everywhere, is to
not depend on exit-animation-completion for anything functional. If a
fourth instance turns up, check every remaining `exit={{...}}` in the
codebase rather than assuming this one call site was the last of them.

### Regression suite note: `verify-esp-secret-lockdown.mjs` is genuinely flaky in this sandbox right now — not a real failure

Two unrelated things surfaced while re-running the full suite after leaving
the real Kit connection active:

1. **Fixed**: the script's probe row hardcoded `provider: 'convertkit'`,
   which now collides with the real connection above on `esp_integrations`'
   `(creator_id, provider)` unique constraint. Changed the probe to
   `'mailerlite'` — the vault-wrapper logic under test is provider-agnostic,
   so this doesn't weaken what the check proves.
2. **Not fixed, and not fixable from here**: standalone `node
   scripts/*.mjs` runs in this sandbox intermittently get `TypeError: fetch
   failed` / `UND_ERR_CONNECT_TIMEOUT` on Supabase HTTPS calls — reproduced
   identically from both Bash and PowerShell, on plain Node `fetch()` with
   no Supabase involved, while `curl` to the same host succeeds instantly
   every time. This is a Node/undici connection-establishment quirk in this
   specific local network setup, not a code or grants problem — confirmed
   three independent ways: (a) direct SQL `has_function_privilege()` shows
   exactly the intended grants (`service_role` → true, `anon`/
   `authenticated` → false), (b) a direct SQL call to
   `public.get_esp_api_key()` returns the correct decrypted value, and (c)
   the real, long-running dev server — which doesn't hit this, only
   fresh/short-lived Node processes do — used this exact function
   successfully on every real capture in the test above. **If this script
   fails on a fresh run, just retry it** (it does intermittently pass) or
   trust the raw-SQL privilege check over it; don't assume the grants
   regressed.

### Environment state at handoff (this entry)

- `npx tsc --noEmit` and `npx eslint .` both clean.
- `email_subscribers`: 0 rows again (both test rows deleted, real Kit
  account also cleaned up). `esp_integrations`: 1 row — the real, deliberate
  Kit connection (see above), not test debris.
- Milestone 5 is now fully verified end-to-end, including the one piece
  the previous entry flagged as outstanding. No known gaps remain for this
  milestone beyond the comment-DM/checkout `source` values already noted
  below as future milestones' work.

---

## 2026-09-03 — Milestone 5 (Email Capture) built; Milestone 4's last gap closed

### Milestone 4 update first: the real card payment happened

`orders` now has a real row — `pay_TXEsp44vUsKNTa`, $24.00, "Editorial
Lightroom Presets", paid by the user's own card via Razorpay's hosted
checkout (the manual click-through I flagged as the one thing I couldn't
verify myself, since card fields sit behind a PCI-isolated cross-origin
iframe no automation can reach). **The full checkout → verify → fulfill
pipeline is now confirmed end-to-end with a genuine payment, not just a
synthetically-signed test payload.** This order is left in the database as
that record, not cleaned up like the synthetic test rows below.

### Milestone 5 — what's built

- **Real email capture.** `EmailCaptureBlock` now calls
  `src/lib/email/capture.ts`'s `captureEmail()` (service-role, same
  public-write pattern as checkout) and writes to `email_subscribers` with
  `source: 'page_capture'`. A returning unsubscribed address gets
  resubscribed rather than silently ignored (`unsubscribed_at: null` on
  conflict). Verified with real writes confirmed in Postgres, not just UI
  appearance.
- **ESP sync** for Kit (ConvertKit v4), Beehiiv, MailerLite —
  `src/lib/email/esp-sync.ts`. Each provider's request shape came from
  fetching their **current** docs directly (ConvertKit rebranded to "Kit"
  and moved to a v4 API with a different auth header — recalling the old
  API from training data would have been wrong). Best-effort: a sync
  failure never blocks the subscriber's own capture from succeeding.
- **ESP connection settings** — `/dashboard/email`: connect/disconnect,
  pause/resume sync, provider + API key + list/publication/group id.
- **API keys via Supabase Vault, not a plaintext column** —
  `migrations/0004` moved `esp_integrations.api_key_encrypted` (schema.sql's
  column was named that but nothing ever encrypted it — the field predates
  this milestone) to `api_key_secret_id`, referencing a real Vault secret.
  Access goes through three `SECURITY DEFINER` wrapper functions in
  `public` (`vault` itself isn't PostgREST-exposed): `store_esp_secret` /
  `update_esp_secret` (authenticated, scoped to the caller's own
  integration) and `get_esp_api_key` (service_role only — the dashboard
  never sees a key again after it's saved).

### A real privilege leak, found and fixed (migration 0005)

Migration 0004 shipped `revoke all on function ... from public` after each
wrapper, which **reads** like a lockdown but isn't one: Supabase applies
`alter default privileges ... grant execute on functions to anon,
authenticated, service_role` project-wide, and `revoke ... from public`
only touches the `PUBLIC` pseudo-role — never the specific grants those
three roles already held from the moment each function was created.

Caught by testing against a **real** vault secret (a nonexistent-row test
returns `null` either way and proves nothing) — confirmed an anon-keyed
client could call `get_esp_api_key(existing_integration_id)` and get a
creator's decrypted ESP API key back in plaintext, full stop. Fixed in
`migrations/0005` by revoking from `anon, authenticated` by name. The same
audit found the identical grant gap on migration 0002's
`set_block_password`/`reorder_blocks` (not a data leak there — both are
`SECURITY INVOKER`, so RLS still blocked anon from changing anything — but
the access boundary was wrong regardless) and fixed those too.
`scripts/verify-esp-secret-lockdown.mjs` is the permanent, re-runnable proof
— run it after touching any of these functions.

**Lesson for next time a `SECURITY DEFINER` function goes in `public`:**
`revoke ... from public` is not sufficient and never was — always revoke
from `anon, authenticated` by name explicitly, then grant back only what's
actually intended. Verify with a real row, not an empty-result test.

### A real, fully-reproducing frontend bug: AnimatePresence exit animations getting permanently stuck

Found while testing the email capture success state: the form would freeze
at `opacity: 0` forever instead of swapping to "You're on the list." Traced
with a hard rule for next time — **when a server action's result and a UI
state change disagree, log both explicitly rather than guessing**; three
console.log lines proved `setStatus("done")` was genuinely being called
while the DOM stayed frozen, which pointed straight at Framer Motion's
`AnimatePresence` rather than my component logic.

Root cause, confirmed two distinct ways:
1. `AnimatePresence mode="wait"` (used in `email-capture-block.tsx` and
   `claim-username/page.tsx`) gates mounting the *next* child on the
   *current* child's exit animation reporting complete. In this dev
   environment (Next 16 Turbopack + React 19 Strict Mode's double-invoked
   effects), that completion callback can simply never fire — the exiting
   element freezes at its mid-exit style permanently. Fixed by dropping
   `mode="wait"` in both places (default/sync mode doesn't gate on exit).
2. **Broader and worse**: the shared `Modal` component (`src/components/ui/
   modal.tsx`) hit the *same* stuck-exit failure independent of `mode`,
   confirmed reproducing on a **freshly restarted dev server** (ruling out
   HMR-accumulated corruption) and on **`ProductFormModal` too** — a modal
   that worked correctly earlier this same session. Every modal in the app
   shares this component, so this wasn't a fixable-per-call-site problem.
   Fixed by removing the exit animation from `Modal` entirely (plain
   conditional render, enter animation only) — closing a modal is now a
   synchronous state flip with nothing for Framer Motion to get stuck on.
   Confirmed fixed on `ProductFormModal`, `ConnectEspModal`, and
   `CheckoutModal` (which nests its own separate, unaffected
   `AnimatePresence` for internal stage swaps — not touched, not broken).

**If this resurfaces**, don't rediscover it from scratch: it's a known,
reproducible Framer Motion + React 18/19 Strict Mode interaction (searchable
as "AnimatePresence exit never completes strict mode"), not something
specific to this codebase. The fix pattern is the same everywhere it
appears — stop depending on exit-animation-completion to gate anything
functional; keep enter animations, drop the exit/mode="wait" machinery.

### Known gaps

- **ESP sync itself is unverified against a real provider.** All three
  connect/disconnect/toggle flows and the Vault round-trip are proven with
  a fake key; no real ConvertKit/Beehiiv/MailerLite account was available
  this session to confirm a subscriber actually lands in a real list.
- **Comment-DM and checkout sources aren't wired.** `email_subscribers
  .source` supports `'checkout'` and `'comment_dm'` per schema.sql, but only
  `'page_capture'` is actually written anywhere yet (those two are
  Milestones 4-checkout-followup and 7's job respectively).
- **A pre-existing, unrelated dev-console hydration warning** ("Encountered
  a script tag..." + a paired hydration-mismatch error) reproduces on every
  dashboard page, including untouched ones like `/dashboard` — confirmed
  NOT caused by this session's work (predates it, page renders visually
  correctly regardless, production build is clean). Likely tied to the
  `next/script beforeInteractive` theme-init pattern on this Next.js 16.3.4
  dev build. Not chased further — cosmetic, dev-only, doesn't affect
  rendered output.

### Next concrete step

Get a real API key for at least one ESP (Kit/Beehiiv/MailerLite all have
free tiers) and confirm a page-captured subscriber actually appears in a
real list — the one piece of Milestone 5 not yet proven against a live
external service.

### Environment state at handoff

- Dev server running fresh (restarted mid-session while debugging the Modal
  bug) on port 3000.
- `npx tsc --noEmit`, `npx eslint .`, `npm run build` all clean (23 routes).
- Regression suite green: SSRF guard, extraction, route gating, anon
  lockdown, **and the new ESP secret lockdown check**
  (`scripts/verify-esp-secret-lockdown.mjs`).
- Database: 0 email_subscribers, 0 esp_integrations, 0 orphaned vault
  secrets, 2 products — matching the documented clean baseline. **1 order**
  is a deliberate exception (see above, the user's real payment).
- `scripts/` still contains only the documented tooling — one-off debug
  scripts created and removed during this session's investigation.

---

## 2026-09-02 (still later) — Live Razorpay keys received, deliberately not activated

User pasted **live** Razorpay credentials (`rzp_live_...`) mid-session, right
after we'd been attempting Razorpay's own onboarding "test transaction" step
(which uses test keys and fake test cards — pasting live keys there would
have meant a real card and real money, not what that step is for). Asked the
user to confirm intent before touching anything; they chose to just store
them for later rather than go live now.

**Current state — read this before changing Razorpay config:**

- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `NEXT_PUBLIC_RAZORPAY_KEY_ID`
  in `.env.local` are the **active** config the app actually reads
  (`src/lib/razorpay/client.ts`) — still the **test** keys from earlier this
  session. Nothing about runtime behavior changed when the live keys arrived.
- `RAZORPAY_LIVE_KEY_ID` / `RAZORPAY_LIVE_KEY_SECRET` are stored in
  `.env.local` under those distinct names, **not read anywhere in the
  codebase** (confirmed via `grep -rn "RAZORPAY_LIVE" src/` → no matches).
  They just sit there until a deliberate go-live decision.
- Going live is a **rename**, not new integration work: swap the live values
  into `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`NEXT_PUBLIC_RAZORPAY_KEY_ID`
  when actually ready to accept real payments. Don't do this reflexively
  because a task mentions Razorpay — confirm with the user first, the same
  way this session did.
- Both the test and the live secret have now been pasted into this chat's
  history. Test-mode exposure is low-stakes; **the live secret is not** —
  recommend rotating it in the Razorpay dashboard before actually going live,
  regardless of when that happens.

---

## 2026-09-02 (later) — Razorpay added as a second, working payment provider

### Why

Dodo Payments account verification is still pending (~72h, see prior entry).
User provided real Razorpay **test-mode** credentials mid-session and asked
for Standard Checkout integration, explicitly wired into the *existing*
`orders`/`order_items`/`customers`/`deliveries` tables rather than parallel
tracking. `.env` convention was adapted to this project's established
`.env.local` (not a new top-level `.env`).

### What's built

- **`src/lib/payments/fulfill-order.ts`** — the order/order_items/customer/
  delivery write path, extracted out of the Dodo webhook so both providers
  share one fulfillment implementation instead of two copies drifting apart.
  Dodo's webhook handler was refactored to call this too — no behavior
  change there, just deduplication.
- **`src/lib/razorpay/client.ts`** — server-only SDK client +
  `verifyRazorpayPaymentSignature()`. Uses Razorpay's own
  `validatePaymentVerification` utility (deep-imported from
  `razorpay/dist/utils/razorpay-utils` — not re-exported from the package
  root) rather than a hand-rolled HMAC comparison, so the constant-time
  compare is Razorpay's, not a reimplementation.
- **`/api/razorpay/create-order`** — looks up the product, creates a real
  Razorpay order, stores `{orangelink_product_id, orangelink_creator_id,
  email, name}` in the order's `notes` (Razorpay-hosted, not client-supplied)
  so verification doesn't have to trust anything the browser sends.
- **`/api/razorpay/verify-payment`** — verifies the HMAC signature, then
  **re-fetches the order from Razorpay** (not the client's claim) to read
  back the canonical product/creator/amount before calling `fulfillOrder()`.
  Synchronous, unlike Dodo — the buyer's download link comes back in the same
  response, no polling needed.
- **`CheckoutModal`** — now branches on `razorpayKeyId()` vs the Dodo path.
  Razorpay is used whenever configured (it's the one with real keys right
  now); the existing Dodo inline-checkout code is untouched and will resume
  being viable once that account clears verification. This is a same-page
  provider choice, not a fallback-on-failure.
- Razorpay's `checkout.js` is loaded on demand (`load-checkout-script.ts`) —
  there's no ESM package for the browser widget, only the server-only Node
  SDK, so a plain `<script>` tag is unavoidable here.

### Verified for real, not just typechecked

Everything below hit Razorpay's actual test-mode API with the real
credentials, not a mock:

1. `POST /api/razorpay/create-order` → real order created
   (`order_TXDiRw53YVBguC`), confirmed against a real seeded product.
2. A **genuinely HMAC-signed** payload (order_id + "|" + payment_id, signed
   with the real `RAZORPAY_KEY_SECRET` — the same computation a real
   successful payment produces) → `verify-payment` accepted it, and the
   resulting row was confirmed in Postgres: real order, real customer with
   `lifetime_value_cents` updated, correct product linkage.
3. A **forged signature** → rejected with 400, nothing written.
4. The **same genuine payload submitted twice** → second call returned
   `{ok:true}` (doesn't error the buyer out) but the DB still shows exactly
   **one** order row — idempotency via the unique index on
   `provider_payment_id` holds under duplicate verification, not just
   duplicate webhooks.
5. In-browser: clicking "Continue to payment" on `/jane`'s product page
   genuinely loads `window.Razorpay`, and Razorpay's own hosted checkout
   iframe (`api.razorpay.com/v1/checkout/public`, `display:block`,
   full-viewport, real session id) mounts. A real card payment was **not**
   driven through the cross-origin iframe — that's beyond reasonable
   automation and unnecessary given step 2 already proves the verify+fulfill
   path against a real signature.
6. Test order/customer rows created during verification were deleted
   afterward — `orders` is back to 0 rows, matching the documented baseline.

Full regression suite (SSRF, extraction, route-gate, anon-lockdown) re-run
green after this change — nothing in Milestone 0–3 or the existing Dodo path
regressed.

### Known gaps in the Razorpay path

- **No real browser card payment completed, and it can't be automated —
  confirmed, not just untried.** The create+verify+fulfill pipeline is
  proven with a genuine signature (point 2 above), but a follow-up attempt to
  actually drive Razorpay's hosted card form through browser automation hit a
  hard wall: the card fields live inside a genuinely cross-origin iframe
  (`api.razorpay.com`), deliberately isolated by the browser's same-origin
  policy for PCI-DSS compliance — confirmed by walking the frame tree from
  page JS (`contentDocument` access throws). No script, including browser
  automation, can reach into it; only a human clicking through the actual UI
  can complete this. That's expected/correct security behavior, not a bug to
  fix. **Test card for whoever does this by hand:** 4100 2800 0000 1007, CVV
  123, expiry 12/26, on `/jane/p/<product-id>` → Buy now.
- **Currency is passed through as-is** (e.g. `USD` on the seeded products) —
  worked in this test-mode account, but whether a given Razorpay account can
  actually settle in a specific non-INR currency is an account-level setting
  this code doesn't check.
- **No order bump / coupon logic** on the Razorpay path either — same gap as
  Dodo, still deferred.
- **`RAZORPAY_KEY_SECRET` was shared directly in this chat conversation.**
  It's a test-mode secret (low stakes — no real money movement), but if this
  conversation's history is ever shared or logged elsewhere, consider
  rotating it in the Razorpay dashboard.

### Next concrete step

Razorpay is the working path right now — a real end-to-end purchase (actual
card entry through the hosted checkout) on `/jane` is the one thing left to
click through by hand to close this out completely. When Dodo's verification
clears, follow the existing Dodo next-steps below; no changes needed to make
the two coexist since `CheckoutModal` already picks whichever is configured.

---

## 2026-09-02 — Milestone 4 (Products & Checkout), partially complete

### Where the project is

Milestones 0–3 are done and running against the real Supabase project (no mock
data anywhere). Milestone 4 is **built but only half-verified** — see below.

### Completed and verified this session

Product management, end to end against the real database:

- **Product CRUD** — create / edit / delete via `ProductsManager` +
  `products/actions.ts`. Verified by reading rows back out of Postgres after
  each operation, not by trusting the UI. Confirmed `18.00` → `price_cents:
  1800`.
- **Digital file upload** — private `product-files` Storage bucket
  (`migrations/0003`). Uploaded a real file through the app, confirmed the
  exact bytes came back out of Storage, and confirmed deleting the product
  also removed the object.
- **Storage lockdown** — service-role can upload / sign / read; anon key is
  refused on download, upload, and list. Bucket is `public: false` with RLS on
  and zero policies, so only service-role reaches it.
- **Dodo SDK integration written against real types.** The published docs
  were incomplete (the `OneTimePrice` schema and the `payment.succeeded`
  payload were not retrievable from the docs site or the OpenAPI URL), so the
  field shapes came from reading `node_modules/dodopayments/**/*.d.ts` and
  `@dodopayments/core/dist/schemas/webhook.d.ts` directly. Anything uncertain
  is pinned to a type in the installed package rather than a guess.

### Built but NOT yet verified — needs Dodo credentials

Dodo Payments account is **pending verification (~72 hours as of 2026-09-02)**,
so there is no API key yet. These paths compile, typecheck, and lint clean, but
have never made a real API call:

- `syncProductToDodo()` — mirrors a product into Dodo on create/edit
- `createCheckoutSession()` — inline (not redirect) checkout session
- `/api/webhooks/dodo` — `payment.succeeded` → `orders` → `order_items` →
  `deliveries` (signed download URL)
- The polling loop in `CheckoutModal` that waits for the webhook to land

What *is* verified is that all of this **degrades honestly without keys**: the
products page shows a "payments aren't connected" banner, and attempting
checkout returns *"Payments aren't connected yet for this creator."* rather
than crashing or silently faking a purchase.

### Bugs found and fixed this session

1. **Test-script bug, not an app bug — don't re-investigate.**
   While testing the product edit form, submits kept redirecting to `/login`
   and it looked like a broken/expiring session. The real cause:
   `document.querySelector('form')` in my browser test script was selecting the
   **Topbar's "Sign out" form**, not the modal's form — the modal renders
   through a portal and lands *later* in DOM order, so the bare selector
   matched the wrong one and the script was literally clicking sign-out.
   *Fix:* scope the query to the modal first —
   `document.querySelector('[role="dialog"]').querySelector('form')`.
   The app was correct the whole time. Server logs (`└─ ƒ signOut()`) were what
   gave it away; the UI symptom was misleading.

2. **`Webhooks()` crashed the production build when unconfigured.**
   `@dodopayments/nextjs`'s `Webhooks()` validates its secret *eagerly at
   construction*, so an empty `DODO_PAYMENTS_WEBHOOK_KEY` threw during
   `next build` — failing the whole build, not just requests.
   *Fix:* only construct the handler when a key exists; otherwise export a
   route that returns 501. See `src/app/api/webhooks/dodo/route.ts`.

3. **`CheckoutModal` claimed payments were configured when they weren't.**
   The client checked `NEXT_PUBLIC_DODO_PAYMENTS_ENVIRONMENT` to decide whether
   checkout worked — but that public var only selects test/live *mode*. The
   thing that actually determines it (`DODO_PAYMENTS_API_KEY`) is server-only
   and a client component can never see it. Result: the button rendered enabled
   with no warning while checkout was impossible.
   *Fix:* removed the client-side guess entirely. The modal now always attempts
   `startCheckout()` and displays whatever the server honestly reports. General
   rule for this codebase: **never infer server capability from a
   `NEXT_PUBLIC_` var.**

### Known issues / open items

- **Products are not synced to Dodo.** Both seeded products have
  `dodo_product_id: null`. They'll sync automatically on the next edit once a
  key is present — the orange dot on each product card flags this state.
- **`BUILD_BRIEF.md` still says Stripe.** Milestone 4 uses Dodo Payments per
  your decision. The brief hasn't been amended; README and
  `.env.local.example` reflect Dodo.
- **Order bumps and coupon codes are not built.** Both are in the brief's
  Milestone 4 scope (`product_offers`, `coupons` tables exist, unused).
  Deferred until the core purchase loop is proven working.
- **Cover images not implemented.** `cover_image_url` exists on the product
  row; the UI shows a grey placeholder. Only the digital *file* upload is wired.
- **AI import cleanup still unverified.** From last session: the Anthropic key
  is valid but the account has **no credits**, so the Haiku cleanup path has
  never actually run. Import works regardless and names the reason.
- **Still outstanding from the brief:** `connected_accounts` /
  `esp_integrations` store tokens in plaintext. Move to Vault before
  Milestones 5/7 ship.

### Next concrete step

When the Dodo account clears verification:

1. Paste into `.env.local`: `DODO_PAYMENTS_API_KEY` and
   `DODO_PAYMENTS_WEBHOOK_KEY` (Dashboard → Developer → API Keys / Webhooks),
   keeping `DODO_PAYMENTS_ENVIRONMENT=test_mode`.
2. Point a Dodo webhook endpoint at `/api/webhooks/dodo`. Local testing needs a
   public tunnel, or use the Dodo CLI's webhook forwarding.
3. Edit either seeded product to trigger the first `syncProductToDodo()` and
   confirm `dodo_product_id` gets populated.
4. Run one real test-mode purchase through `/jane` and confirm the full loop
   closes: checkout session → payment → webhook → `orders` row →
   signed download URL surfaced in the modal.

The `orders` table is currently empty (0 rows), so anything appearing there is
from that first real test.

### Environment state at handoff

- Dev server **left running** on port 3000 (intentionally — in use as a live
  reference while Figma mockups are being drawn). `npm run dev` to restart it
  if it has since been closed.
- `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all clean (21 routes).
- Regression suite green: SSRF guard, extraction, route gating, anon lockdown.
- Database matches the seed: 2 products, 0 orders, no orphaned Storage objects.
  `node scripts/seed.mjs` is idempotent if a reset is ever wanted.
- **Not a git repository** — there is no version control here, so nothing is
  committed and there's no history to fall back on. Worth running `git init`
  early next session; `.gitignore` is already in place and correctly excludes
  `.env.local`.
- `scripts/` contains only the documented tooling; one-off debug scripts were
  removed.
