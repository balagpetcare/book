# Book Sales — Command 1 Implementation

## Foundation

- One Next.js App Router application in `D:\book` with TypeScript, Tailwind CSS, ESLint, and the Node.js runtime.
- Customer home is intentionally a minimal placeholder for Command 1.
- Prisma ORM with SQLite at `data/book.db`.
- Centralized initial business defaults in `src/lib/business-constants.ts`, with persisted values in `BookSettings`.

## Data model

The Prisma schema includes admin users, book settings, orders/items, payments, inventory transactions, reviews, and audit logs. It supports the requested Bangladesh address fields, delivery/payment/order enums, price snapshots, shipping metadata, payment verification metadata, and admin auditing.

Inventory is represented by signed transactions. Unpaid orders create no inventory transaction; payment verification, cancellation restoration, and explicit return restoration are separate transaction types. Payment verification and stock checks must be implemented inside a Prisma transaction by the Command 2 service/API layer, with an invariant that the resulting balance cannot be negative.

## Commands run

- `node --version` → `v24.18.0`
- `npm --version` → `11.16.0`
- `npm install`
- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- `npx prisma migrate dev --name init`
- `npm run db:seed`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Command 2 — Mobile storefront

- Replaced the placeholder home page with a mobile-first, server-rendered public sales landing page.
- `/` reads `BookSettings` from SQLite for title, author, and all displayed prices.
- Added hero, offer comparison, order CTAs, topic benefits, preview/gallery, live inventory/sales/delivery statistics, approved reviews, author section, FAQ, and sticky mobile CTA.
- Available copies are calculated from the signed inventory ledger and clamped at zero. Verified sales, delivered orders, and approved review counts are queried from the database; no placeholder numbers are shown.
- Verified Buyer appears only for approved reviews linked to a delivered order.
- Added reusable `OfferCard` and `SectionHeading` components. CSS is responsive for narrow mobile layouts through desktop; the sticky CTA is mobile-only.
- No book images were available locally, so `public/book-cover-placeholder.svg` and `public/book-preview-placeholder.svg` were added. Replace those files with the final optimized local assets when available.
- Added Bengali-friendly system font fallbacks and Open Graph metadata.

Command 2 verification: `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run db:seed` all pass.

## Command 3 — Checkout and manual payment flow

- Audited Commands 1–2 before changes: the existing schema and inventory ledger were preserved; no stock reservation logic was added to checkout.
- Added `/order`, `/order/success/[orderNumber]`, and `/track` routes, plus `/api/orders` and `/api/track` Node-runtime endpoints.
- Checkout supports mutually exclusive `PREPAID_350` (Bangladesh Post, full payment) and `COURIER_ADVANCE_100` (courier, ৳100 now and ৳350 due) plans using live `BookSettings` values.
- Added bKash/Nagad number display with copy buttons, sender mobile, transaction ID, optional image proof upload, server-side Zod validation, and clear manual verification messaging.
- Phone normalization accepts local `01XXXXXXXXX` and `+880`/`880` forms. Bangladesh Post requires Post Office and a 4-digit Postal Code. Upazila/Thana remains text entry; no fabricated location dataset was added. An authoritative Bangladesh administrative dataset can be integrated later.
- Order creation is transactional and writes `PAYMENT_SUBMITTED` plus `Payment.SUBMITTED`; it does not write an inventory transaction. Transaction IDs have a unique database constraint and duplicate submissions return the existing order number safely.
- Tracking requires both order number and normalized mobile and returns only safe status, payment summary, address summary, and shipping fields.
- Policies explain that the courier advance is part of the total, is non-refundable after dispatch for refusal/non-acceptance, and is refundable if the seller cannot fulfil the order.
- Added mobile checkout styling and upload support under `public/uploads`.

Command 3 verification: `npm run typecheck`, `npm run lint`, and `npm run build` pass. The SQLite schema was synchronized with `prisma db push --accept-data-loss` (existing records were preserved); migration `20260904124500_payment_transaction_unique` records the unique transaction-ID index for subsequent environments.

## Command 4 — Admin auth and order management

- Audited Commands 1–3 before changes. Existing customer checkout remains separate and does not reserve stock.
- Added signed JWT admin sessions using `jose`, bcrypt password verification, an HttpOnly `SameSite=Lax` cookie, 8-hour expiry, and production-only Secure flag. Middleware protects every `/admin` route and `/api/admin/*` endpoint.
- Added `/admin/login`, dashboard, order list/detail, payments, inventory, reviews, and settings pages with compact responsive layouts.
- Dashboard derives available stock from the inventory ledger, verified sales, delivered count, today’s orders, every requested order status, verified revenue, and outstanding COD.
- Payment VERIFY runs in a Prisma transaction: checks available stock, prevents already-verified handling, updates payment/order, deducts exact item quantity once, and writes an audit log. REJECT returns the order to awaiting payment and records the reason/audit.
- Order actions support packed, shipped with carrier/tracking, delivered, cancel-before-shipping restoration, returned, and explicit returned-item restocking. Returned stock is never restored implicitly.
- Settings supports title, description, new-order prices, payment numbers, and signed stock adjustment transactions. Historical order snapshots are not rewritten. Significant actions create `AdminAuditLog` records.
- Added migration `20260904133000_book_settings_description` for the editable description field.

