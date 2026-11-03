export type GeoResult = { country: string | null; region: string | null };

type GeoAdapter = (ip: string) => Promise<GeoResult>;

let adapter: GeoAdapter | null = null;

export function setGeoAdapter(next: GeoAdapter | null): void {
  adapter = next;
}

function clientIp(headers: Record<string, string | undefined>, fallback = ""): string {
  const forwarded = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = headers["x-real-ip"] || headers["X-Real-IP"];
  if (real) return real.trim();
  return fallback;
}

export async function lookupGeo(ip: string): Promise<GeoResult> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return { country: null, region: null };
  }
  if (adapter) {
    try {
      return await adapter(ip);
    } catch {
      return { country: null, region: null };
    }
  }
  return { country: null, region: null };
}

export { clientIp };
