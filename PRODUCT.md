# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Solo user: the app owner, tracking their own personal finances and a resale side-business. A second account exists in the `users` table but isn't actively used for real tracking — design for one real user, not a shared/multi-user household experience.

## Product Purpose

Layla is a personal finance tracker with two equally core surfaces:

1. **Spending & savings tracking** — monthly income vs. spending (entered progressively week-by-week, not just at month-end), fixed recurring costs, savings pots tracked against real closing balances, net worth over time, and named goals (e.g. a house deposit, a LISA, milestone targets).
2. **Reselling** — a resale side-business inventory tracker: items move through purchased → arrived → listed → sold, with cost/profit tracking down to the penny, parcel numbering for physical stock, and shipping-courier + payment/shipping-status tracking per item.

Success means accurate, up-to-date visibility into "how am I doing this month" and "is my resale stock profitable," without needing to wait until month-end to see either.

## Positioning

Not a market-facing product — built solely for the owner's own use, never marketed, sold, or opened to arbitrary users. No competitive positioning or acquisition/conversion framing applies; design should optimize for the owner's own clarity and speed, not for persuading a stranger.

## Operating Context

- Spending is logged progressively through the month (weekly entries), with income and final splits typically only finalized at month-end — dashboard figures must stay meaningful mid-month, not just after closing.
- Pay period can run payday-to-payday rather than strict calendar month, while still being labeled by calendar month name.
- Reselling stock is real physical inventory (clothing/footwear resale) that gets shipped to the owner (Evri/InPost/Royal Mail in) and then shipped out to buyers (same couriers out) — parcel numbers are handwritten onto real parcels, so that number must stay stable and never be reused.
- Both light (pink) and dark (emerald) themes are used regularly and must both be considered for any visual work.
- Used across both desktop and mobile; mobile is a frequent, first-class access pattern, not an edge case.

## Capabilities and Constraints

- Stack: Vite + React 19 + Tailwind CSS v4 + Supabase (Postgres + JS client), `recharts` for charts, HashRouter-based SPA.
- Auth is a lightweight name + 4-digit PIN check (client-side SHA-256), not real authentication; Supabase is accessed via the anon key with permissive "anon full access" RLS policies — **this is an intentional, accepted trade-off for a private single-user tool and should not be treated as a gap to design around or hardened as part of visual/UX work.**
- The Reselling module is permission-gated per-account (`resale_access` flag), currently enabled for the primary user only.
- A Bank Sync feature (open banking integration, `BankPage`/`BankCallbackPage`) exists in the codebase but is paused/legacy — not part of the active product surface.
- Two themes: pink accent in light mode, emerald accent in dark mode, switchable per-account.

## Brand Commitments

- Name: **Layla**. Tagline: "Smart Spending Management."
- Wordmark: gradient text — pink→rose in light theme, emerald→teal in dark theme.
- Primary accent color: pink-600 (light theme) / emerald-400 (dark theme).
- Visual direction (2026-08-26, revised): after trying a pure "refine, don't replace" pass and two literal metaphor-world concepts (postal/sorting-office, exercise-book) that the user rejected as too gimmicky, the locked direction is a genuinely bolder but non-metaphorical modern look: two distinct-but-related color identities in one app — Spending/Savings keeps pink (light) / emerald (dark), Reselling gets its own accent (amber/orange) — reflecting that these are "really two separate products." Color strategy moves from Restrained to Committed on headline moments (solid-color hero treatment behind top numbers, bigger/bolder display type) while staying data-dense and scannable elsewhere. Craft bar: Monzo/Cash App/Copilot Money tier. User explicitly invited new analytical tiles/graphs for both Spending and Reselling if they'd be useful — functionality is additive here, not fixed.

## Evidence on Hand

- No testimonials, case studies, or marketing copy — not applicable to a personal tool.
- Real financial figures exist in `src/data/config.js` (account balances, house-deposit target, milestone targets) and in the live Supabase data — treat these as real, consequential user data, not placeholder content, in any design work that surfaces them.

## Product Principles

1. This is a solo personal tool, not a market product — no growth, conversion, or acquisition-oriented design patterns.
2. The finance dashboard and the Reselling module are equally core; neither is the "main" feature with the other bolted on.
3. Mobile responsiveness is mandatory throughout, not an afterthought.
4. Figures shown are real and consequential (real savings goals, real resale profit) — correctness and clarity in data presentation outrank decorative flourish.
5. The accepted PIN + anon-key security model is a deliberate simplicity trade-off; don't propose auth/security hardening as part of design work.

## Accessibility & Inclusion

No specific accessibility requirement has been established beyond ordinary good practice (contrast, touch-target size, keyboard navigation).
