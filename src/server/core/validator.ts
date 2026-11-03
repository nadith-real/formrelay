import { z } from "zod";

const MAX_FIELDS = 50;
const MAX_FIELD_LENGTH = 8000;
const MAX_FIELD_NAME = 100;

export function sanitizeSubmission(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const entries = Object.entries(raw).slice(0, MAX_FIELDS);
  for (const [key, value] of entries) {
    const name = key.slice(0, MAX_FIELD_NAME);
    if (!name) continue;
    if (typeof value === "string") {
      out[name] = value.slice(0, MAX_FIELD_LENGTH);
    } else if (typeof value === "number" || typeof value === "boolean") {
      out[name] = value;
    } else if (Array.isArray(value)) {
      out[name] = value
        .slice(0, 50)
        .map((item) => (typeof item === "string" ? item.slice(0, MAX_FIELD_LENGTH) : String(item).slice(0, 200)));
    } else if (value === null) {
      out[name] = null;
    } else {
      out[name] = String(value).slice(0, MAX_FIELD_LENGTH);
    }
  }
  return out;
}

export function applyValidation(
  data: Record<string, unknown>,
  config: Record<string, unknown> | null | undefined,
): string[] {
  const errors: string[] = [];
  if (!config) return errors;
  const required = Array.isArray(config.required) ? (config.required as unknown[]) : [];
  for (const field of required) {
    if (typeof field !== "string") continue;
    const value = data[field];
    if (value === undefined || value === null || value === "") {
      errors.push(`${field} is required`);
    }
  }
  const emailFields = Array.isArray(config.emailFields) ? (config.emailFields as unknown[]) : [];
  const emailCheck = z.string().email();
  for (const field of emailFields) {
    if (typeof field !== "string") continue;
    const value = data[field];
    if (typeof value === "string" && value && !emailCheck.safeParse(value).success) {
      errors.push(`${field} must be a valid email`);
    }
  }
  return errors;
}

export const projectInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  websiteUrl: z.string().trim().max(500).optional().nullable(),
});

export const formInput = z.object({
  name: z.string().trim().min(1).max(120),
  endpointSlug: z
    .string()
    .trim()
    .min(4)
    .max(64)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  enabled: z.boolean().optional(),
  allowedOrigins: z.array(z.string().max(300)).max(50).optional(),
  redirectUrl: z.string().trim().max(1000).optional().nullable(),
  successMessage: z.string().trim().max(500).optional().nullable(),
  validationConfig: z.record(z.unknown()).optional(),
  honeypotField: z.string().trim().max(50).optional().nullable(),
  spamProtection: z.boolean().optional(),
  rateLimitPerMinute: z.number().int().min(1).max(1000).optional(),
});

export const loginInput = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});
