import { handle } from "hono/vercel";
import { loadEnvFile } from "../core/env";
import { bootstrapSchema } from "../db/bootstrap";
import { createApp } from "../app";

loadEnvFile();

let bootstrapped = false;
async function ensureBootstrap() {
  if (bootstrapped) return;
  await bootstrapSchema();
  bootstrapped = true;
}

const app = createApp();

// Run schema bootstrap on the first request instead of at module load,
// so a transient DB error does not prevent the function from starting.
app.use("*", async (c, next) => {
  try {
    await ensureBootstrap();
  } catch (err) {
    console.error("Schema bootstrap failed:", err);
    // Continue — health can still answer; other routes will fail clearly.
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
