# Creator SaaS — MVP Design System

*Desktop + Mobile · Dark + Light · Covers Milestones 1–4 + basic Milestone 5*
*Visual reference: Rare UI (motion/component polish) + Outpace Studios (editorial typography/conversion layout) — reference only, never copy branding, logos, or exact layouts.*

This is the single source of truth for visual design. Every component must use these tokens. Do not invent colors, radii, spacing, or animation timings outside this document.

---

## 0. Non-Negotiable Rules

- Light theme is primary — white background, grey secondary text/surfaces, orange as the sole accent. Dark mode is deferred (see §3), not required for current screens.
- Grey is the only secondary color family — never introduce a second accent hue alongside orange.
- Desktop and mobile are both first-class layouts — mobile is never a shrunk desktop.
- Font: Geist Sans (UI), Geist Mono (numeric/transaction data).
- Use motion for meaningful interaction; respect `prefers-reduced-motion`.
- Subtle borders/surfaces over heavy shadows.
- Orange is the primary accent — do not turn the whole UI orange.
- Do not copy Rare UI / Outpace branding, copy, logos, or layouts — reference for polish/hierarchy only.
- Visual goal: premium, editorial, conversion-focused, calm, highly interactive.

---

## 1. Brand Personality

| Attribute | Rule |
|---|---|
| Premium | Quiet surfaces, excellent typography, precise spacing |
| Creator-first | Expressive, not chaotic |
| Conversion-focused | Primary actions visually obvious and frictionless |
| Editorial | Large headlines, deliberate whitespace |
| Technical | Clean controls, data clarity, consistent components |
| Playful | Motion/interaction instead of excessive color |
| Trustworthy | Checkout, payments, imports, publishing feel calm and secure |

---

## 2. Theme Tokens — Light (Primary)

| Token | Value | Use |
|---|---|---|
| background | `#FFFFFF` | Main app background |
| surface-1 | `#FFFFFF` | Primary cards/panels (bordered, not tonally distinct from bg) |
| surface-2 | `#F5F5F5` | Secondary/supporting surfaces — testimonial-style cards |
| surface-3 | `#ECECEC` | Menus/hover |
| text-primary | `#111111` | Primary text, headline emphasis |
| text-secondary | `#6B6B6B` | Muted grey — subheadings, body copy, headline first line |
| text-muted | `#9A9A9A` | Labels/placeholders |
| border | `rgba(17,17,17,.08)` | Default border |
| border-strong | `rgba(17,17,17,.16)` | Hover/active border |
| accent | `#FF4812` | Sole accent — primary actions, icon marks, active states |
| accent-hover | `#DE3F10` | Hover |
| accent-soft | `rgba(255,72,18,.08)` | Selected/accent background |
| success | `#16803C` | Success |
| warning | `#A15C00` | Warning |
| danger | `#C9362B` | Error |

**Rules:** White is the base, not off-white — reserve tone entirely for `surface-2`/`surface-3` so cards read as a deliberate step down, not a muddy background. Grey (`text-secondary`, `text-muted`, `surface-2`) is the only secondary color family — never introduce a second accent hue. Orange stays confident: solid fills on feature cards and icon marks, not just thin outlines or small dots.

## 3. Theme Tokens — Dark (Deferred)

Not used in current screens. Preserved here only so a future dark mode doesn't require reinventing the scale — do not implement until specifically prioritized.

| Token | Value | Use |
|---|---|---|
| background | `#0D0D0D` | Main app background |
| surface-1 | `#121212` | Primary cards/panels |
| surface-2 | `#171717` | Elevated cards |
| surface-3 | `#1D1D1D` | Menus/dialogs/hover |
| text-primary | `#FFFFFF` | Primary text |
| text-secondary | `#A3A3A3` | Body/supporting text |
| text-muted | `#6F6F6F` | Labels/placeholders |
| border | `rgba(255,255,255,.08)` | Default border |
| border-strong | `rgba(255,255,255,.14)` | Hover/active border |
| accent | `#FF5A2E` | Primary action |
| accent-hover | `#FF7040` | Hover |
| accent-soft | `rgba(255,72,18,.10)` | Selected/accent background |
| success | `#22C55E` | Success |
| warning | `#F59E0B` | Warning |
| danger | `#EF4444` | Error |

