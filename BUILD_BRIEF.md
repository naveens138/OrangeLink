# Build Brief — Creator SaaS

*Hand this file, along with `schema.sql` and the Vision doc, to Claude Code (or a developer) as the starting context for scaffolding the project.*

---

## 1. What We're Building

A creator "operating system" — one public page (link-in-bio + storefront + portfolio) backed by a dashboard where creators manage links, products, orders, customers, analytics, and growth automation.

**Reference docs in this same handoff:**
- `Creator_SaaS_Vision_and_Features.md` — full feature rationale, competitive positioning, build order reasoning
- `schema.sql` — complete Postgres/Supabase schema (23 tables), already designed against the feature set below
- `DESIGN_SYSTEM.md` — complete visual design system (tokens, typography, spacing, motion, screen-by-screen specs for dark/light + desktop/mobile). **This is the single source of truth for all visual implementation — every component built must pull from its tokens, not invented values.**

This brief translates those into a concrete technical scaffold and build sequence.

---

## 2. Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Backend/DB/Auth/Storage:** Supabase (Postgres, Auth, Storage, RLS)
- **Payments:** Stripe (Checkout + Payment Intents; Apple Pay/Google Pay via Stripe's built-in support)
- **Transactional email:** Resend
- **Deployment:** Vercel
- **Drag-and-drop:** dnd-kit
- **Animation:** Framer Motion
- **Fonts:** Geist Sans (UI), Geist Mono (numeric/transaction data) — per `DESIGN_SYSTEM.md`
- **Design tokens:** implement `DESIGN_SYSTEM.md` §2–3 (dark/light color tokens), §4 (typography scale), §5 (spacing/layout), §6 (radius) as Tailwind theme config / CSS variables before building any screen

---

## 3. Project Structure (target)

```
/app
  /(public)
    /[username]                 → public creator page (reads from `pages`/`blocks`)
    /[username]/p/[productId]   → product detail/checkout page
  /(dashboard)
    /dashboard
      /page.tsx                 → overview
      /links                    → block editor (drag-and-drop)
      /products                 → product CRUD, order bumps
      /orders                   → order list, customer LTV
      /analytics                → funnel/attribution dashboard
      /automations              → comment-to-DM rules
      /email                    → subscriber list, ESP integration settings
      /domains                  → custom domain setup
      /import                   → migration/import wizard
      /media-kit                → auto-generated media kit editor
      /settings
  /api
    /webhooks/stripe            → payment confirmation → order status update → delivery trigger
    /webhooks/meta              → Instagram/Facebook comment events → automation_events
    /checkout                   → create Stripe PaymentIntent/Checkout Session
    /import                     → trigger scrape/parse job for migration
/lib
  /supabase                     → client + server helpers
  /stripe
  /analytics                    → event logging helpers, visitor cookie handling
/components
  /blocks                       → one component per block type (link, product, embed, email_capture, booking...)
  /dashboard
  /ui                           → shared primitives
/supabase
  schema.sql                    → (the file already provided)
  seed.sql                      → sample data for local dev
```

---

## 4. Build Order (matches Vision doc §9, translated into engineering milestones)

**Milestone 0 — Design System Foundation** *(build before any screen)*
- Implement `DESIGN_SYSTEM.md` tokens as Tailwind theme config (dark + light color tokens, typography scale, spacing, radius)
- Set up theme provider/toggle (dark/light), respecting `prefers-reduced-motion`
- Build core primitives per design system: buttons, inputs, cards, modals/sheets — using tokens only, no invented values
- Responsive shell: desktop sidebar (240px) + mobile bottom nav/drawer, per §10–11
- This is P0 per `DESIGN_SYSTEM.md` §16 — nothing else should be styled until this exists

**Milestone 1 — Foundation**
- Next.js + Tailwind + Supabase project setup, env vars, auth (email + Google OAuth)
- `creators` table wiring: signup → username claim → row created
- Public page route `[username]` rendering an empty page shell
- Custom domain support (CNAME verification + SSL via Vercel domains API)
- Design reference: `DESIGN_SYSTEM.md` Screen 01 (Signup) and Screen 02 (Claim Username) — editorial split layout on desktop, single-column on mobile, live username availability check

**Milestone 2 — Page Editor & Blocks**
- Block-based drag-and-drop editor (dnd-kit) writing to `blocks` table
- Block types: link, text, image, social_icons, embed, divider, header
- Theme/customization panel writing to `pages.theme` jsonb — limited to the curated presets in `DESIGN_SYSTEM.md` §12 (Minimal/Warm/Soft/Creator), no arbitrary CSS in MVP
- Public page renders blocks in order, respecting `is_visible`, scheduling, password protection
- Design reference: `DESIGN_SYSTEM.md` Screen 03 (Page Builder) — 3-panel desktop layout (library/canvas/inspector), bottom-sheet pattern on mobile, block visual rules table

**Milestone 3 — Migration/Import**
- Import wizard UI: paste source URL → call `/api/import` → scrape public page → populate `import_jobs.raw_scraped_data`
- Parser per source platform (start with Linktree + Stan, since they're most common) → normalize into `parsed_blocks`
- Review/preview screen before committing to real `blocks` rows
- Manual-paste fallback with AI-assisted parsing for anything unstructured
- Design reference: `DESIGN_SYSTEM.md` Screen 04 (Import) — progressive feedback states (Fetching → Analyzing → Ready → Imported), never silently overwrite, undo option required

**Milestone 4 — Products & Checkout**
- Product CRUD (dashboard) → `products` table
- Product block type renders on public page
- Stripe Checkout Session creation (`/api/checkout`) — no-redirect embedded flow, Apple Pay/Google Pay enabled
- Stripe webhook → `orders`/`order_items` → `deliveries` (signed URL generation for digital files)
- Order bump UI at checkout time (`product_offers` table)
- Coupon code support
- Design reference: `DESIGN_SYSTEM.md` Screen 05 (Product Setup) — editor + live preview split on desktop; Screen 06 (In-page Checkout) — checkout must feel native to the page, never a redirect, hierarchy is Product → Price → Email → Payment → Total → CTA → Confirmation

**Milestone 5 — Email Capture**
- `email_capture` block type → writes to `email_subscribers`
- ESP integration settings (ConvertKit/Beehiiv/MailerLite) — API key connect + sync on capture
- Basic tagging by source (`page_capture`, `checkout`, `comment_dm`, `import`)
- Design reference: `DESIGN_SYSTEM.md` Screen 07 (Email Capture) — treat as a premium content block, success state replaces the form rather than just a toast

**Milestone 6 — Analytics & Attribution**
- Visitor cookie/localStorage ID assignment on first page load
- Event logging helper (`page_view`, `block_click`, `product_view`, `checkout_start`, `checkout_complete`)
- UTM capture on landing, persisted to `visitors`
- Dashboard funnel view: visits → clicks → product views → checkouts, by source
- Pixel embed settings (Meta Pixel, GA4, TikTok Pixel) → injected into public page head

**Milestone 7 — Comment-to-DM Automation**
- Meta Graph API app setup (Instagram + Facebook), webhook subscription for comments
- Automation rule builder UI → `automation_rules`
- Webhook handler (`/api/webhooks/meta`) → keyword match → send DM via Graph API → log to `automation_events`
- TikTok/YouTube: implement as "public auto-reply" only, clearly labeled as different from DM

**Milestone 8 — Media Kit**
- OAuth connect flow for IG/YouTube/TikTok stat pulls → `connected_accounts`
- Scheduled job (cron) to snapshot stats → `platform_stats_snapshots`
- Public media kit page (`media_kits.public_slug`) rendering current stats + trend

**Milestone 9 — Calendly Embed**
- `booking` block type → embeds Calendly widget or deep-links to creator's Calendly URL

**Milestone 10 — Polish / Later**
- Buffer-style scheduling (likely deferred to integration, not native build — revisit based on demand)
- Zapier/Make webhook integration
- One-time-payment pricing tier (business decision, not blocking engineering)

---

## 5. Key Engineering Notes / Constraints

- **RLS is already defined in schema.sql** — creators can only read/write their own rows. Public-facing pages need a separate read path (server-side Supabase service role, filtered to `published = true`) rather than loosening RLS broadly.
- **Signed URLs for digital file delivery** — never expose raw storage URLs for paid products; generate short-lived signed URLs at delivery time only.
- **Comment-to-DM is platform-limited by design** — don't build a unified abstraction that pretends TikTok/YouTube support DMs the way Meta does. Keep `response_type` explicit (`dm` vs `public_reply`) and surface this honestly in the UI.
- **Attribution fields are denormalized onto `orders`** at checkout time for fast dashboard reads — don't make the analytics dashboard join through the full event stream for basic funnel numbers; use the events table for deep drill-down only.
- **Migration import must include a human review step** — never auto-publish scraped/parsed content without the creator confirming it in a preview screen.
- **Secrets/tokens** (Meta access tokens, ESP API keys) should be encrypted at rest — use Supabase Vault or app-level encryption, not plaintext columns, despite what the raw schema.sql shows for simplicity.
- **No off-token styling** — every color, spacing value, radius, and animation timing must trace back to `DESIGN_SYSTEM.md`. If a component needs a value not in the token set, that's a signal to revisit the design system, not invent a one-off.
- **Dark and light mode are both P0, not sequential** — build every component against both themes at once per `DESIGN_SYSTEM.md` §0, not light-mode-first-then-retrofit-dark (or vice versa).

---

## 6. What NOT to Build Yet

Per the Vision doc — explicitly out of scope until there's real user demand:
- Native email automation/drip sequences (integrate with ESPs instead)
- Full course/LMS platform (quizzes, certificates, drip content)
- Native calendar/booking system (embed Calendly instead)
- Membership/subscription billing (Patreon-style)
- Native social scheduling (Buffer-style) — integrate or defer

---

## 7. First Working Demo Target

The smallest version that tells a complete story: **signup → claim username → build page with blocks → import from Linktree/Stan in one click → sell one digital product with in-page checkout → capture an email.** That's Milestones 0–5. This exact loop is also the entire scope of `DESIGN_SYSTEM.md` (its §9 Screen Map covers precisely these 8 screens) — the two documents are scoped to match. Per `DESIGN_SYSTEM.md` §15, this should feel like **one continuous product loop**, not disconnected screens: consistent app chrome throughout, the creator-facing page becoming progressively more expressive, and checkout becoming quieter/more trustworthy as it approaches payment.
