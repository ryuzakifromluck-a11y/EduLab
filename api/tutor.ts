import { checkTutorEnv } from '../server/tutor/config.js'
import { handleTutorRequest, type TutorEnv } from '../server/tutor/handler.js'

declare const process: { env: TutorEnv }

/**
 * Vercel Function: GET/POST /api/tutor.
 * Set AI_API_KEY (and optionally AI_BASE_URL, AI_MODEL) in Project → Settings → Environment Variables,
 * and connect Upstash Redis (Storage tab) so rate limits are shared and survive cold starts.
 */

// Checked once per cold start. Logs variable names only, never their values.
const check = checkTutorEnv(process.env, { serverless: !!process.env.VERCEL })
for (const e of check.errors) console.error(`[tutor] config error: ${e} The tutor answers 503 not_configured until this is fixed.`)
for (const w of check.warnings) console.warn(`[tutor] config warning: ${w}`)

export function GET(request: Request) {
  return handleTutorRequest(request, process.env)
}

export function POST(request: Request) {
  return handleTutorRequest(request, process.env)
}
