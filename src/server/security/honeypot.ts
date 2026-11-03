export function isHoneypotTriggered(
  data: Record<string, unknown>,
  fieldName: string | null | undefined,
): boolean {
  const field = fieldName || "_gotcha";
  const value = data[field];
  if (value === undefined || value === null || value === "") return false;
  return true;
}

export function stripHoneypot(
  data: Record<string, unknown>,
  fieldName: string | null | undefined,
): Record<string, unknown> {
  const field = fieldName || "_gotcha";
  const copy = { ...data };
  delete copy[field];
  return copy;
}

const SPAM_PATTERNS = [
  /https?:\/\/\S+\.(ru|xyz|top|click)\b/i,
  /\b(viagra|cialis|crypto airdrop|casino bonus)\b/i,
];

export function looksLikeSpam(data: Record<string, unknown>): boolean {
  const text = Object.values(data)
    .filter((v) => typeof v === "string")
    .join(" ");
  const urlCount = (text.match(/https?:\/\//gi) || []).length;
  if (urlCount >= 5) return true;
  return SPAM_PATTERNS.some((p) => p.test(text));
}
