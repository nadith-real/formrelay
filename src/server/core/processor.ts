import type { Context } from "hono";
import { getFormBySlug } from "../forms/form.service.ts";
import { createSubmission } from "../submissions/submission.service.ts";
import { applyValidation, sanitizeSubmission } from "./validator.ts";
import { isHoneypotTriggered, looksLikeSpam, stripHoneypot } from "../security/honeypot.ts";
import { corsHeaders, originAllowed } from "../security/cors.ts";
import { clientKey, rateLimit } from "../security/rate-limit.ts";
import { parseUserAgent } from "./ua.ts";
import { clientIp, lookupGeo } from "./geo.ts";
import { htmlMessage, jsonError, jsonOk, wantsJson } from "./response.ts";
import { loadConfig } from "./config.ts";
import { dispatchNotifications, getProjectWebsite } from "../notifications/notification.service.ts";
import { getProject } from "../projects/project.service.ts";

const RESERVED_FIELDS = new Set(["_gotcha", "_redirect", "_next", "_honeypot"]);

async function parseBody(c: Context): Promise<Record<string, unknown>> {
  const contentType = c.req.header("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await c.req.json();
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      throw new Error("JSON body must be an object");
    }
    return json as Record<string, unknown>;
  }
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await c.req.parseBody();
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(form)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  }
  try {
    const json = await c.req.json();
    if (json && typeof json === "object" && !Array.isArray(json)) return json as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return {};
}

function applyCors(c: Context, origin: string | undefined, allowed: string[]) {
  const headers = corsHeaders(origin, allowed);
  for (const [key, value] of Object.entries(headers)) c.header(key, value);
}

export async function handleOptions(c: Context) {
  const slug = c.req.param("slug");
  const form = slug ? await getFormBySlug(slug) : null;
  const origin = c.req.header("origin");
  applyCors(c, origin, form?.allowedOrigins || []);
  return c.body(null, 204);
}

export async function processSubmission(c: Context) {
  const slug = c.req.param("slug") || "";
  const origin = c.req.header("origin");
  const json = wantsJson(c);

  const form = await getFormBySlug(slug);
  if (!form) {
    if (json) return jsonError(c, "Form not found", 404);
    return c.html(htmlMessage("Form not found", "This form endpoint does not exist."), 404);
  }

  applyCors(c, origin, form.allowedOrigins || []);

  if (!form.enabled) {
    if (json) return jsonError(c, "This form is currently disabled", 403);
    return c.html(htmlMessage("Form disabled", "This form is not accepting submissions."), 403);
  }

  if (form.allowedOrigins?.length && origin && !originAllowed(origin, form.allowedOrigins)) {
    if (json) return jsonError(c, "Origin not allowed", 403);
    return c.html(htmlMessage("Forbidden", "This origin is not allowed to submit to this form."), 403);
  }

  const contentLength = Number(c.req.header("content-length") || 0);
  const maxBytes = loadConfig().MAX_BODY_BYTES;
  if (contentLength > maxBytes) {
    if (json) return jsonError(c, "Request too large", 413);
    return c.html(htmlMessage("Too large", "The submission exceeds the allowed size."), 413);
  }

  const ip = clientIp(
    {
      "x-forwarded-for": c.req.header("x-forwarded-for"),
      "x-real-ip": c.req.header("x-real-ip"),
    },
    c.req.header("cf-connecting-ip") || "unknown",
  );

  const limited = rateLimit(clientKey(ip, form.id), form.rateLimitPerMinute, 60_000);
  if (!limited.ok) {
    c.header("Retry-After", String(Math.ceil((limited.resetAt - Date.now()) / 1000)));
    if (json) return jsonError(c, "Too many submissions. Please try again later.", 429);
    return c.html(htmlMessage("Slow down", "Too many submissions. Please try again later."), 429);
  }

  let raw: Record<string, unknown>;
  try {
    raw = await parseBody(c);
  } catch {
    if (json) return jsonError(c, "Invalid request body", 400);
    return c.html(htmlMessage("Invalid request", "The form data could not be read."), 400);
  }

  if (isHoneypotTriggered(raw, form.honeypotField)) {
    if (json) return jsonOk(c, { id: "ignored" });
    return c.html(htmlMessage("Thank you", form.successMessage || "Your submission has been received."));
  }

  const cleaned = stripHoneypot(sanitizeSubmission(raw), form.honeypotField);
  for (const key of RESERVED_FIELDS) delete cleaned[key];

  const validationErrors = applyValidation(cleaned, form.validationConfig);
  if (validationErrors.length) {
    if (json) return jsonError(c, "Validation failed", 422, { errors: validationErrors });
    return c.html(htmlMessage("Validation failed", validationErrors.join(". ")), 422);
  }

  const ua = c.req.header("user-agent") || "";
  const { deviceType, browser } = parseUserAgent(ua);
  const geo = await lookupGeo(ip);
  const status = form.spamProtection && looksLikeSpam(cleaned) ? "spam" : "unread";

  const submission = await createSubmission({
    formId: form.id,
    data: cleaned,
    status,
    deviceType,
    browser,
    country: geo.country,
    region: geo.region,
    userAgent: ua.slice(0, 500),
  });

  const project = await getProject(form.projectId);
  const website = project?.websiteUrl || (await getProjectWebsite(form.projectId));
  try {
    await dispatchNotifications({
      projectId: form.projectId,
      submissionId: submission.id,
      formName: form.name,
      website,
      createdAt: submission.createdAt,
      data: cleaned,
    });
  } catch {
    /* notification failures must not fail the submission */
  }

  const redirect = (typeof raw._redirect === "string" && raw._redirect) || form.redirectUrl;
  if (!json && redirect) {
    return c.redirect(redirect, 303);
  }

  if (json) {
    return jsonOk(c, {
      id: submission.id,
      message: form.successMessage || "Submission received",
    });
  }

  return c.html(htmlMessage("Thank you", form.successMessage || "Your submission has been received."));
}
