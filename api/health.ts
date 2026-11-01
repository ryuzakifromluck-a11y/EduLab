/** Vercel Function: GET /api/health. Used by the post-deploy smoke test and the uptime workflow. */
declare const process: { env: { VERCEL_GIT_COMMIT_SHA?: string; VERCEL_ENV?: string; AI_API_KEY?: string; AI_BASE_URL?: string } }

export function GET() {
  const env = process.env
  return new Response(
    JSON.stringify({
      ok: true,
      release: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown',
      environment: env.VERCEL_ENV ?? 'unknown',
      // Whether the tutor has an upstream configured; never the key itself.
      tutorConfigured: Boolean(env.AI_API_KEY || env.AI_BASE_URL),
    }),
    { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } },
  )
}
