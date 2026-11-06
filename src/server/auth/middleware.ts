import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { cookieName, getSession } from "./sessions";
import { jsonError } from "../core/response";
import { loadConfig } from "../core/config";
import { createHmac } from "node:crypto";

export const requireAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, cookieName());
  const ok = await getSession(token);
  if (!ok) return jsonError(c, "Unauthorized", 401);
  await next();
});

export function csrfTokenFromSession(sessionToken: string): string {
  return createHmac("sha256", loadConfig().APP_SECRET).update(sessionToken).digest("hex");
}

export const requireCsrf = createMiddleware(async (c, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    await next();
    return;
  }
  const session = getCookie(c, cookieName());
  if (!session) return jsonError(c, "Unauthorized", 401);
  const header = c.req.header("x-csrf-token");
  const expected = csrfTokenFromSession(session);
  if (!header || header !== expected) return jsonError(c, "Invalid CSRF token", 403);
  await next();
});
