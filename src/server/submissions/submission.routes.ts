import { Hono } from "hono";
import { z } from "zod";
import { jsonError, jsonOk } from "../core/response";
import { getProject } from "../projects/project.service";
import {
  bulkDeleteSubmissions,
  deleteSubmission,
  getSubmission,
  listSubmissions,
  toCsv,
  updateSubmissionStatus,
} from "./submission.service";

export const submissionRoutes = new Hono();

submissionRoutes.get("/projects/:projectId/submissions", async (c) => {
  const project = await getProject(c.req.param("projectId"));
  if (!project) return jsonError(c, "Project not found", 404);
  const url = new URL(c.req.url);
  const result = await listSubmissions({
    projectId: project.id,
    formId: url.searchParams.get("formId") || undefined,
    status: url.searchParams.get("status") || undefined,
    search: url.searchParams.get("search") || undefined,
    from: url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : undefined,
    to: url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : undefined,
    limit: Number(url.searchParams.get("limit") || 50),
    offset: Number(url.searchParams.get("offset") || 0),
  });
  return jsonOk(c, result);
});

submissionRoutes.get("/projects/:projectId/submissions.csv", async (c) => {
  const project = await getProject(c.req.param("projectId"));
  if (!project) return jsonError(c, "Project not found", 404);
  const url = new URL(c.req.url);
  const result = await listSubmissions({
    projectId: project.id,
    formId: url.searchParams.get("formId") || undefined,
    status: url.searchParams.get("status") || undefined,
    search: url.searchParams.get("search") || undefined,
    from: url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : undefined,
    to: url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : undefined,
    limit: 5000,
    offset: 0,
  });
  const csv = toCsv(result.items);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="formrelay-${project.id}.csv"`,
    },
  });
});

submissionRoutes.get("/projects/:projectId/submissions/:id", async (c) => {
  const item = await getSubmission(c.req.param("id"), c.req.param("projectId"));
  if (!item) return jsonError(c, "Submission not found", 404);
  return jsonOk(c, { item });
});

submissionRoutes.patch("/projects/:projectId/submissions/:id", async (c) => {
  const parsed = z.object({ status: z.enum(["unread", "read", "spam"]) }).safeParse(await c.req.json());
  if (!parsed.success) return jsonError(c, "Invalid status", 400);
  const item = await updateSubmissionStatus(c.req.param("id"), c.req.param("projectId"), parsed.data.status);
  if (!item) return jsonError(c, "Submission not found", 404);
  return jsonOk(c, { item });
});

submissionRoutes.delete("/projects/:projectId/submissions/:id", async (c) => {
  const ok = await deleteSubmission(c.req.param("id"), c.req.param("projectId"));
  if (!ok) return jsonError(c, "Submission not found", 404);
  return jsonOk(c);
});

submissionRoutes.post("/projects/:projectId/submissions/bulk-delete", async (c) => {
  const parsed = z.object({ ids: z.array(z.string()).min(1).max(200) }).safeParse(await c.req.json());
  if (!parsed.success) return jsonError(c, "Invalid request", 400);
  const deleted = await bulkDeleteSubmissions(parsed.data.ids, c.req.param("projectId"));
  return jsonOk(c, { deleted });
});
