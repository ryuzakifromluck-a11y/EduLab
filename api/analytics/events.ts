import { handleVercelAnalytics } from '../../server/analytics/vercel.js'

/** Vercel Function: POST /api/analytics/events. Folds anonymous visit/complete events into counters in Postgres. */
export const POST = handleVercelAnalytics
export const OPTIONS = handleVercelAnalytics
