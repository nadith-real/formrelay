import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { loadConfig } from "../core/config";

export type Database = LibSQLDatabase<typeof schema>;

let dbInstance: Database | null = null;
let clientInstance: Client | null = null;

function resolveUrl(raw: string): string {
  if (raw.startsWith("file:")) {
    const path = raw.slice("file:".length);
    if (path !== ":memory:") {
      mkdirSync(dirname(path), { recursive: true });
    }
    return raw;
  }
  if (raw.startsWith("libsql:") || raw.startsWith("http:") || raw.startsWith("https:")) {
    return raw;
  }
  mkdirSync(dirname(raw), { recursive: true });
  return `file:${raw}`;
}

export function getClient(): Client {
  if (clientInstance) return clientInstance;
  const config = loadConfig();
  clientInstance = createClient({ url: resolveUrl(config.DATABASE_URL) });
  return clientInstance;
}

export function getDb(): Database {
  if (dbInstance) return dbInstance;
  dbInstance = drizzle(getClient(), { schema });
  return dbInstance;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as Function).bind(real) : value;
  },
});
