import { Hono } from "hono";
import { jsonError, jsonOk } from "../core/response";
import { getProject } from "../projects/project.service";
import { getProjectAnalytics } from "./analytics.service";

export const analyticsRoutes = new Hono();

analyticsRoutes.get("/projects/:projectId/analytics", async (c) => {
  const projectId = c.req.param("projectId");
  const project = await getProject(projectId);
  if (!project) return jsonError(c, "Project not found", 404);
  const data = await getProjectAnalytics(projectId);
  return jsonOk(c, data);
});
