# Book Sales Platform

Single Next.js App Router application for selling one Bengali book with a customer storefront, manual bKash/Nagad payments, secure admin operations, reviews, inventory ledger, tracking, and printable shipping documents.

## Requirements and installation

- Node.js 20 or newer and npm
- SQLite database stored at `D:\book\data\book.db`

```bash
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run db:seed
npm run admin:bootstrap
```

For a fresh environment, apply committed migrations with `npx prisma migrate deploy`, then run `npm run db:seed`.

## Environment

`.env` is ignored by Git. Set `DATABASE_URL`, a strong `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a long random `SESSION_SECRET`. Never commit `.env` or real credentials. The bootstrap script stores only a bcrypt hash.

## Commands

```bash
npm run dev       # development server
npm run build     # production build
npm start         # serve the production build
npm run lint
npm run typecheck
npm run test
npm run db:backup
```

## Application URLs

- Customer: `http://localhost:2200/`
- Checkout: `http://localhost:2200/order`
- Tracking: `http://localhost:2200/track`
- Review submission: `http://localhost:2200/review`
- Admin: `http://localhost:2200/admin/login`
- Health: `http://localhost:2200/api/health`

## Payment and order workflow

Customers choose prepaid Bangladesh Post or courier advance, submit a bKash/Nagad transaction ID and optional proof, and receive `PAYMENT_SUBMITTED`. Verification is manual in Admin. Prices are resolved server-side from `BookSettings`; browser-submitted prices are not trusted. Verification changes the payment to `VERIFIED`, confirms the order, and deducts stock transactionally.

## Inventory rules

Unpaid orders do not affect stock. Verified payment deducts the exact item quantity once. Cancellation before shipping restores paid stock. Delivered orders do not restore stock. Returned orders require an explicit admin restock action. Manual ADD/REMOVE/ADJUST entries require a reason, an audit record, and cannot make stock negative.

## Reviews and counters

Reviews require a delivered order and matching mobile number, are pending until approved, and are unique per order. The storefront shows only approved reviews. Available stock, verified sales, delivered copies, approved review count, and average rating are database-derived.

## Printing

Admin order details provide Order Details, Packing Slip, A4 Address Label, and 4x6 Thermal Address Label views. They use browser printing and print CSS; payment screenshots are never included on labels or packing slips.

## Backup and deployment notes

`npm run db:backup` copies `data/book.db` into `backups/` with an ISO timestamp. Schedule it outside the app process and copy backups to separate durable storage. Deploy with Node.js 20+, persistent storage for SQLite and uploads, a real `SESSION_SECRET`, HTTPS, `npm ci`, `npx prisma migrate deploy`, `npm run db:seed`, `npm run build`, and `npm start` on canonical port `2200`.

## Super Admin bootstrap

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` in the local `.env`, then run:

```bash
npm run admin:bootstrap
```

This safely upserts one account by email, hashes the password with bcrypt, updates the name, and assigns `SUPER_ADMIN`. It is safe to run again and never prints the password. Existing admins remain `ADMIN` by default. Do not place real credentials in `.env.example` or source control.

## Canonical URLs

- Customer: `http://localhost:2200/`
- Admin: `http://localhost:2200/admin/login`
- Health: `http://localhost:2200/api/health`

The in-memory rate limiter is basic single-server protection; use a shared limiter/reverse proxy before horizontal scaling.

## Table of contents gallery

1. Put TOC images inside:
   `public/images/book-toc/`

2. Recommended format:
   JPG

3. Recommended naming:
   `01.jpg`
   `02.jpg`
   `03.jpg`
   ...

4. No source-code edit is required when adding another numbered image. The homepage discovers supported files automatically after restart/build.
