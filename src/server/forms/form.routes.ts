import { Hono } from "hono";
import { formInput } from "../core/validator";
import { jsonError, jsonOk } from "../core/response";
import { getProject } from "../projects/project.service";
import { createForm, deleteForm, getForm, listForms, updateForm } from "./form.service";
import { loadConfig } from "../core/config";

export const formRoutes = new Hono();

formRoutes.get("/projects/:projectId/forms", async (c) => {
  const project = await getProject(c.req.param("projectId"));
  if (!project) return jsonError(c, "Project not found", 404);
  const items = await listForms(project.id);
  return jsonOk(c, { items });
});

formRoutes.post("/projects/:projectId/forms", async (c) => {
  const project = await getProject(c.req.param("projectId"));
  if (!project) return jsonError(c, "Project not found", 404);
  const body = await c.req.json().catch(() => null);
  const parsed = formInput.safeParse(body);
  if (!parsed.success) return jsonError(c, parsed.error.issues[0]?.message || "Invalid input", 400);
  const form = await createForm(project.id, parsed.data);
  return jsonOk(c, { form }, 201);
});

formRoutes.get("/forms/:formId", async (c) => {
  const form = await getForm(c.req.param("formId"));
  if (!form) return jsonError(c, "Form not found", 404);
  return jsonOk(c, { form });
});

formRoutes.patch("/forms/:formId", async (c) => {
  const existing = await getForm(c.req.param("formId"));
  if (!existing) return jsonError(c, "Form not found", 404);
  const body = await c.req.json().catch(() => null);
  const parsed = formInput.partial().safeParse(body);
  if (!parsed.success) return jsonError(c, parsed.error.issues[0]?.message || "Invalid input", 400);
  const form = await updateForm(existing.id, parsed.data);
  return jsonOk(c, { form });
});

formRoutes.delete("/forms/:formId", async (c) => {
  const existing = await getForm(c.req.param("formId"));
  if (!existing) return jsonError(c, "Form not found", 404);
  await deleteForm(existing.id);
  return jsonOk(c, { ok: true });
});