---

## 4. Typography

| Style | Desktop | Tablet | Mobile | Weight |
|---|---|---|---|---|
| Display | 72–80px / .95 | 60–64px / .98 | 42–48px / 1.0 | 700 |
| H1 | 48px / 1.0 | 42px / 1.03 | 34–38px / 1.05 | 650–700 |
| H2 | 36px / 1.05 | 32px / 1.08 | 28px / 1.1 | 650 |
| H3 | 24px / 1.15 | 22px | 20px | 600 |
| Body Large | 18px / 1.55 | 17px | 16px / 1.5 | 400 |
| Body | 15px / 1.5 | 15px | 15px / 1.5 | 400 |
| Small | 13px / 1.4 | 13px | 12px / 1.4 | 400–500 |
| Label | 12px / 1.3 | 12px | 12px | 500 |

- Font family: Geist Sans. Numeric/transaction values: Geist Mono.
- Large headings: negative tracking ~-0.045em to -0.06em.
- Avoid all-caps body copy; small uppercase labels OK for section metadata.

---

## 5. Spacing + Layout

| Token | Value |
|---|---|
| Base unit | 4px |
| Spacing scale | 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 120 |
| Desktop container | 1200px max |
| Wide container | 1280px max |
| Desktop page padding | 32px |
| Tablet page padding | 24px |
| Mobile page padding | 16px |
| Desktop grid | 12 columns / 16–24px gap |
| Tablet grid | 8 columns / 16–20px gap |
| Mobile grid | 4 columns / 12–16px gap |

## 6. Radius

Exactly three values, used everywhere — no other radius should appear in the product.

| Token | Value | Use |
|---|---|---|
| sm | 8px | Buttons, icon marks, small controls |
| md | 16px | Cards, inputs, panels |
| pill | 999px | Nav bars, tags, badges |

**Note:** this supersedes the old 7-step scale (`xs`–`2xl`). Buttons move from full-pill to `radius-sm` — a deliberate change from the previous direction; `pill` is now reserved for nav/tag/badge shapes only.

## 7. Shadows + Elevation

- Default cards: surface + border, not a visible shadow.
- Dropdown/dialog (dark mode): `0 20px 60px rgba(0,0,0,.25)`.
- Light mode shadows softer, lower opacity.
- No neon glows — accent glow only for focused/high-value interactions.

## 8. Motion

| Motion | Duration | Use |
|---|---|---|
| Micro | 100–120ms | Icon/button state |
| Fast | 160–180ms | Hover, tabs |
| Normal | 200–240ms | Menus/cards |
| Slow | 300–400ms | Panels/page transitions |
| Spring | stiffness 400 / damping 30 | Interactive movement |

- Hover card: `translateY(-2px to -4px)`
- Button press: `scale(.97)`
- Primary CTA hover: `translateY(-1px)` + slight brightness increase
- Spring animation for: block drag/reorder, tabs, selected indicators, preview interactions
- Respect `prefers-reduced-motion`

---

## 8a. Composition Patterns (Outpace / Rare-inspired)

Adapt these — never copy Outpace/Rare branding, copy, or exact layouts (see §0).

