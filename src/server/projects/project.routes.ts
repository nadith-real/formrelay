import { Hono } from "hono";
import { projectInput } from "../core/validator";
import { jsonError, jsonOk } from "../core/response";
import {
  clearProjectSubmissions,
  createProject,
  deleteProject,
  getProject,
  getProjectSettings,
  listProjects,
  updateProject,
  updateProjectSettings,
} from "./project.service";
import { listForms } from "../forms/form.service";
import { getIntegration, toPublic, upsertIntegration, testIntegration } from "../notifications/notification.service";
import { z } from "zod";

export const projectRoutes = new Hono();

projectRoutes.get("/projects", async (c) => {
  const items = await listProjects();
  return jsonOk(c, { items });
});

projectRoutes.post("/projects", async (c) => {
  const parsed = projectInput.safeParse(await c.req.json());
  if (!parsed.success) return jsonError(c, "Invalid project data", 400, { issues: parsed.error.flatten() });
  const project = await createProject(parsed.data);
  return jsonOk(c, { project });
});

projectRoutes.get("/projects/:id", async (c) => {
  const project = await getProject(c.req.param("id"));
  if (!project) return jsonError(c, "Project not found", 404);
  const forms = await listForms(project.id);
  const settings = await getProjectSettings(project.id);
  return jsonOk(c, { project, forms, settings });
});

projectRoutes.patch("/projects/:id", async (c) => {
  const parsed = projectInput.partial().safeParse(await c.req.json());
  if (!parsed.success) return jsonError(c, "Invalid project data", 400);
  const project = await updateProject(c.req.param("id"), parsed.data);
  if (!project) return jsonError(c, "Project not found", 404);
  return jsonOk(c, { project });
});

projectRoutes.delete("/projects/:id", async (c) => {
  const ok = await deleteProject(c.req.param("id"));
  if (!ok) return jsonError(c, "Project not found", 404);
  return jsonOk(c);
});

projectRoutes.get("/projects/:id/settings", async (c) => {
  const project = await getProject(c.req.param("id"));
  if (!project) return jsonError(c, "Project not found", 404);
  const settings = await getProjectSettings(project.id);
  const telegram = toPublic(await getIntegration(project.id, "telegram"), "telegram");
  const email = toPublic(await getIntegration(project.id, "email"), "email");
  return jsonOk(c, { project, settings, integrations: { telegram, email } });
});

projectRoutes.patch("/projects/:id/settings", async (c) => {
  const project = await getProject(c.req.param("id"));
  if (!project) return jsonError(c, "Project not found", 404);
  const body = z
    .object({ retentionDays: z.number().int().min(1).max(3650).nullable().optional() })
    .safeParse(await c.req.json());
  if (!body.success) return jsonError(c, "Invalid settings", 400);
  const settings = await updateProjectSettings(project.id, body.data.retentionDays ?? null);
  return jsonOk(c, { settings });
});

projectRoutes.post("/projects/:id/submissions/clear", async (c) => {
  const project = await getProject(c.req.param("id"));
  if (!project) return jsonError(c, "Project not found", 404);
  const deleted = await clearProjectSubmissions(project.id);
  return jsonOk(c, { deleted });
});

const telegramSchema = z.object({
  enabled: z.boolean().optional(),
  botToken: z.string().optional(),
  chatIds: z.union([z.string(), z.array(z.string())]).optional(),
  template: z.string().optional(),
});

projectRoutes.put("/projects/:id/integrations/telegram", async (c) => {
  const project = await getProject(c.req.param("id"));
  if (!project) return jsonError(c, "Project not found", 404);
  const parsed = telegramSchema.safeParse(await c.req.json());
  if (!parsed.success) return jsonError(c, "Invalid Telegram settings", 400);
  const chatIds = parsed.data.chatIds
    ? Array.isArray(parsed.data.chatIds)
      ? parsed.data.chatIds
      : parsed.data.chatIds.split(/[,\s]+/).filter(Boolean)
    : undefined;
  const integration = await upsertIntegration(project.id, "telegram", {
    enabled: parsed.data.enabled,
    credentials: {
      botToken: parsed.data.botToken,
      chatIds,
    },
    settings: parsed.data.template ? { template: parsed.data.template } : undefined,
  });
  return jsonOk(c, { integration });
});

const emailSchema = z.object({
  enabled: z.boolean().optional(),
  host: z.string().optional(),
  port: z.number().int().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  security: z.enum(["none", "ssl", "tls"]).optional(),
  from: z.string().optional(),
  to: z.union([z.string(), z.array(z.string())]).optional(),
});

projectRoutes.put("/projects/:id/integrations/email", async (c) => {
  const project = await getProject(c.req.param("id"));
  if (!project) return jsonError(c, "Project not found", 404);
  const parsed = emailSchema.safeParse(await c.req.json());
  if (!parsed.success) return jsonError(c, "Invalid email settings", 400);
  const to = parsed.data.to
    ? Array.isArray(parsed.data.to)
      ? parsed.data.to
      : parsed.data.to.split(/[,\s]+/).filter(Boolean)
    : undefined;
  const integration = await upsertIntegration(project.id, "email", {
    enabled: parsed.data.enabled,
    credentials: {
      host: parsed.data.host,
      port: parsed.data.port,
      username: parsed.data.username,
      password: parsed.data.password,
      security: parsed.data.security,
      from: parsed.data.from,
      to,
    },
  });
  return jsonOk(c, { integration });
});

projectRoutes.post("/projects/:id/integrations/:provider/test", async (c) => {
  const project = await getProject(c.req.param("id"));
  if (!project) return jsonError(c, "Project not found", 404);
  const provider = c.req.param("provider");
  if (provider !== "telegram" && provider !== "email") return jsonError(c, "Unknown provider", 400);
  const result = await testIntegration(project.id, provider);
  if (!result.ok) return jsonError(c, result.error || "Test failed", 400);
  return jsonOk(c, { message: "Test succeeded" });
});
