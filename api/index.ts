import { Hono } from "hono";
import { handle } from "hono/vercel";

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true, name: "FormRelay", mode: "minimal" }));
app.all("*", (c) => c.json({ error: "not found in minimal handler" }, 404));

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export default handler;
