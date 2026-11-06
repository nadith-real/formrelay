import { handle } from "hono/vercel";
import { loadEnvFile } from "../core/env";
import { bootstrapSchema } from "../db/bootstrap";
import { createApp } from "../app";

loadEnvFile();
await bootstrapSchema();
const app = createApp();

export default handle(app);
