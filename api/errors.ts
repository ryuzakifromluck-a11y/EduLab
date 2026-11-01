import { handleErrorReport, type MonitoringEnv } from '../server/monitoring/errors.js'

declare const process: { env: MonitoringEnv }

/** Vercel Function: POST /api/errors. Client error reports land in the project's runtime logs (and MONITORING_WEBHOOK_URL, if set). */
export function POST(request: Request) {
  return handleErrorReport(request, process.env)
}