Command 4 verification: `npm run typecheck`, `npm run lint`, and `npm run build` pass. Lint reports two existing-style non-blocking warnings for client-side internal navigation via `window.location.href` in the login and checkout client forms.

## Command 5 — Printable order documents and shipping labels

- Added four direct print links to every admin order detail: Order Details, Packing Slip, A4 Address Label, and 4×6 Thermal Address Label.
- Added protected route `/admin/orders/[id]/print/[kind]` with server-rendered HTML and `window.print()` auto-open behavior. It uses the stored order title, order number/date, recipient, complete structured Bangladesh address, quantity, delivery/payment values, transaction ID/status, carrier, and tracking data.
- Packing and address documents never render payment proof/screenshot data. Labels include large recipient text, FROM details, Bangladesh Post/postal code or Courier/COD due, and PAID/COD due zero for prepaid orders.
- Added monochrome print CSS, hidden navigation/buttons, A4 and 4×6 page-size hints, margins, break-avoidance rules, and responsive admin print controls for mobile and desktop browsers.
- Labels use the existing standardized address fields, so long Bengali addresses wrap naturally rather than being truncated. No PDF dependency was added.

Command 5 verification: `npm run typecheck`, `npm run lint`, and `npm run build` pass. Lint retains the two non-blocking client-navigation warnings documented above.

## Command 6 — Reviews, inventory controls, and truthful counters

- Audited Commands 1–5 before changing review and inventory behavior.
- Added `ReviewStatus` (`PENDING`, `APPROVED`, `REJECTED`, `HIDDEN`), display name, optional photo path, verified-buyer flag, and a unique one-review-per-order constraint. Public review submission validates order number plus normalized matching mobile and requires `DELIVERED`; fake/non-delivered orders are rejected.
- Added `/review` and `/api/reviews`. New reviews remain pending and are excluded from the public storefront until admin approval. Public reviews query only `APPROVED` records and show the verified badge only for validated delivered orders.
- Public counters now derive available stock from the signed ledger, verified/confirmed sales from confirmed-through-delivered orders, delivered copies from delivered `OrderItem` quantities, approved review count, and average approved rating. No fake scarcity or fabricated purchases are used.
- Added audited admin ADD/REMOVE/ADJUST inventory transactions with required reason, non-negative-stock enforcement, current quantity, and ledger history. No direct stock overwrite is available.
- Updated admin review moderation to approve/hide using the review lifecycle status while keeping the legacy approval field synchronized.
- Added focused tests covering one-time payment deduction, duplicate verification protection, cancellation restoration, explicit returned restock, delivered-order review validation, mobile matching, and duplicate-review prevention.
- Added migration `20260904150000_reviews_inventory` for review lifecycle and uniqueness fields.

Command 6 verification: `npm run test` (5 passing tests), `npm run typecheck`, `npm run lint`, and `npm run build` pass. The two existing non-blocking client-navigation lint warnings remain documented.

## Command 7 — Security and production verification

