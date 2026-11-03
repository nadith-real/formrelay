import { Hono } from "hono";
import { formInput } from "../core/validator.ts";
import { jsonError, jsonOk } from "../core/response.ts";
import { getProject } from "../projects/project.service.ts";
import { createForm, deleteForm, getForm, listForms, updateForm } from "./form.service.ts";
import { loadConfig } from "../core/config.ts";

export const formRoutes = new Hono();

formRoutes.get("/projects/:projectId/forms", async (c) => {
  const project = await getProject(c.req.param("projectId"));
  if (!project) return jsonError(c, "Project not found", 404);
  const items = await listForms(project.id);
  return jsonOk(c, { items, appUrl: loadConfig().APP_URL });
});

formRoutes.post("/projects/:projectId/forms", async (c) => {
  const project = await getProject(c.req.param("projectId"));
  if (!project) return jsonError(c, "Project not found", 404);
  const parsed = formInput.safeParse(await c.req.json());
  if (!parsed.success) return jsonError(c, "Invalid form data", 400, { issues: parsed.error.flatten() });
  try {
    const form = await createForm(project.id, parsed.data);
    return jsonOk(c, { form });
  } catch (error) {
    return jsonError(c, error instanceof Error ? error.message : "Could not create form", 400);
  }
});

formRoutes.get("/forms/:id", async (c) => {
  const form = await getForm(c.req.param("id"));
  if (!form) return jsonError(c, "Form not found", 404);
  return jsonOk(c, { form, endpoint: `${loadConfig().APP_URL.replace(/\/$/, "")}/f/${form.endpointSlug}` });
});

formRoutes.patch("/forms/:id", async (c) => {
  const parsed = formInput.partial().safeParse(await c.req.json());
  if (!parsed.success) return jsonError(c, "Invalid form data", 400);
  try {
    const form = await updateForm(c.req.param("id"), parsed.data);
    if (!form) return jsonError(c, "Form not found", 404);
    return jsonOk(c, { form });
  } catch (error) {
    return jsonError(c, error instanceof Error ? error.message : "Could not update form", 400);
  }
});

formRoutes.delete("/forms/:id", async (c) => {
  const ok = await deleteForm(c.req.param("id"));
  if (!ok) return jsonError(c, "Form not found", 404);
  return jsonOk(c);
});
