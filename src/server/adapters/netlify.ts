import { handle } from "hono/netlify";
import { loadEnvFile } from "../core/env.ts";
import { bootstrapSchema } from "../db/bootstrap.ts";
import { createApp } from "../app.ts";

loadEnvFile();
await bootstrapSchema();
const app = createApp();

export default handle(app);