- Audited the complete application and preserved working storefront, checkout, admin, review, inventory, and print features.
- Added basic single-server rate limiting for order/payment submission, tracking, review submission, and admin login. It is intentionally documented as a pre-horizontal-scaling control.
- Added Zod validation to order/review/inventory writes and admin login, payment actions, order actions, settings, and review moderation. Server-side settings resolve all order prices; browser prices are ignored.
- Restricted payment proof uploads to JPEG/PNG/WebP, 5 MB maximum, random UUID filenames, and a fixed `public/uploads` directory. `.env`, backups, and uploads are Git-ignored. Errors remain generic to clients.
- Added database indexes for order mobile/status/date, payment status, transaction ID uniqueness, and review status/date. Monetary fields remain integer BDT values.
- Added `GET /api/health`, returning only `{status,database}` and a 503 when the database check fails.
- Added `npm run db:backup`, which copies `data/book.db` to timestamped files under `backups/`.
- Revalidated committed migrations from an empty SQLite database and ran the idempotent seed successfully. The temporary verification database was removed after the check.
- Runtime smoke test: `npm start` served `http://localhost:2200`; `GET /api/health` returned HTTP 200 with `{"status":"ok","database":"ok"}`.
- Final commands passed: `npx prisma format`, `npx prisma validate`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run db:backup`, `npm run test` (5 passing), `npm run typecheck`, `npm run lint`, and `npm run build`.
- `npm run lint` has two non-blocking existing warnings for `window.location.href` in the login and checkout client forms; no lint errors remain.
- Print routes remain available at `/admin/orders/[id]/print/details`, `/packing`, `/address-a4`, and `/address-thermal`; they use print CSS and browser print dialogs.

## Final production verification

- Local URL: `http://localhost:2200/`
- Admin URL: `http://localhost:2200/admin/login`
- Health URL: `http://localhost:2200/api/health`
- Database: `D:\book\data\book.db`
- Initial stock: `700`
- bKash Personal: `01777889994`
- Nagad Personal: `01777889994`
- Verified empty-database migration path: passed with all 5 committed migrations, followed by idempotent seed.
- Backup path: `D:\book\backups\` with timestamped SQLite copies.
- Final verification: Prisma format passed; Prisma validate passed; Prisma generate passed; Prisma migrate deploy passed; `npm run db:backup` passed; 5/5 tests passed; typecheck passed; lint passed with 2 non-blocking existing navigation warnings; build passed; `npm start` and `/api/health` smoke test passed with HTTP 200 and database `ok`.

## Command 8 — Super Admin and canonical port

- Audited the existing AdminUser model, bcrypt bootstrap, jose session, middleware, environment files, and npm scripts before changes. No second authentication system was created.
- Added the smallest additive authorization change: `AdminRole` with `SUPER_ADMIN` and `ADMIN`; legacy rows default to `ADMIN`. Existing admin routes/actions already authorize all active admins, so SUPER_ADMIN has full access without unnecessary RBAC complexity.
- Updated `scripts/bootstrap-admin.ts` to read `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`, hash with bcrypt, safely upsert by email, update name, assign `SUPER_ADMIN`, and report only the email. No password is logged or hard-coded.
- Added migration `20260904130000_admin_role` and applied it without resetting or deleting `D:\book\data\book.db`.
- Changed canonical development and production commands to port 2200: `npm run dev` → `next dev -p 2200`; `npm start` → `next start -p 2200`.
- Updated documentation URLs and confirmed no hard-coded legacy port references remain. `.env` remains ignored; `.env.example` contains placeholders only.
- Backups were created before migration and during final verification in `D:\book\backups\`.
- Dev smoke test passed: `npm run dev` served `/`, `/admin/login`, and `/api/health` on port 2200 with HTTP 200; health returned `{"status":"ok","database":"ok"}`.
- Production smoke test passed: `npm start` served on port 2200; health returned HTTP 200 and database `ok`; authenticated SUPER_ADMIN login returned HTTP 200 and reached dashboard, orders, payments, inventory, reviews, settings, and print route protection.
- Final verification passed: Prisma format, validate, generate; migration deploy; backup; typecheck; lint; `npm test` (5/5); build; dev startup; production startup; health; customer/admin route checks. Lint retains the two documented non-blocking client-navigation warnings.

## Command 8.5-FIX1 — Octal escape / ChunkLoadError repair

- Root cause: Command 8.5 Bangla copy in customer-page source contained malformed Unicode escape prefixes such as `\09cd`, `\09a09`, and `\09a099` instead of `\u09...` escapes. These were parsed by the strict-mode server bundle as forbidden legacy octal escapes.
- Offending source files: `src/components/checkout-form.tsx` and `src/app/page.tsx`. The checkout failure was visible near the payment/copy block’s compiled module; the homepage failure was visible in the root server chunk. The source audit found the same malformed escape defect in both modules, not a cache-only problem.
- Source fix: restored the Unicode escape prefix for all malformed backslash-zero sequences in those two files. Payment/account numbers remain ordinary strings, and BD validation remains the RegExp literals `^01\\d{9}$` (after normalization) and `^\\d{4}$` for postal code. No pricing, database, schema, or order-flow rules were changed.
- Why ChunkLoadError occurred: Turbopack could not evaluate the SSR module after the strict-mode `SyntaxError`; the resulting unavailable module was reported downstream as a `ChunkLoadError`.
- Additional build-gate type fixes: added `description: null` to the homepage fallback settings object and allowed nullable `division` in the print address helper type. These are type-only compatibility corrections and do not alter business behavior.
- Files changed for FIX1: `src/app/page.tsx`, `src/components/checkout-form.tsx`, `src/app/admin/orders/[id]/print/[kind]/page.tsx`, and this report.
- Checks: source octal scan passed; `npm run typecheck` passed; `npm run lint` passed with the two existing non-blocking `window.location.href` warnings; `npm run build` passed on Next.js 16.3.4/Turbopack with no octal error.
- Cache/runtime: stopped the old dev processes, removed only `D:\book\.next`, and restarted `npm run dev` on port 2200. `GET /`, `/order`, `/admin/orders?status=PAYMENT_SUBMITTED`, and `/api/health` all returned HTTP 200; health reported `{"status":"ok","database":"ok"}`.
- UX regression smoke checks: homepage markers and Bangla copy render; checkout renders delivery, customer/address, postal, payment, sender mobile, transaction ID, and optional proof controls. Removed long-address fields (`areaOrVillage`, `unionOrWard`, `houseOrHolding`, `alternateMobile`) are absent from checkout HTML. Both configured amount paths remain represented by `settings.prepaidPrice` and `settings.courierAdvance`.
- Dev output and generated runtime logs contained no SyntaxError, octal-escape error, or related ChunkLoadError after the fresh restart. No browser automation connector was available; HTTP SSR responses and the Next dev browser log were used for runtime verification.

## Command 8.5-FIX2 — Final customer purchase flow verification

- Homepage verification: `GET /` returned HTTP 200; the title rendered as `বিড়াল পালন ও চিকিৎসা`, the author as `Dr. Bala G`, the primary CTA consistently rendered `এখনই অর্ডার করুন` and linked to `/order`, configured pricing rendered as ৳350, the cover and preview assets loaded, and no replacement characters, mojibake, or fake review/sales data appeared. A small copy-only repair corrected remaining stray Bengali artifacts from overlong Unicode tokens in `src/app/page.tsx`.
- Checkout field set: required customer fields are name, mobile, district, upazila/thana, and full delivery address; postal code is optional. Required payment fields are method, sender mobile, and transaction ID; screenshot is optional. Division, alternate mobile, email, union/ward, area/village, road/street, house/holding, post office, landmark, and delivery instruction are not customer controls.
- Location behavior: district and upazila/thana are intentionally compact text fields in the redesigned flow; the rendered form has no stale dependent-location selector to clear. Backend compatibility maps the submitted full address into the legacy `areaOrVillage` storage field while leaving removed fields out of the customer UI.
- Full-payment result: verification order `BG-260904-00001` was created exactly once with `PREPAID_350`, Bangladesh Post, total/paid ৳350, due ৳0, bKash, sender `01712345678`, and a labeled transaction ID. The canonical UI amount and CTA were ৳350.
- Courier-advance result: verification order `BG-260904-00002` was created with `COURIER_ADVANCE_100`, Courier, total ৳450, paid ৳100, due ৳350, Nagad, sender `01719876543`, and a labeled transaction ID. The canonical UI amount and CTA were ৳100.
- Payment methods: bKash and Nagad controls and copy buttons are present; both payment methods were exercised through successful API-backed submissions. Mobile normalization/validation accepts canonical BD numbers and the existing `^01\\d{9}$` rule remains intact.
- Validation/failure paths: empty name, invalid mobile, missing district/upazila/address, missing payment method, invalid sender mobile, and missing transaction ID returned HTTP 400 with field-level errors. No invalid request created an order. Valid form values are retained by the existing client form on API validation failure.
- Duplicate protection: replaying the full-payment transaction ID returned HTTP 200 with the original order number and `duplicate: true`; it did not create a second order/payment. The existing busy/disabled submit state also prevents ordinary double-click repeats.
- Admin order visibility: `/admin/orders` returned HTTP 200 and listed both verification orders. Their detail pages exposed customer name, mobile, district, upazila/thana, full address, optional postal code, delivery/payment mode, totals, paid/due amounts, payment method, sender mobile, and transaction ID. No screenshot was supplied, so no proof reference was expected.
- Backward compatibility: no historical rows were modified or removed. The pending existing migration `20260904131500_make_order_division_nullable` was applied with `prisma migrate deploy` after the real submission test proved the live database still required legacy `division`; this preserves old columns while allowing redesigned submissions to store `division = null`.
- Responsive checks: storefront CSS includes mobile-first layout rules plus breakpoints at 700px and 760px; payment cards, form controls, buttons, and sticky CTA use constrained widths/flex wrapping. SSR customer markup contains no fixed-width legacy address controls. Visual browser automation was unavailable, so 360/390/430px, tablet, and desktop checks were performed by source/CSS inspection and responsive-safe rendered markup rather than pixel screenshots.
- Final checks: `npm run typecheck` passed; `npm run lint` passed with the two existing non-blocking `window.location.href` warnings; `npm run build` passed. Runtime `GET /`, `/order`, `/admin/orders`, and `/api/health` all returned HTTP 200, with health reporting `{"status":"ok","database":"ok"}`. Post-repair runtime output had no new SyntaxError, ChunkLoadError, hydration error, or customer-flow JavaScript exception.
- FIX2 changes: `src/app/page.tsx` copy-only cleanup, application of the already-present nullable-division migration to the live local database, and this report entry. No pricing or business-rule redesign was made.
- Remaining limitation: location is deliberately text-based in the current compact checkout; there is no district-driven upazila selector in this architecture. The existing admin-only navigation warnings remain non-blocking.

## Command 8.5-FIX3 — Customer UI Unicode and Bangla localization repair

- Unicode root cause: customer source mixed literal `\\u09...` sequences in JSX text/attributes, mojibake strings, and previously malformed escape history. JSX text and literal attributes do not decode JavaScript escapes, so those sequences reached HTML visibly. JavaScript string literals now hold the escaped values only where safe and JSX renders them through variables; customer-facing source no longer contains malformed escape prefixes.
- Broken-text files: `src/app/page.tsx`, `src/app/order/page.tsx`, `src/components/checkout-form.tsx`, `src/components/offer-card.tsx`, `src/app/layout.tsx`, `src/lib/business-constants.ts`, and the seeded settings in `prisma/seed.ts`. The source audit found no remaining `\\u09`, `%u09`, replacement characters, mojibake, or `?????` in the repaired customer modules.
- Book-cover/preview root cause: both public SVG assets had baked `?????` text. They were not CSS/font problems. The assets were replaced with clean truthful graphic mockups without fake cover or page copy; no real cover/page asset was present to substitute.
- Homepage repair: restored clean Bangla hero, trust/payment/delivery line, offer section, preview caption, author section, FAQ, CTA, and consistent `৳` display. Existing inventory/order/review query and purchase actions were not changed.
- Checkout localization: restored Bangla labels for the six compact customer fields, payment screenshot, copy controls, helper text, manual verification note, errors, navigation, and submit action. Technical `Transaction ID` and bKash/Nagad identifiers remain familiar. Pricing logic remains untouched: full payment 350; courier total 450, pay now 100, due 350.
- Files changed for FIX3: customer pages/components, layout/default/seed copy, `public/book-cover-placeholder.svg`, `public/book-preview-placeholder.svg`, and this report. No schema, database architecture, pricing rule, duplicate protection, or order/payment business rule was modified. Existing local settings were reseeded for the canonical title; orders were not created or changed.
- Checks: `npm run typecheck` passed; `npm run lint` passed with two existing non-blocking `window.location.href` warnings; `npm run build` passed on Next.js 16.3.4/Turbopack. The requested `.next` removal was attempted but blocked by the execution policy; the rebuilt dev output was used for runtime verification.
- Runtime: port 2200 was already occupied by the existing dev server. Fresh HTTP checks returned 200 for `/`, `/order`, `/admin/orders`, and `/api/health`; health returned database `ok`. Rendered homepage/order HTML contained no visible escaped Unicode, `%u09`, replacement characters, mojibake, `?????`, or `BDT`. Order HTML showed `৳350`; courier values remain present in source and selectable client markup. No new SyntaxError, ChunkLoadError, or hydration error was observed.
- Runtime: port 2200 was already occupied by the existing dev server. Fresh HTTP checks returned 200 for `/`, `/order`, `/admin/orders`, and `/api/health`; health returned database `ok`. Rendered homepage/order HTML contained no visible escaped Unicode, `%u09`, replacement characters, mojibake, `?????`, or `BDT`. Order HTML showed `à§³350`; courier values remain present in source and selectable client markup. No new SyntaxError, ChunkLoadError, or hydration error was observed.

## Command 8.6 — Two-step order capture and payment flow

- Previous flow: `/order` submitted customer data and payment fields together to `/api/orders`, creating an order already marked `PAYMENT_SUBMITTED`.
- New flow: `/order` now creates one canonical `Order` before payment with existing `AWAITING_PAYMENT`, zero paid amount, full due amount, selected delivery type, saved address, and an `OrderItem`. It redirects to `/order/[orderNumber]/payment`, which retrieves the existing order and never creates another one.
- Schema/status: no schema change and no migration were needed. Existing `AWAITING_PAYMENT` is the correct unpaid lifecycle state; existing `PAYMENT_SUBMITTED` remains for submitted payment. Historical orders are untouched.
- Pricing: `BookSettings` remains authoritative. Bangladesh Post uses total 350, pay now 350, due 0. Courier uses total 450, pay now 100, due 350. Step 1 displays book price, delivery charge, total, pay-now, and due-on-delivery breakdown.
- Payment step: new `/api/orders/[orderNumber]/payment` validates the configured payment amount, creates one Payment, and updates the same Order to `PAYMENT_SUBMITTED`. Existing transaction IDs remain duplicate-protected; repeat submission for an already submitted order returns 409.
- Admin: `AWAITING_PAYMENT` is identified as `Payment Pending`; order rows show customer, mobile, district, upazila/thana, address, delivery type, total, pay-now, due, and status. The protected detail route remains available for follow-up.
- Test results: pending courier capture `BG-260904-00005` remained unpaid and visible. Bangladesh Post `BG-260904-00003` updated on the same order to paid 350/due 0. Courier `BG-260904-00004` updated on the same order to paid 100/due 350. Repeating payment returned HTTP 409 with no duplicate order.
- Files changed: order capture/payment APIs, validation, order/payment pages and components, admin orders page, and this report. No provider reset or deployment was performed.
- Verification: Prisma format, validate, and generate passed after releasing the Windows Prisma engine lock. Typecheck, lint, and build passed; lint has three non-blocking navigation warnings. Runtime `/`, `/order`, payment route, `/admin/orders`, and `/api/health` returned HTTP 200; health reported database `ok`. The nested admin link hydration issue found during smoke testing was removed.

## Command 8.6-FIX2 - Admin-controlled pricing and delivery UI

- Old pricing source/root cause: checkout and order capture mixed `prepaidPrice`, `courierTotalPrice`, and derived arithmetic in separate places. Courier subtotal could equal the courier total, and payment pages read the latest courier advance setting, so display and historical payment amounts could diverge.
- Canonical pricing source: the existing `BookSettings` row, with `prepaidPrice` as book price plus additive `bangladeshPostDeliveryCharge` and `courierDeliveryCharge` fields. `src/lib/pricing.ts` derives post total/pay-now/due and courier total/pay-now/due and validates non-negative integer amounts and advance limits.
- Admin settings: existing protected `/admin/settings` and `/api/admin/settings` now expose book price, Bangladesh Post charge, courier charge, and courier advance. Save validates server-side, updates compatibility totals, and records pricing metadata in the existing audit log.
- Price snapshot behavior: new orders persist subtotal/book price, delivery charge, grand total, pay-now amount, and due amount. The payment page and payment API use those order values; later settings changes do not rewrite existing orders.
- UI changes: delivery cards now use separate price rows with a prominent total, selected state, and explicit post full-payment or courier advance/COD breakdown. Admin order rows show the captured pay-now amount for pending orders.
- Migration: additive `20260904170000_pricing_configuration` added the two delivery charge fields and `Order.payNowAmount`, backfilled the legacy courier charge, and applied successfully without reset.
- Verification: canonical defaults calculate post 350/350/0 and courier 450/100/350. Test configuration 375/10/120/120 calculated post 385/385/0 and courier 495/120/375; orders created with it retained those snapshots after settings were restored to 350/0/100/100. Test orders `BG-260904-00007` and `BG-260904-00008` document the new snapshots.
- Files changed: Prisma schema/migration/seed, pricing helper, settings validation/API/form, order capture API, checkout form/order page, payment page/API, admin orders page, and this report.
- Build/runtime: Prisma format, validate, generate, migrate status, typecheck, lint, and build passed. Lint has three pre-existing/non-blocking internal-navigation warnings. `/`, `/order`, `/admin/orders`, `/admin/settings`, `/order/BG-260904-00008/payment`, and `/api/health` returned HTTP 200; health reported database `ok`.

## Command 8.6-FIX3 - Order success page UI polish

- Success page route/component: `/order/success/[orderNumber]` in `src/app/order/success/[orderNumber]/page.tsx`. It continues to retrieve the existing order and latest payment without changing order/payment behavior.
- UI changes: replaced the malformed confirmation copy with a centered cream-and-green confirmation card, stronger icon and badge, improved spacing, highlighted delivery reassurance, readable summary rows, address panel, and balanced action buttons.
- Bengali/localization: added clean customer-facing Bengali labels for payment verification, successful submission, delivery method, order summary, address, tracking, and home navigation.
- Delivery/support: added the 3-4 day delivery reassurance and selected-method message, plus clickable support number `tel:01575008300`.
- Files changed: success page, shared `src/app/globals.css`, and this report.
- Verification: typecheck and production build passed. Lint passed with three non-blocking existing internal-navigation warnings. `/`, `/order`, payment page, `/order/success/BG-260904-00003`, `/admin/orders`, and `/api/health` returned HTTP 200; live success HTML contained the Bengali heading, delivery message, support number, and no mojibake marker.

## Command 10D - Automatic table of contents image gallery

- Added the TOC-only gallery at `#book-toc`, backed by `public/images/book-toc/`. The server component safely reads only `.jpg`, `.jpeg`, `.png`, and `.webp` files, sorts leading numeric filenames naturally, and emits public image URLs only.
- Added a mobile horizontal gallery with responsive desktop grids, preserved image proportions, lazy loading for non-first images, and a client lightbox with close, previous, next, Escape/arrow-key controls, and horizontal touch swipe support.
- Empty or unavailable folders return no gallery section and do not affect homepage rendering. Adding another numbered image requires no source edit.
- Added the required Bengali section copy, order CTA, and README placement/naming instructions.
- Verification: numeric sort test produced `01.jpg`, `001.jpg`, `2.jpg`, `3.PNG`, `10.jpg`, `11.webp` order; unsupported files are filtered by extension before sorting. The empty production folder hid the TOC section cleanly. Typecheck, lint, build, and runtime smoke tests passed.

