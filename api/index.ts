// Placeholder replaced at build time by `npm run build:api` (esbuild bundle).
// Keeps the /api route registered before the build output lands.
export default function handler() {
  return new Response("API is building. Redeploy if you see this.", { status: 503 });
}
