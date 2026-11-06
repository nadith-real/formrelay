import { and, desc, eq, gte, inArray, lte, like, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import { forms, notificationLogs, submissions } from "../db/schema";
import { newId, now } from "../core/ids";

export type SubmissionStatus = "unread" | "read" | "spam";

export async function createSubmission(input: {
  formId: string;
  data: Record<string, unknown>;
  status?: SubmissionStatus;
  deviceType?: string | null;
  browser?: string | null;
  country?: string | null;
  region?: string | null;
  userAgent?: string | null;
}) {
  const row = {
    id: newId(),
    formId: input.formId,
    data: input.data,
    status: input.status || "unread",
    deviceType: input.deviceType || null,
    browser: input.browser || null,
    country: input.country || null,
    region: input.region || null,
    userAgent: input.userAgent || null,
    createdAt: now(),
  };
  await db.insert(submissions).values(row);
  return row;
}

export async function listSubmissions(options: {
  projectId: string;
  formId?: string;
  status?: string;
  search?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  const projectForms = await db.select({ id: forms.id, name: forms.name }).from(forms).where(eq(forms.projectId, options.projectId));
  const formIds = projectForms.map((f) => f.id);
  if (!formIds.length) return { items: [], total: 0 };
  const formNameMap = new Map(projectForms.map((f) => [f.id, f.name]));

  const filters = [inArray(submissions.formId, formIds)];
  if (options.formId) filters.push(eq(submissions.formId, options.formId));
  if (options.status) filters.push(eq(submissions.status, options.status));
  if (options.from) filters.push(gte(submissions.createdAt, options.from));
  if (options.to) filters.push(lte(submissions.createdAt, options.to));
  if (options.search) {
    const q = `%${options.search}%`;
    filters.push(or(like(submissions.id, q), sql`lower(cast(${submissions.data} as text)) like lower(${q})`)!);
  }

  const where = and(...filters);
  const totalRows = await db.select({ count: sql<number>`count(*)` }).from(submissions).where(where);
  const total = Number(totalRows[0]?.count || 0);
  const limit = Math.min(options.limit ?? 50, 200);
  const offset = options.offset ?? 0;
  const items = await db
    .select()
    .from(submissions)
    .where(where)
    .orderBy(desc(submissions.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    total,
    items: items.map((item) => ({
      ...item,
      formName: formNameMap.get(item.formId) || "Unknown",
      sender: extractSender(item.data),
    })),
  };
}

export async function getSubmission(id: string, projectId: string) {
  const rows = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const form = await db.select().from(forms).where(eq(forms.id, row.formId)).limit(1);
  if (!form[0] || form[0].projectId !== projectId) return null;
  const logs = await db.select().from(notificationLogs).where(eq(notificationLogs.submissionId, id));
  return { ...row, form: form[0], notifications: logs, sender: extractSender(row.data) };
}

export async function updateSubmissionStatus(id: string, projectId: string, status: SubmissionStatus) {
  const existing = await getSubmission(id, projectId);
  if (!existing) return null;
  await db.update(submissions).set({ status }).where(eq(submissions.id, id));
  return { ...existing, status };
}

export async function deleteSubmission(id: string, projectId: string): Promise<boolean> {
  const existing = await getSubmission(id, projectId);
  if (!existing) return false;
  await db.delete(submissions).where(eq(submissions.id, id));
  return true;
}

export async function bulkDeleteSubmissions(ids: string[], projectId: string): Promise<number> {
  let deleted = 0;
  for (const id of ids) {
    if (await deleteSubmission(id, projectId)) deleted += 1;
  }
  return deleted;
}

export function extractSender(data: Record<string, unknown>): string | null {
  const keys = ["email", "Email", "name", "Name", "from", "sender"];
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function toCsv(rows: Array<{ id: string; formName: string; status: string; createdAt: Date; data: Record<string, unknown> }>): string {
  const fieldSet = new Set<string>();
  for (const row of rows) {
    Object.keys(row.data).forEach((k) => fieldSet.add(k));
  }
  const fields = [...fieldSet];
  const header = ["id", "form", "status", "created_at", ...fields];
  const escape = (value: unknown) => {
    const str = value == null ? "" : String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.formName,
        row.status,
        row.createdAt.toISOString(),
        ...fields.map((f) => escape(row.data[f])),
      ].join(","),
    );
  }
  return lines.join("\n");
}
