import { eq, lt } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../db/client";
import { sessions } from "../db/schema";
import { hashToken } from "../security/encryption";
import { loadConfig, isProduction } from "../core/config";
import { newId, now } from "../core/ids";

const COOKIE = "fr_session";

export function cookieName(): string {
  return COOKIE;
}

export async function createSession(): Promise<{ token: string; expiresAt: Date }> {
  const config = loadConfig();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_HOURS * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id: newId(),
    sessionTokenHash: hashToken(token),
    expiresAt,
    createdAt: now(),
  });
  return { token, expiresAt };
}

export async function getSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const hash = hashToken(token);
  const rows = await db.select().from(sessions).where(eq(sessions.sessionTokenHash, hash)).limit(1);
  const row = rows[0];
  if (!row) return false;
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.id));
    return false;
  }
  return true;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.sessionTokenHash, hashToken(token)));
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export function sessionCookie(token: string, expiresAt: Date): string {
  const parts = [
    `${COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (isProduction()) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(): string {
  const parts = [`${COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Expires=Thu, 01 Jan 1970 00:00:00 GMT"];
  if (isProduction()) parts.push("Secure");
  return parts.join("; ");
}
