import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { authRoutes } from "./auth/auth.routes.ts";
import { requireAuth, requireCsrf } from "./auth/middleware.ts";
import { projectRoutes } from "./projects/project.routes.ts";
import { formRoutes } from "./forms/form.routes.ts";
import { submissionRoutes } from "./submissions/submission.routes.ts";
import { analyticsRoutes } from "./analytics/analytics.routes.ts";
import { handleOptions, processSubmission } from "./core/processor.ts";
import { jsonError } from "./core/response.ts";
import { loadConfig } from "./core/config.ts";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    secureHeaders({
      xFrameOptions: "DENY",
      xContentTypeOptions: "nosniff",
      referrerPolicy: "strict-origin-when-cross-origin",
    }),
  );

  app.onError((err, c) => {
    console.error(err);
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.startsWith("Invalid environment")) {
      return jsonError(c, message, 500);
    }
    return jsonError(c, "Internal server error", 500);
  });

  app.get("/api/health", (c) => c.json({ ok: true, name: "FormRelay" }));

  app.route("/api/auth", authRoutes);

  const protectedApi = new Hono();
  protectedApi.use("*", requireAuth, requireCsrf);
  protectedApi.route("/", formRoutes);
  protectedApi.route("/", submissionRoutes);
  protectedApi.route("/", analyticsRoutes);
  protectedApi.route("/", projectRoutes);
  app.route("/api", protectedApi);

  app.options("/f/:slug", handleOptions);
  app.post("/f/:slug", processSubmission);
  app.get("/f/:slug", (c) => {
    const json = (c.req.header("accept") || "").includes("application/json");
    if (json) return jsonError(c, "Method not allowed", 405);
    return c.html(
      `<!doctype html><html><head><meta charset="utf-8"/><title>FormRelay</title></head><body style="font-family:Montserrat,system-ui,sans-serif;padding:48px;color:#171717"><h1>FormRelay endpoint</h1><p>Submit using POST.</p></body></html>`,
    );
  });

  app.notFound((c) => jsonError(c, "Not found", 404));

  return app;
}

export type AppType = ReturnType<typeof createApp>;

export function publicBaseUrl(): string {
  return loadConfig().APP_URL.replace(/\/$/, "");
}