## Command 10F - Author, FAQ and final trust

- Replaced the homepage author block with the concise, project-supported author information for Dr. Bala G under the Bengali heading `লেখক পরিচিতি`.
- Added the seven requested Bengali FAQ entries, including the native accessible details/summary accordion, a `সূচিপত্র দেখুন` link to `#book-toc`, and payment/delivery answers consistent with the current flow and active pricing.
- Replaced the generic final CTA with the requested Bengali heading, 326-page book message, active book price, Bangladesh Post trust line, and `এখনই অর্ডার করুন` link to `/order`.
- Files changed: `src/data/book.ts`, `src/app/page.tsx`, `src/components/author-faq-final.tsx`, `src/app/globals.css`, and this report.
- Verification: homepage content, `/order`, `#book-toc`, and `/api/health` were checked live. Typecheck and build passed; lint passed with three non-blocking existing navigation warnings.

## Command 10G - Final mobile UX, SEO and QA

- Corrected remaining homepage mojibake in the homepage data, TOC component, and metadata. The page now uses the requested Bengali title and description, `lang="bn"`, and an Open Graph image reference to the existing cover asset path.
- Verified the homepage uses mobile-first sizing, no fixed-width overflow source, 52px button targets, responsive heading scales, a fixed CTA with reserved body padding, preserved cover/TOC image proportions, lazy TOC images, numeric TOC sorting, and keyboard/touch lightbox controls.
- Verified TOC discovery with `.jpg`, `.jpeg`, `.png`, and `.webp` names and numeric ordering. The real directory is currently empty; the production homepage remained HTTP 200 and hid the TOC section cleanly. No source edit is needed for additional numbered images.
- Automated tests: 5 existing domain tests passed; sorting/extension checks passed. Live `/`, `/order`, payment, success, `/admin/orders`, and `/api/health` checks returned HTTP 200; health reported database OK.
- Typecheck passed, lint passed with three non-blocking existing internal-navigation warnings, and production build passed. No real photographed book cover was present in the supplied assets; the existing clean placeholder remains until the real cover is provided.

