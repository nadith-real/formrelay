import { eq, desc } from "drizzle-orm";
import { db } from "../db/client";
import { forms, projects, projectIntegrations, projectSettings, submissions } from "../db/schema";
import { newId, now } from "../core/ids";

export async function listProjects() {
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProject(id: string) {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createProject(input: { name: string; description?: string | null; websiteUrl?: string | null }) {
  const id = newId();
  const timestamp = now();
  const row = {
    id,
    name: input.name,
    description: input.description || null,
    websiteUrl: input.websiteUrl || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.insert(projects).values(row);
  await db.insert(projectSettings).values({
    projectId: id,
    retentionDays: null,
    updatedAt: timestamp,
  });
  return row;
}

export async function updateProject(
  id: string,
  input: { name?: string; description?: string | null; websiteUrl?: string | null },
) {
  const existing = await getProject(id);
  if (!existing) return null;
  const updated = {
    name: input.name ?? existing.name,
    description: input.description === undefined ? existing.description : input.description,
    websiteUrl: input.websiteUrl === undefined ? existing.websiteUrl : input.websiteUrl,
    updatedAt: now(),
  };
  await db.update(projects).set(updated).where(eq(projects.id, id));
  return { ...existing, ...updated };
}

export async function deleteProject(id: string): Promise<boolean> {
  const existing = await getProject(id);
  if (!existing) return false;
  await db.delete(projects).where(eq(projects.id, id));
  return true;
}

export async function getProjectSettings(projectId: string) {
  const rows = await db.select().from(projectSettings).where(eq(projectSettings.projectId, projectId)).limit(1);
  return rows[0] ?? { projectId, retentionDays: null, updatedAt: now() };
}

export async function updateProjectSettings(projectId: string, retentionDays: number | null) {
  const timestamp = now();
  const existing = await db.select().from(projectSettings).where(eq(projectSettings.projectId, projectId)).limit(1);
  if (existing[0]) {
    await db.update(projectSettings).set({ retentionDays, updatedAt: timestamp }).where(eq(projectSettings.projectId, projectId));
  } else {
    await db.insert(projectSettings).values({ projectId, retentionDays, updatedAt: timestamp });
  }
  return { projectId, retentionDays, updatedAt: timestamp };
}

export async function clearProjectSubmissions(projectId: string): Promise<number> {
  const projectForms = await db.select({ id: forms.id }).from(forms).where(eq(forms.projectId, projectId));
  let count = 0;
  for (const form of projectForms) {
    const result = await db.delete(submissions).where(eq(submissions.formId, form.id));
    count += Number(result.rowsAffected || 0);
  }
  return count;
}

export async function listProjectIntegrations(projectId: string) {
  return db.select().from(projectIntegrations).where(eq(projectIntegrations.projectId, projectId));
}
