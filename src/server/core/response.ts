import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function wantsJson(c: Context): boolean {
  const accept = c.req.header("accept") || "";
  const contentType = c.req.header("content-type") || "";
  const xhr = c.req.header("x-requested-with");
  return (
    contentType.includes("application/json") ||
    accept.includes("application/json") ||
    xhr === "XMLHttpRequest"
  );
}

export function jsonOk(c: Context, extra: Record<string, unknown> = {}) {
  return c.json({ ok: true, ...extra }, 200);
}

export function jsonError(c: Context, message: string, status = 400, extra: Record<string, unknown> = {}) {
  return c.json({ ok: false, error: message, ...extra }, status as ContentfulStatusCode);
}

export function htmlMessage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Montserrat, system-ui, sans-serif; background: #fff; color: #171717; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
    .card { border: 1px solid #EAEAEA; border-radius: 12px; padding: 32px; max-width: 480px; text-align: center; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { color: #525252; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(body)}</p>
  </div>
</body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
