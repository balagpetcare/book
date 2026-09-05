# Audit 12D — Meta Migration Recovery

## Original root cause

Migration `20260905124436_add_meta_attribution` used SQLite-incompatible syntax:
`ALTER TABLE "Order" ADD COLUMN "metaPurchaseEventId" TEXT UNIQUE;`. SQLite does not allow a `UNIQUE` column constraint in this `ALTER TABLE ... ADD COLUMN` form, producing Prisma error P3018 (`Cannot add a UNIQUE column`).

## Production partial state

Production already contains the eight attribution columns `fbclid`, `fbp`, `fbc`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term`. `metaPurchaseEventId` is absent, and the failed migration remains unresolved in Prisma migration history. No production database was accessed or changed during this work.

## Migration SQL fix

The migration now adds `metaPurchaseEventId` as a nullable `TEXT` column, then creates:

- `Order_metaPurchaseEventId_key` as a unique index
- `Order_metaPurchaseEventId_idx` as the normal index required by the Prisma schema

The eight existing attribution columns were preserved. `prisma/schema.prisma` was inspected and did not require a change: it already declares `metaPurchaseEventId String? @unique` and `@@index([metaPurchaseEventId])`.

## Recovery script behavior

`npm run db:recover-meta-attribution` connects through `DATABASE_URL`, verifies the eight expected existing columns, adds only the missing `metaPurchaseEventId` column, and creates both indexes with `IF NOT EXISTS`. It then verifies all nine columns, verifies the unique index and its single target column, and exits non-zero if the end state cannot be established.

The script does not delete or rewrite orders, alter unrelated tables, or edit `_prisma_migrations`. It prints no credentials or connection secrets.

## Fresh database verification

A newly created disposable SQLite database was used; the real local and production databases were not used for destructive testing. `npx prisma migrate deploy` applied all 13 migrations in order, including:

- `20260905124436_add_meta_attribution`
- `20260905124526_add_conversion_event`
- `add_confirmed_at_field`

The final database contained the attribution fields, `metaPurchaseEventId`, its unique and normal indexes, and `ConversionEvent`. `prisma validate` and `prisma generate` completed successfully.

## Partial-state recovery verification

A separate disposable database was migrated through the ten migrations before Meta attribution. The eight production-existing attribution columns were then added manually to model the exact partial state, leaving `metaPurchaseEventId` absent.

- First recovery run: `PASS`
- Second recovery run: `PASS` and no schema error (idempotent no-op)
- The Meta migration was then marked applied only in the disposable database.
- `npx prisma migrate deploy` applied `20260905124526_add_conversion_event` and `add_confirmed_at_field`.
- `npx prisma migrate status` reported: `Database schema is up to date.`

## Quality gate

All requested checks passed:

- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- `npm run typecheck`
- `npm run lint` (0 errors; 4 pre-existing Next.js navigation warnings)
- `npm test` — 127 passed, 0 failed
- `npm run build`

## Exact production recovery commands

Run these only after the repaired code is deployed through the normal production workflow, with production `DATABASE_URL` configured:

```text
npm run db:recover-meta-attribution
npx prisma migrate resolve --applied 20260905124436_add_meta_attribution
npx prisma migrate deploy
```

The recovery script intentionally does not resolve migration history. The operator must run the resolve command only after the repair script succeeds, then run deploy so `20260905124526_add_conversion_event` applies normally.
