import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const attributionColumns = [
  "fbclid",
  "fbp",
  "fbc",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;
const metaColumn = "metaPurchaseEventId";
const uniqueIndex = "Order_metaPurchaseEventId_key";
const normalIndex = "Order_metaPurchaseEventId_idx";

type ColumnRow = { name: string };
type IndexRow = { name: string; [key: string]: unknown };
type IndexInfoRow = { name: string; seqno: number; cid: number };

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("DATABASE_URL must be a SQLite file URL.");
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      const initialColumns = await tx.$queryRawUnsafe<ColumnRow[]>(
        'PRAGMA table_info("Order")',
      );
      const columnNames = new Set(initialColumns.map((column) => column.name));

      for (const column of attributionColumns) {
        if (!columnNames.has(column)) {
          throw new Error(`Expected existing attribution column is missing: ${column}`);
        }
      }

      if (!columnNames.has(metaColumn)) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE "Order" ADD COLUMN ${quoteIdentifier(metaColumn)} TEXT`,
        );
      }

      await tx.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS ${quoteIdentifier(uniqueIndex)} ON "Order"(${quoteIdentifier(metaColumn)})`,
      );
      await tx.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(normalIndex)} ON "Order"(${quoteIdentifier(metaColumn)})`,
      );

      const finalColumns = await tx.$queryRawUnsafe<ColumnRow[]>(
        'PRAGMA table_info("Order")',
      );
      const finalColumnNames = new Set(finalColumns.map((column) => column.name));
      const expectedColumns = [...attributionColumns, metaColumn];
      const missingColumns = expectedColumns.filter((column) => !finalColumnNames.has(column));
      if (missingColumns.length > 0) {
        throw new Error(`Meta attribution repair incomplete; missing: ${missingColumns.join(", ")}`);
      }

      const indexes = await tx.$queryRawUnsafe<IndexRow[]>(
        'PRAGMA index_list("Order")',
      );
      const uniqueIndexRow = indexes.find((index) => index.name === uniqueIndex);
      const normalIndexRow = indexes.find((index) => index.name === normalIndex);
      if (!uniqueIndexRow || Number(uniqueIndexRow.unique) !== 1) {
        throw new Error(`Required unique index is missing or not unique: ${uniqueIndex}`);
      }
      if (!normalIndexRow) {
        throw new Error(`Required normal index is missing: ${normalIndex}`);
      }

      const uniqueIndexColumns = await tx.$queryRawUnsafe<IndexInfoRow[]>(
        `PRAGMA index_info(${quoteIdentifier(uniqueIndex)})`,
      );
      if (uniqueIndexColumns.length !== 1 || uniqueIndexColumns[0]?.name !== metaColumn) {
        throw new Error(`Unique index does not cover only ${metaColumn}.`);
      }
    });

    console.log("PASS: Meta attribution columns and indexes are ready.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : "Meta attribution repair failed."}`);
  process.exitCode = 1;
});
