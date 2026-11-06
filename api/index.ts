import { handle } from "hono/vercel";
import { loadEnvFile } from "../src/server/core/env";
import { bootstrapSchema } from "../src/server/db/bootstrap";
import { createApp } from "../src/server/app";

loadEnvFile();
await bootstrapSchema();
const app = createApp();
const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export default handler;
