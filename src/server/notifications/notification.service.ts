import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { notificationLogs, projectIntegrations, projects } from "../db/schema";
import { decryptSecret, encryptSecret, maskSecret } from "../security/encryption";
import { newId, now } from "../core/ids";
import { parseTelegramCredentials, sendTelegramMessage, buildTelegramMessage, testTelegram } from "./telegram";
import { parseSmtpCredentials, sendEmail, buildEmailHtml, testEmail } from "./email";

export type IntegrationPublic = {
  provider: string;
  enabled: boolean;
  configured: boolean;
  settings: Record<string, unknown>;
  masked: Record<string, string>;
};

function safeJsonParse(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(decryptSecret(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function getIntegration(projectId: string, provider: string) {
  const rows = await db
    .select()
    .from(projectIntegrations)
    .where(and(eq(projectIntegrations.projectId, projectId), eq(projectIntegrations.provider, provider)))
    .limit(1);
  return rows[0] ?? null;
}

export function toPublic(row: typeof projectIntegrations.$inferSelect | null, provider: string): IntegrationPublic {
  if (!row) {
    return { provider, enabled: false, configured: false, settings: {}, masked: {} };
  }
  const creds = safeJsonParse(row.encryptedCredentials);
  const masked: Record<string, string> = {};
  if (provider === "telegram") {
    masked.botToken = maskSecret(String(creds.botToken || ""));
    masked.chatIds = Array.isArray(creds.chatIds) ? String(creds.chatIds.join(", ")) : String(creds.chatId || "");
  }
  if (provider === "email") {
    masked.host = String(creds.host || "");
    masked.port = String(creds.port || "");
    masked.username = String(creds.username || "");
    masked.password = maskSecret(String(creds.password || ""));
    masked.from = String(creds.from || "");
    masked.to = Array.isArray(creds.to) ? creds.to.join(", ") : String(creds.to || "");
    masked.security = String(creds.security || "tls");
  }
  return {
    provider,
    enabled: row.enabled,
    configured: Boolean(row.encryptedCredentials),
    settings: row.settings || {},
    masked,
  };
}

export async function upsertIntegration(
  projectId: string,
  provider: string,
  input: { enabled?: boolean; credentials?: Record<string, unknown>; settings?: Record<string, unknown> },
) {
  const existing = await getIntegration(projectId, provider);
  const timestamp = now();
  let encrypted = existing?.encryptedCredentials ?? null;
  if (input.credentials) {
    const current = safeJsonParse(existing?.encryptedCredentials ?? null);
    const merged = { ...current };
    for (const [key, value] of Object.entries(input.credentials)) {
      if (typeof value === "string" && (value.includes("•") || value === "")) continue;
      if (value === undefined || value === null) continue;
      merged[key] = value;
    }
    encrypted = encryptSecret(JSON.stringify(merged));
  }
  if (existing) {
    await db
      .update(projectIntegrations)
      .set({
        enabled: input.enabled ?? existing.enabled,
        encryptedCredentials: encrypted,
        settings: input.settings ?? existing.settings,
        updatedAt: timestamp,
      })
      .where(eq(projectIntegrations.id, existing.id));
  } else {
    await db.insert(projectIntegrations).values({
      id: newId(),
      projectId,
      provider,
      enabled: input.enabled ?? false,
      encryptedCredentials: encrypted,
      settings: input.settings ?? {},
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  return toPublic(await getIntegration(projectId, provider), provider);
}

export async function logNotification(input: {
  projectId: string;
  submissionId: string | null;
  provider: string;
  status: "sent" | "failed" | "skipped";
  errorMessage?: string | null;
}) {
  await db.insert(notificationLogs).values({
    id: newId(),
    projectId: input.projectId,
    submissionId: input.submissionId,
    provider: input.provider,
    status: input.status,
    errorMessage: input.errorMessage || null,
    sentAt: input.status === "sent" ? now() : null,
    createdAt: now(),
  });
}

export async function dispatchNotifications(input: {
  projectId: string;
  submissionId: string;
  formName: string;
  website?: string | null;
  createdAt: Date;
  data: Record<string, unknown>;
}): Promise<void> {
  const integrations = await db
    .select()
    .from(projectIntegrations)
    .where(eq(projectIntegrations.projectId, input.projectId));

  for (const integration of integrations) {
    if (!integration.enabled) continue;
    const creds = safeJsonParse(integration.encryptedCredentials);
    try {
      if (integration.provider === "telegram") {
        const parsed = parseTelegramCredentials(creds);
        const text = buildTelegramMessage({
          formName: input.formName,
          website: input.website,
          createdAt: input.createdAt,
          data: input.data,
          template: typeof integration.settings?.template === "string" ? integration.settings.template : undefined,
        });
        const result = await sendTelegramMessage(parsed, text);
        await logNotification({
          projectId: input.projectId,
          submissionId: input.submissionId,
          provider: "telegram",
          status: result.ok ? "sent" : "failed",
          errorMessage: result.error,
        });
      } else if (integration.provider === "email") {
        const parsed = parseSmtpCredentials(creds);
        const result = await sendEmail(
          parsed,
          `New submission: ${input.formName}`,
          buildEmailHtml(input),
        );
        await logNotification({
          projectId: input.projectId,
          submissionId: input.submissionId,
          provider: "email",
          status: result.ok ? "sent" : "failed",
          errorMessage: result.error,
        });
      }
    } catch (error) {
      await logNotification({
        projectId: input.projectId,
        submissionId: input.submissionId,
        provider: integration.provider,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export async function testIntegration(projectId: string, provider: string) {
  const integration = await getIntegration(projectId, provider);
  if (!integration) return { ok: false, error: "Integration is not configured" };
  const creds = safeJsonParse(integration.encryptedCredentials);
  if (provider === "telegram") return testTelegram(parseTelegramCredentials(creds));
  if (provider === "email") return testEmail(parseSmtpCredentials(creds));
  return { ok: false, error: "Unknown provider" };
}

export async function getProjectWebsite(projectId: string): Promise<string | null> {
  const rows = await db.select({ websiteUrl: projects.websiteUrl }).from(projects).where(eq(projects.id, projectId)).limit(1);
  return rows[0]?.websiteUrl ?? null;
}
