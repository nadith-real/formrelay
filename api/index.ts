import { handle } from "hono/vercel";
import { loadEnvFile } from "../src/server/core/env";
import { bootstrapSchema } from "../src/server/db/bootstrap";
import { createApp } from "../src/server/app";

loadEnvFile();

let bootstrapped = false;
async function ensureBootstrap() {
  if (bootstrapped) return;
  await bootstrapSchema();
  bootstrapped = true;
}

const app = createApp();

app.use("*", async (c, next) => {
  try {
    await ensureBootstrap();
  } catch (err) {
    console.error("Schema bootstrap failed:", err);
  }
  return next();
});

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export default handler;
