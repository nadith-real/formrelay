import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import { loadEnvFile } from "./core/env.ts";
import { loadConfig } from "./core/config.ts";
import { bootstrapSchema } from "./db/bootstrap.ts";
import { createApp } from "./app.ts";
import { purgeExpiredSessions } from "./auth/sessions.ts";

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
      await next();
      return;
    }
    return serveStatic({ root: clientDir, path: "index.html" })(c, next);
  });
}

serve(
  {
    fetch: app.fetch,
    port: config.PORT,
    hostname: "0.0.0.0",
  },
  (info) => {
    console.log(`FormRelay listening on http://0.0.0.0:${info.port}`);
  },
);
