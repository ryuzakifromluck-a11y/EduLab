import { handleVercelAnalytics } from '../../server/analytics/vercel.js'

/** Vercel Function: GET /api/analytics/impact. Aggregated, anonymous stats from Postgres (DATABASE_URL). */
export const GET = handleVercelAnalytics
export const HEAD = handleVercelAnalytics
export const OPTIONS = handleVercelAnalytics
