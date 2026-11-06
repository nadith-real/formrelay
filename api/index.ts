import { handle } from "hono/vercel";
import { loadEnvFile } from "../src/server/core/env";
import { bootstrapSchema } from "../src/server/db/bootstrap";
import { createApp } from "../src/server/app";

loadEnvFile();
await bootstrapSchema();
const app = createApp();

export default handle(app);
