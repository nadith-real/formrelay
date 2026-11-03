import { UAParser } from "ua-parser-js";


export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export function parseUserAgent(ua: string | undefined): {
  deviceType: DeviceType;
  browser: string;
} {
  if (!ua) return { deviceType: "unknown", browser: "Other" };
  const parser = new UAParser(ua);
  const device = parser.getDevice();
  const browser = parser.getBrowser();
  let deviceType: DeviceType = "unknown";
  const type = (device.type || "").toLowerCase();
  if (type === "mobile") deviceType = "mobile";
  else if (type === "tablet") deviceType = "tablet";
  else if (!type || type === "console" || type === "smarttv" || type === "wearable" || type === "embedded") {
    deviceType = "desktop";
  }
  const name = browser.name || "Other";
  const normalized = normalizeBrowser(name);
  return { deviceType, browser: normalized };
}

function normalizeBrowser(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("chrome") && !lower.includes("chromium")) return "Chrome";
  if (lower.includes("firefox")) return "Firefox";
  if (lower.includes("safari")) return "Safari";
  if (lower.includes("edge")) return "Edge";
  return "Other";
}
