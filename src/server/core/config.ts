import { z } from "zod";

const envSchema = z.object({
  APP_USERNAME: z.string().min(1, "APP_USERNAME is required"),
  APP_PASSWORD: z.string().min(8, "APP_PASSWORD must be at least 8 characters"),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
  APP_URL: z.string().url().default("http://localhost:5173"),
  ENCRYPTION_KEY: z.string().min(16, "ENCRYPTION_KEY is required"),
  DATABASE_URL: z.string().default("file:./data/formrelay.db"),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SESSION_TTL_HOURS: z.coerce.number().default(72),
  LOGIN_RATE_LIMIT: z.coerce.number().default(5),
  LOGIN_RATE_WINDOW_MS: z.coerce.number().default(900000),
  MAX_BODY_BYTES: z.coerce.number().default(102400),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function isProduction(): boolean {
  return loadConfig().NODE_ENV === "production";
}
