import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { loginInput } from "../core/validator.ts";
import { verifyCredentials } from "./authentication.ts";
import {
  clearSessionCookie,
  cookieName,
  createSession,
  destroySession,
  getSession,
  sessionCookie,
} from "./sessions.ts";
import { csrfTokenFromSession } from "./middleware.ts";
import { jsonError, jsonOk } from "../core/response.ts";
import { clientKey, rateLimit } from "../security/rate-limit.ts";
import { loadConfig } from "../core/config.ts";
import { clientIp } from "../core/geo.ts";

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const config = loadConfig();
  const ip = clientIp(
    {
      "x-forwarded-for": c.req.header("x-forwarded-for"),
      "x-real-ip": c.req.header("x-real-ip"),
    },
    "unknown",
  );
  const limited = rateLimit(clientKey(ip, "login"), config.LOGIN_RATE_LIMIT, config.LOGIN_RATE_WINDOW_MS);
  if (!limited.ok) {
    return jsonError(c, "Too many login attempts. Try again later.", 429);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return jsonError(c, "Invalid JSON", 400);
  }
  const parsed = loginInput.safeParse(body);
  if (!parsed.success) return jsonError(c, "Invalid credentials", 400);

  const valid = await verifyCredentials(parsed.data.username, parsed.data.password);
  if (!valid) return jsonError(c, "Invalid username or password", 401);

  const session = await createSession();
  c.header("Set-Cookie", sessionCookie(session.token, session.expiresAt));
  return jsonOk(c, { csrfToken: csrfTokenFromSession(session.token) });
});

authRoutes.post("/logout", async (c) => {
  const token = getCookie(c, cookieName());
  await destroySession(token);
  c.header("Set-Cookie", clearSessionCookie());
  return jsonOk(c);
});

authRoutes.get("/me", async (c) => {
  const token = getCookie(c, cookieName());
  const ok = await getSession(token);
  if (!ok) return jsonError(c, "Unauthorized", 401);
  return jsonOk(c, {
    username: loadConfig().APP_USERNAME,
    csrfToken: token ? csrfTokenFromSession(token) : null,
  });
});
