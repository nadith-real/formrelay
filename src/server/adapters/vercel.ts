import { handle } from "hono/vercel";
import { loadEnvFile } from "../core/env";
import { bootstrapSchema } from "../db/bootstrap";
import { createApp } from "../app";

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
