import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import { loadEnvFile } from "./core/env";
import { loadConfig } from "./core/config";
import { bootstrapSchema } from "./db/bootstrap";
import { createApp } from "./app";
import { purgeExpiredSessions } from "./auth/sessions";

loadEnvFile();
const config = loadConfig();
await bootstrapSchema();
await purgeExpiredSessions();

const app = createApp();
const clientDir = "dist/client";

if (existsSync(clientDir)) {
  app.use("/assets/*", serveStatic({ root: clientDir }));
  app.use("/favicon.svg", serveStatic({ root: clientDir }));
  app.get("*", async (c, next) => {
    if (c.req.path.startsWith("/api") || c.req.path.startsWith("/f/")) {
      return next();
    }
    const indexPath = `${clientDir}/index.html`;
    if (existsSync(indexPath)) {
      const { readFileSync } = await import("node:fs");
      return c.html(readFileSync(indexPath, "utf8"));
    }
    return next();
  });
}

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`FormRelay listening on http://localhost:${info.port}`);
});