- **Two-tone oversized headline.** Pair a muted-grey first line (`text-secondary`, Display style) with a solid `text-primary` second line for emphasis — e.g. "Create your account. / Start selling today." Use for hero/entry-point headlines, not body copy.
- **Solid-color feature cards.** Full `accent`-fill card, single icon mark (white or high-contrast on the fill), short headline, one supporting sentence. Keep undecorated — no gradients, no drop shadows on top of the solid fill.
- **Soft grey testimonial/quote cards.** `surface-2` fill, `radius-md`, no border needed at this tone step. Use for supporting/secondary content that shouldn't compete with the accent cards.
- **Floating pill bottom nav.** `radius-pill`, `surface-1` fill with `shadow-elevated`, positioned with margin from the viewport edge, not flush. Use only where the app shell calls for persistent bottom navigation (mobile primarily).
- **Layout is center-focused, not edge-anchored.** Content sits in the middle of the viewport with generous margin on all sides rather than pinned to an edge-to-edge split. Favor vertical rhythm — check the whitespace above/below a text block against the inspo before adding the next element.

---

## 8b. Block Editor States

- **Pill tab switcher.** Two-option toggle (e.g. "Links" / "Shop") in a `rounded-pill border border-current/15 p-1` container; the active option gets a filled `surface`/`accent` pill background, the inactive option is transparent text-only. Used for the public page's Links/Shop split (`src/components/public/public-page-view.tsx`) — only render the switcher when there are genuinely two populated sections to switch between; a single-section page skips it entirely rather than showing a disabled or empty tab.
- **Locked block state.** A block that isn't accessible yet (password-protected, follow-to-unlock) renders as a `rounded-pill border border-current/15` CTA the same height as a normal link block, with a small `Lock` icon and a short instruction label ("Follow on Instagram to unlock") in place of its real content — never a greyed-out disabled-looking version of the block itself. Once unlocked, the CTA is replaced by the actual block content, not layered over it. Established by `PasswordGate`, reused by `FollowUnlockGate` (`src/components/blocks/follow-unlock-gate.tsx`) for the honor-system follow-to-unlock pattern.

---

## 9. MVP Screen Map

| # | Screen | Desktop | Mobile | Core Goal |
|---|---|---|---|---|
| 01 | Signup | Centered split/editorial | Single-column | Create account |
| 02 | Claim Username | Centered identity form | Single-column | Reserve public URL |
| 03 | Page Builder | 3-panel editor | Editor + preview mode | Build creator page |
| 04 | Import | Import modal/flow | Full-screen sheet | Import Linktree/Stan |
| 05 | Product Setup | Product editor + live preview | Stacked editor | Create one digital product |
| 06 | In-page Checkout | Checkout card/modal | Bottom sheet/full screen | Complete purchase |
| 07 | Email Capture | Block + success state | Stacked form | Capture visitor email |
| 08 | Public Creator Page | Responsive public page | Mobile-first public page | Experience creator storefront |

### Screen 01 — Signup
- **Desktop:** Center-focused, not edge-anchored — no 48/52 split. Content column (max ~460px) sits centered in the viewport with generous margin on all sides, matching Outpace hero spacing. Two-tone headline (`text-secondary` line + `text-primary` line) sits above the form with generous vertical rhythm before the first field. Full-width primary CTA (`radius-sm`, `accent` fill). Neutral-styled social button (`radius-sm`, `surface-1`, bordered).
- **Mobile:** Same centered composition, single column, 16px side padding. Headline, then generous spacing (40–56px), then form. Full-width CTA, min 44px input/button height, keyboard-safe bottom spacing.
- **Hierarchy:** Logo → two-tone headline → supporting text → auth methods → divider → email/password → primary CTA → legal text.

### Screen 02 — Claim Username
- **Desktop:** Large confident headline. Username input feels like a URL builder. Live availability state next to input. Immediate preview of resulting public URL. CTA disabled until valid. Subtle success animation on availability.
- **Mobile:** Input + URL preview stack vertically. Availability feedback stays adjacent to field. CTA fixed near bottom only if it doesn't obstruct keyboard.
- **Component:** `https://yourbrand.com/username` — prefix and username visually distinct. Valid = success color + check. Invalid = danger color + concise message. Checking = muted animated indicator.