## Command 11A - Mobile order page UX and delivery selection

- Audited and preserved the existing `/api/orders` capture contract and two-step redirect. No backend, lifecycle, schema, or payment changes were made.
- `/order` now receives pricing calculated server-side by the canonical `calculatePricing` helper. Delivery cards, selected-order summary, and payment amounts all use that same server-derived pricing object.
- Added mobile-first Bengali order summary, large selectable Bangladesh Post and courier cards, prominent totals, courier advance/due clarification, grouped customer fields, delivery expectation, clickable support number, and a context-accurate payment continuation CTA.
- Verified current configured post/courier amounts, option switching markup, existing field names, invalid-form browser validation, `/order` and payment route availability, and no mojibake in the order source.
- Tests: 5 existing tests passed. Typecheck passed. Lint passed with three non-blocking navigation warnings. Production build passed. `/`, `/order`, payment route, and `/api/health` returned HTTP 200; database health was OK.

## Command 11B - Payment method and payment proof UX

- Reused the existing two-step payment architecture: `/order/[orderNumber]/payment` reads the existing Order snapshot, and the existing payment API creates one Payment and leaves verification to Admin.
- Payment account numbers continue to come from `BookSettings`; payable amount continues to come from the immutable order snapshot. No client amount or verification flag is trusted.
- Added mobile-first Bengali payment summary, bKash/Nagad selectable cards, configured account display, copy feedback, concise instructions, transaction ID guidance, manual-verification explanation, support link, and a tap-friendly proof uploader with local preview, filename, replace/remove behavior.
- Existing proof storage and validation remain in `public/uploads` with JPEG/PNG/WebP and 5MB server-side enforcement. An invalid text proof was rejected by the live API without creating a payment.
- Verification: 5 tests passed; typecheck and production build passed. Lint passed with four non-blocking warnings (existing navigation warnings plus the preview image optimization warning). Payment page, order page, homepage, success page, admin orders, and health returned HTTP 200; database health was OK.

