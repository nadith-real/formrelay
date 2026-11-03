import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { forms, submissions } from "../db/schema.ts";
import { newId, newSlug, now } from "../core/ids.ts";

export type FormRecord = typeof forms.$inferSelect;

export async function listForms(projectId: string) {
  const rows = await db.select().from(forms).where(eq(forms.projectId, projectId));
  const counts = await db
    .select({ formId: submissions.formId, count: sql<number>`count(*)` })
    .from(submissions)
    .groupBy(submissions.formId);
  const countMap = new Map(counts.map((c) => [c.formId, Number(c.count)]));
  return rows.map((form) => ({ ...form, submissionCount: countMap.get(form.id) || 0 }));
}

export async function getForm(id: string) {
  const rows = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getFormBySlug(slug: string) {
  const rows = await db.select().from(forms).where(eq(forms.endpointSlug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function slugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await getFormBySlug(slug);
  if (!existing) return false;
  if (excludeId && existing.id === excludeId) return false;
  return true;
}

export async function createForm(
  projectId: string,
  input: {
    name: string;
    endpointSlug?: string;
    enabled?: boolean;
    allowedOrigins?: string[];
    redirectUrl?: string | null;
    successMessage?: string | null;
    validationConfig?: Record<string, unknown>;
    honeypotField?: string | null;
    spamProtection?: boolean;
    rateLimitPerMinute?: number;
  },
) {
  let slug = input.endpointSlug || newSlug(12);
  let attempts = 0;
  while (await slugTaken(slug)) {
    slug = newSlug(12);
    attempts += 1;
    if (attempts > 8) throw new Error("Unable to generate a unique endpoint slug");
  }
  const timestamp = now();
  const row = {
    id: newId(),
    projectId,
    name: input.name,
    endpointSlug: slug,
    enabled: input.enabled ?? true,
    allowedOrigins: input.allowedOrigins ?? [],
    redirectUrl: input.redirectUrl || null,
    successMessage: input.successMessage || null,
    validationConfig: input.validationConfig ?? {},
    honeypotField: input.honeypotField ?? "_gotcha",
    spamProtection: input.spamProtection ?? true,
    rateLimitPerMinute: input.rateLimitPerMinute ?? 30,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.insert(forms).values(row);
  return row;
}

export async function updateForm(
  id: string,
  input: Partial<{
    name: string;
    endpointSlug: string;
    enabled: boolean;
    allowedOrigins: string[];
    redirectUrl: string | null;
    successMessage: string | null;
    validationConfig: Record<string, unknown>;
    honeypotField: string | null;
    spamProtection: boolean;
    rateLimitPerMinute: number;
  }>,
) {
  const existing = await getForm(id);
  if (!existing) return null;
  if (input.endpointSlug && (await slugTaken(input.endpointSlug, id))) {
    throw new Error("Endpoint slug already in use");
  }
  const updated = {
    name: input.name ?? existing.name,
    endpointSlug: input.endpointSlug ?? existing.endpointSlug,
    enabled: input.enabled ?? existing.enabled,
    allowedOrigins: input.allowedOrigins ?? existing.allowedOrigins,
    redirectUrl: input.redirectUrl === undefined ? existing.redirectUrl : input.redirectUrl,
    successMessage: input.successMessage === undefined ? existing.successMessage : input.successMessage,
    validationConfig: input.validationConfig ?? existing.validationConfig,
    honeypotField: input.honeypotField === undefined ? existing.honeypotField : input.honeypotField,
    spamProtection: input.spamProtection ?? existing.spamProtection,
    rateLimitPerMinute: input.rateLimitPerMinute ?? existing.rateLimitPerMinute,
    updatedAt: now(),
  };
  await db.update(forms).set(updated).where(eq(forms.id, id));
  return { ...existing, ...updated };
}

export async function deleteForm(id: string): Promise<boolean> {
  const existing = await getForm(id);
  if (!existing) return false;
  await db.delete(forms).where(eq(forms.id, id));
  return true;
}

export async function formBelongsToProject(formId: string, projectId: string): Promise<boolean> {
  const rows = await db
    .select({ id: forms.id })
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.projectId, projectId)))
    .limit(1);
  return Boolean(rows[0]);
}
