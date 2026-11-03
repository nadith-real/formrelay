import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.DATABASE_URL || "file:./data/formrelay.db";
if (url.startsWith("file:") && url !== "file::memory:") {
  mkdirSync(dirname(url.slice(5)), { recursive: true });
}

const client = createClient({ url });
const db = drizzle(client);
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations complete.");