### Screen 03 — Page Builder
- **Desktop (3-zone):** Left = block library/nav (~240px). Center = canvas/editor. Right = block properties/inspector (~300–340px). Top bar = save state, preview, theme, publish. Canvas resembles the public page. Builder chrome neutral; creator content gets visual focus. Subtle grid/snap indicators while editing only.
- Selected block gets accent border or accent-soft outline. Drag handle appears only on hover/selection — never permanently shown.
- **Mobile:** Never squeeze 3 desktop panels in. Top bar: back, page name, preview, publish. Canvas is default view. Block library = bottom sheet. Block settings = full-height bottom sheet. Preview = dedicated screen. Touch-draggable. Controls reachable one-handed.

**Block visual rules:**
| Block | Style |
|---|---|
| Text | Editorial typography, generous spacing |
| Image | 16px radius, image-first |
| Link/Button | Pill or soft rounded button |
| Social links | Compact icons, minimal chrome |
| Product | Image + title + price + CTA |
| Email capture | Strong headline + single field + CTA |
| Divider | Very subtle 1px line |

### Screen 04 — Import (Linktree/Stan)
- **Desktop:** Large centered modal or dedicated workspace. Two choices: paste URL or select supported source card (Linktree, Stan). Preview detected blocks before applying. Primary = Import, secondary = Start from scratch. Progressive feedback: Fetching → Analyzing → Ready → Imported.
- **Mobile:** Full-screen sheet, not a small modal. Full-width URL input. Detected blocks as vertical preview list, deselectable. Import CTA stays accessible at bottom.
- **Result rules:** Never silently overwrite an existing page. Show imported block count. Show warnings for unsupported content. Provide undo immediately after import.

### Screen 05 — Digital Product Setup
- **Desktop:** Two-column — editor ~55%, live preview ~45%. Prominent product image, visually strong price, editorial typography for title/description. CTA preview must match public checkout CTA.
- **Mobile:** Stack fields vertically. Preview below editor or via toggle. Price/status stay visible while editing. Save/publish can be sticky bottom.

**Minimum fields:** Product name (required), Description (short/readable), Price (required), Cover image (optional, encouraged), Digital file/link (required), Checkout CTA (defaults to "Buy now").

### Screen 06 — In-page Checkout
**Core principle:** feels like part of the creator's page, never a redirect to an unrelated payment portal.
- **Desktop:** In-page modal/drawer or embedded panel, max width 480–560px. Background page visible but subdued. Product summary stays visible. Email field prominent, payment section follows. Primary payment CTA is the strongest visual element. Trust/security microcopy small and quiet. Order total always visible before payment.
- **Mobile:** Full-screen checkout or bottom sheet. Product title + price pinned near top. Full-width inputs. Sticky payment CTA where appropriate. No multi-column layout. Never navigate away from the creator page.
- **Hierarchy:** Product → Price → Email → Payment → Total → Primary CTA → Confirmation.

### Screen 07 — Email Capture
- **Desktop:** Premium content block, not a generic newsletter widget. Strong short headline, one field + one CTA, optional supporting sentence. Success state replaces the form (not just a toast).
- **Mobile:** Single column, field + CTA stacked, 48px CTA height, success state fits viewport without scrolling.

### Screen 08 — Public Creator Page
- **Desktop:** Feels separate from builder chrome. Centered identity area (avatar + name + short bio). Links/products arranged vertically or in a controlled grid. Max content width ~640–760px. Creator-selected theme background while retaining system readability.
- **Mobile:** Mobile-first. 16px side padding. Identity visible immediately. Full-width buttons/product cards. No hover-dependent comprehension — touch feedback replaces hover.

---

## 10. Responsive Breakpoints