## Command 10H - Homepage visual convergence

- Reworked the existing homepage into a denser premium editorial landing page while preserving the existing server-rendered homepage, dynamic pricing, TOC gallery/lightbox, FAQ, SEO metadata, and /order links.
- Added the reusable HomepageVisualSections component for the six learning cards, the cause-to-treatment journey, and dynamic pricing decision cards. All displayed amounts use calculatePricing and the active BookSettings values.
- Strengthened the hero with prominent Bengali hierarchy, fact pills, price block, CTA pair, trust strip, and a warm-backed book-cover presentation. The project currently has no real cover asset in public/images/book/; the existing placeholder remains the honest fallback and can be replaced at the existing path without homepage code changes.
- Improved card hierarchy, timeline connectors, pricing emphasis, author panel, FAQ open state/plus control, final CTA panel, sticky mobile CTA, spacing, shadows, focus states, and responsive breakpoints for narrow phones through wide desktop.
- Repaired homepage-visible mojibake in shared Bengali content, author/FAQ copy, TOC labels, and lightbox labels. Automatic TOC directory scanning, supported formats, numeric sorting, lazy image behavior, and lightbox interactions were retained.
- Files changed: src/app/page.tsx, src/data/book.ts, src/components/homepage-visual-sections.tsx, src/components/author-faq-final.tsx, src/components/book-toc-gallery.tsx, src/components/toc-lightbox.tsx, and src/app/globals.css.
- Verification: homepage artifact scan clean; /, /order, /admin/orders, and /api/health returned HTTP 200. npm run typecheck passed, npm run lint passed with four existing non-blocking warnings, and npm run build passed. Responsive CSS was audited for 320/360/375/390/412/430/768/1024/1280/1440px ranges.

