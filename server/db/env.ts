import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Loads `.env.local` and then `.env` from the project root, if present, so
 * `npm run api` / `npm run migrate` pick up DATABASE_URL without exporting it.
 * Variables already set in the environment always win.
 */
export function loadLocalEnv(root = fileURLToPath(new URL('../../', import.meta.url))): void {
  for (const name of ['.env.local', '.env']) {
    const file = root + name
    if (existsSync(file)) process.loadEnvFile(file)
  }
}
