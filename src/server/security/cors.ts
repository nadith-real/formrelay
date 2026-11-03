export function originAllowed(origin: string | undefined, allowed: string[]): boolean {
  if (!allowed.length) return true;
  if (!origin) return false;
  return allowed.some((entry) => {
    const normalized = entry.trim().replace(/\/$/, "");
    if (!normalized) return false;
    if (normalized === "*") return true;
    try {
      const allowedUrl = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
      const originUrl = new URL(origin);
      return allowedUrl.host === originUrl.host;
    } catch {
      return normalized === origin || origin.endsWith(normalized);
    }
  });
}

export function corsHeaders(origin: string | undefined, allowed: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (!allowed.length) {
    headers["Access-Control-Allow-Origin"] = origin || "*";
    return headers;
  }
  if (origin && originAllowed(origin, allowed)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