## Command 10I - Replaceable cover and TOC slots

- Added filesystem-backed BookCoverSlot: the future public/images/book/book-cover.jpg is rendered with contain sizing when present; otherwise a neutral book-shaped website placeholder is shown. No cat icon or fabricated artwork is used.
- The TOC section now always renders six consistent portrait slots for 01.jpg through 06.jpg, using clean placeholders when absent. Real .jpg, .jpeg, .png, and .webp files replace their matching slots automatically; numbered files above 06 append in natural order.
- Duplicate extension precedence is deterministic: JPG, JPEG, PNG, then WEBP, followed by filename order. Placeholder slots do not open the lightbox; real pages retain enlarged viewing, keyboard navigation, Escape, and touch swipe.
- Added optional public/images/book/author.jpg discovery with the existing BG placeholder fallback. Dynamic canonical pricing remains the source for the post-TOC CTA and all existing order/payment behavior is unchanged.
- Files changed: homepage, cover slot, TOC gallery/lightbox, author section, homepage visual component, and homepage styles.
- No-asset verification: the live homepage rendered six TOC placeholders and the neutral cover placeholder without image 404s. Tests, typecheck, lint, and production build passed; lint retained four non-blocking existing warnings. /, /order, and /api/health returned HTTP 200.

## Command 10I-FIX1 - Bengali Unicode escape regression repair

