/**
 * `npm run api`: starts the local backends used by `npm run dev`.
 *   accounts API   http://localhost:8787/api   (server/index.ts)
 *   analytics API  http://localhost:8788/api/analytics   (server/analytics-server.mjs)
 * Ctrl+C stops both. Works the same on Windows, macOS and Linux.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`EduLab's API needs Node.js 22.18 or newer (you have ${process.versions.node}). Install the current LTS from https://nodejs.org`)
  process.exit(1)
}

const servers = ['../server/index.ts', '../server/analytics-server.mjs'].map((rel) =>
  spawn(process.execPath, [fileURLToPath(new URL(rel, import.meta.url))], { stdio: 'inherit' }),
)

const stop = () => servers.forEach((s) => s.kill())
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const s of servers) s.on('exit', (code) => {
  if (code) {
    stop()
    process.exit(code)
  }
})