| Breakpoint | Layout Behavior |
|---|---|
| ≥1440px | Wide desktop; 1200–1280px content |
| 1280–1439px | Standard desktop; 1200px content |
| 1024–1279px | Compact desktop/tablet; reduce side panels |
| 768–1023px | Tablet; collapse inspector/navigation where needed |
| <768px | Mobile; single-column and bottom sheets |
| <480px | Small mobile; tighter type and 16px page padding |

## 11. Desktop vs Mobile Component Rules

| Component | Desktop | Mobile |
|---|---|---|
| App navigation | 240px sidebar | Bottom nav / drawer |
| Top bar | 64px | 56px |
| Page padding | 32px | 16px |
| Card padding | 24px | 20px |
| Primary button | 44px | 48px |
| Input | 44px | 48px where form-heavy |
| Modal | Centered 480–640px | Full screen/bottom sheet |
| Builder | 3-panel | Canvas + sheets |
| Product editor | 2-column | Stacked |
| Checkout | 480–560px panel | Full screen/sheet |
| Charts | 2-column possible | Single column |
| Tables | Full table | Cards/list |
| Hover | Supported | Never required |

## 12. Public Page Theme Presets

Creators customize their public page within safe tokens only — **no arbitrary CSS in MVP**, curated presets instead of an unrestricted editor. Allowed: background, text, accent, card style, button style, font preset.

| Preset | Dark | Light |
|---|---|---|
| Minimal | `#101010` / white | `#FAFAF8` / `#111111` |
| Warm | `#15120F` / white | `#FFF9F2` / `#18130D` |
| Soft | `#101214` / white | `#F5F7F8` / `#151719` |
| Creator | `#0F0F12` / white | `#F7F5FA` / `#17151A` |

## 13. Accessibility

- Minimum 44×44px touch targets.
- Full keyboard navigation for builder controls.
- Visible focus state using accent-soft ring.
- Never rely on color alone for validation.
- Respect `prefers-reduced-motion`.
- Maintain readable contrast in both themes.
- Checkout errors appear next to the affected field.
- Form labels remain accessible even when visually compact.

## 14. Visual QA Checklist

- Correct against the light theme tokens (§2)? Dark mode is deferred — no QA required until §3 is prioritized.
- Works at 1440px, 1280px, 1024px, 768px, 390px, 360px?
- Typography/spacing using tokens (not one-off values)?
- Cards use correct surface/border/radius?
- One obvious primary action per screen?
- No horizontal overflow on mobile?
- Every hover interaction has a usable touch equivalent?
- Checkout understandable without animation?
- Builder usable one-handed on mobile?
- Empty/loading/error/success states all designed?
- Motion subtle and purposeful, not decorative?
- Public creator page feels like a creator's brand, not an admin dashboard?

---

## 15. MVP Design Principle

The first working demo should feel like **one continuous product loop**, not six disconnected screens. The creator moves from account creation → identity → page creation → import → monetization without a visual reset at each step. App chrome stays consistent; the creator-facing page becomes progressively more expressive; checkout becomes quieter and more trustworthy as it approaches payment.

## 16. Implementation Priority

| Priority | Build |
|---|---|
| P0 | Theme tokens + typography + spacing + buttons + inputs + cards |
| P0 | Responsive shell + mobile navigation + desktop sidebar |
| P0 | Signup + username claim |
| P0 | Builder canvas + blocks + inspector |
| P0 | Public page renderer |
| P0 | Import flow |
| P0 | Digital product block + product editor |
| P0 | In-page checkout |
| P0 | Email capture + success state |
| P1 | Motion polish |
| P1 | Advanced creator themes |
| P1 | Additional blocks |

## 17. Final Instruction

Build the MVP as a premium, mobile-first creator commerce product. Use Rare UI for interaction quality/component motion, Outpace Studios for editorial hierarchy/whitespace/confidence/conversion-focused presentation — as inspiration only, never copied. Keep the interface calm and extremely consistent. It should feel custom-designed, not like a generic dashboard template.