- Root cause: the previous ASCII-safe patch converted Bengali in JSX text and quoted JSX attributes into literal backslash-u sequences. JavaScript string literals decoded them, but JSX markup treated them as visible text.
- Fixed homepage JSX by routing visible Bengali through JavaScript string values/props, while retaining readable server-rendered Bengali output and leaving pricing, order/payment, TOC discovery, lightbox, and asset paths unchanged.
- Added tests/homepage-unicode.test.ts, which rejects escaped Bengali in JSX text/attributes and verifies the expected Bengali Unicode value.
- Runtime homepage scan now finds zero \u09 sequences and key Bengali phrases render correctly. /, /order, and /api/health returned HTTP 200.

## Command 10J - Final homepage sizing, text rendering and polish

- Removed the final JSX-visible escaped separator and punctuation issue by rendering the trust separator through a decoded JavaScript string with normal spacing.
- Audited homepage HTML for escaped Bengali, escaped bullet separators, asterisk-wrapped separators, and visible escaped newlines. Visible text scans are clean; framework script serialization still contains normal escaped newlines outside the rendered body.
- Increased the desktop content cap to 1200px and strengthened hero type, facts, prices, CTA sizing, cards, timeline CTA, FAQ, author bio, final CTA, and responsive section rhythm. TOC placeholders remain compact portrait slots with the same real-image replacement contract.
- Added regression coverage in tests/homepage-unicode.test.ts for escaped JSX text and attributes. No backend, pricing, order, payment, admin, API, or asset-path behavior changed.
- Verification: homepage key Bengali phrases and exact trust copy render in live HTML; the homepage, order page, and health endpoint returned HTTP 200. Tests, typecheck, lint, and production build passed. Lint has four existing non-blocking warnings.

## Command 10K - Enterprise order checkout redesign

- Reused the existing server-calculated Pricing object, BookSettings source, /api/orders contract, validation, and payment redirect. No backend, schema, pricing, or lifecycle changes were made.
- Redesigned /order as a centered responsive checkout: desktop two-column layout with sticky order summary and CTA, equal selectable delivery cards, readable price hierarchy, premium customer-information card, and compact trust/support block.
- Fixed order-page JSX-level Bengali escape rendering and added clean header, delivery, summary, support, and CTA copy. The live order HTML contains zero literal Bengali escape or escaped bullet sequences.
- Added accessible radio-card focus/selected states, autocomplete attributes, responsive stacking, stronger input focus states, and mobile-safe sizing at the requested breakpoints.
- Verification: 6 tests passed, typecheck passed, production build passed, and lint passed with four existing non-blocking warnings. Homepage, /order, and /api/health returned HTTP 200.

## Command 10K-FIX1 - Order page text, Unicode and spacing repair

- Root cause: checkout-facing labels/checkmarks were represented as JSX-level escaped text in several places; one header trust string had also been written as mojibake and the page-summary copy contained an incorrect punctuation codepoint.
- Repaired order copy through decoded JavaScript values, corrected Bengali punctuation and the ব্যবহারিক spelling, and separated the book summary/trust lines into semantic block elements.
- Rebuilt delivery cards and summary rows with explicit hierarchy, and changed customer fields to independent field wrappers with matching label htmlFor and input id, preserving all original names, validation, autocomplete, pricing, and submission behavior.
- Added responsive spacing/readability overrides for the existing checkout design; no backend, pricing, payment, admin, database, or API logic changed.
- Verification: live /order HTML contains zero literal escaped Bengali/checkmark/bullet sequences and zero Chinese full stops; required Bengali phrases and six field IDs are present. Homepage and /order returned HTTP 200, health returned HTTP 200. Tests, typecheck, lint, and build passed; lint retained four existing warnings.

## Command 10K-FIX2 - Final order page pixel polish and responsive visual audit

- Kept the existing CheckoutForm state, canonical Pricing values, FormData field names, order API submission, and payment redirect unchanged.
- Refined the existing order presentation with a balanced 1160px desktop container, stronger two-column proportions, a compact book/trust header card, consistent card spacing, reduced delivery-card dead space, and clearer summary/CTA hierarchy.
- Kept the summary sticky on desktop and removed sticky behavior for tablet/mobile; tablet widths use a readable single-column checkout while delivery and customer fields retain sensible two-column layouts where space permits.
- Normalized input/card spacing, radii, focus treatment, Bengali type scale, trust/support density, and mobile gutters. The selected delivery checkmark remains rendered from a decoded JavaScript value, with no visible mojibake.
- Verification: typecheck, lint, six tests, and production build passed. Runtime `/`, `/order`, and `/api/health` returned HTTP 200. Live `/order` HTML contained no literal Unicode escape sequences or mojibake. Lint retains four existing non-blocking warnings.
