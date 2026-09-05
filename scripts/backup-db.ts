import "dotenv/config";
import { copyFile, mkdir } from "fs/promises";
import path from "path";
async function main() {
  const root = process.cwd();
  const source = path.resolve(root, "data", "book.db");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.resolve(root, "backups", `book-${stamp}.db`);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  console.log(`Database backup created: ${destination}`);
}
main().catch((error) => { console.error("Database backup failed.", error); process.exitCode = 1; });
