import { Hono } from "hono";
import { jsonError, jsonOk } from "../core/response";
import { getProject } from "../projects/project.service";
import { getOverview, resolveRange } from "./analytics.service";

export const analyticsRoutes = new Hono();

analyticsRoutes.get("/projects/:projectId/analytics", async (c) => {
  const project = await getProject(c.req.param("projectId"));
  if (!project) return jsonError(c, "Project not found", 404);
  const url = new URL(c.req.url);
  const range = resolveRange(url.searchParams.get("from") || undefined, url.searchParams.get("to") || undefined);
  const overview = await getOverview(project.id, range);
  return jsonOk(c, { range, overview });
});
