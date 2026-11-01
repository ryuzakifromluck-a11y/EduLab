#!/usr/bin/env node
/**
 * Smoke test for a deployed EduLab site (also used by the uptime workflow).
 *
 *   node scripts/smoke.mjs https://edulab.uz
 *   node scripts/smoke.mjs https://edulab.uz --api https://api.edulab.uz   # also the accounts API
 *   node scripts/smoke.mjs http://localhost:4173 --preview                  # `npm run preview` (no Vercel headers or /api/health)
 *
 * Exits 1 if any check fails, after retrying (fresh deployments can take a few seconds to answer).
 * Set VERCEL_AUTOMATION_BYPASS_SECRET to test a preview deployment behind Vercel Deployment Protection.
 * Writes a Markdown table to $GITHUB_STEP_SUMMARY when it runs in GitHub Actions.
 */
import { appendFileSync } from 'node:fs'

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args.splice(i, 2)[1]
}
const preview = args.includes('--preview') && (args.splice(args.indexOf('--preview'), 1), true)
const apiUrl = flag('--api')
const attempts = Number(flag('--retries') ?? 3)
const site = args[0]?.replace(/\/+$/, '')

if (!site || !/^https?:\/\//.test(site)) {
  console.error('Usage: node scripts/smoke.mjs <site-url> [--api <accounts-api-url>] [--preview] [--retries N]')
  process.exit(2)
}

const headers = {}
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

async function request(url, init = {}) {
  const started = Date.now()
  const res = await fetch(url, { redirect: 'follow', ...init, headers: { ...headers, ...init.headers }, signal: AbortSignal.timeout(15_000) })
  return { res, body: await res.text(), ms: Date.now() - started }
}

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

/** @type {Array<[string, () => Promise<string | void>]>} */
const checks = [
  [
    'Home page',
    async () => {
      const { res, body, ms } = await request(`${site}/`)
      expect(res.status === 200, `HTTP ${res.status}`)
      expect(body.includes('id="root"'), 'no #root element in HTML')
      return `${ms} ms`
    },
  ],
  [
    'Experiment page (prerendered head)',
    async () => {
      const { res, body } = await request(`${site}/physics/pendulum`)
      expect(res.status === 200, `HTTP ${res.status}`)
      expect(/<meta[^>]+property="og:title"/.test(body), 'missing og:title')
      expect(/<meta[^>]+property="og:image"/.test(body), 'missing og:image')
    },
  ],
  [
    'Unknown route falls back to the SPA',
    async () => {
      const { res, body } = await request(`${site}/smoke-test-${Date.now()}`)
      expect(res.status === 200 && body.includes('id="root"'), `HTTP ${res.status}`)
    },
  ],
  [
    'Service worker',
    async () => {
      const { res, body } = await request(`${site}/sw.js`)
      expect(res.status === 200, `HTTP ${res.status}`)
      expect(!body.includes('__EDULAB_BUILD_ID__'), 'build placeholders were not filled')
      if (!preview) expect(/no-cache/.test(res.headers.get('cache-control') ?? ''), `cache-control is "${res.headers.get('cache-control')}", expected no-cache (vercel.json headers missing?)`)
    },
  ],
  [
    'Web app manifest',
    async () => {
      const { res, body } = await request(`${site}/manifest.json`)
      expect(res.status === 200, `HTTP ${res.status}`)
      expect(JSON.parse(body).start_url, 'no start_url')
    },
  ],
  [
    'sitemap.xml and robots.txt',
    async () => {
      const [sitemap, robots] = await Promise.all([request(`${site}/sitemap.xml`), request(`${site}/robots.txt`)])
      expect(sitemap.res.status === 200 && sitemap.body.includes('<urlset'), `sitemap HTTP ${sitemap.res.status}`)
      expect(robots.res.status === 200 && /sitemap:/i.test(robots.body), `robots HTTP ${robots.res.status}`)
    },
  ],
  ...(preview
    ? []
    : [
        [
          'Health endpoint',
          async () => {
            const { res, body } = await request(`${site}/api/health`)
            expect(res.status === 200, `HTTP ${res.status}`)
            const json = JSON.parse(body)
            expect(json.ok === true, 'ok is not true')
            return `release ${json.release}, tutor ${json.tutorConfigured ? 'configured' : 'not configured'}`
          },
        ],
      ]),
  [
    'AI tutor function is deployed',
    async () => {
      // An empty body must be answered by our handler (400, or 503 not_configured without AI_API_KEY),
      // not by the platform (404/405 means the function was not deployed).
      const { res, body } = await request(`${site}/api/tutor`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      if (res.status === 503 && body.includes('not_configured')) return 'deployed, AI_API_KEY not set'
      expect(res.status === 400, `HTTP ${res.status}, expected 400`)
    },
  ],
  [
    'Error reporting endpoint',
    async () => {
      const { res } = await request(`${site}/api/errors`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })
      expect(res.status === 400, `HTTP ${res.status}, expected 400`)
    },
  ],
  ...(apiUrl
    ? [
        [
          'Accounts API health',
          async () => {
            const { res, body, ms } = await request(`${apiUrl.replace(/\/+$/, '')}/api/health`)
            expect(res.status === 200 && JSON.parse(body).ok === true, `HTTP ${res.status}`)
            return `${ms} ms`
          },
        ],
      ]
    : []),
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function run(name, fn) {
  let last
  for (let i = 1; i <= attempts; i++) {
    try {
      return { name, ok: true, note: (await fn()) ?? '' }
    } catch (err) {
      last = err
      if (i < attempts) await sleep(3000 * i)
    }
  }
  return { name, ok: false, note: last?.cause?.code ?? last?.message ?? String(last) }
}

const results = await Promise.all(checks.map(([name, fn]) => run(name, fn)))
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.note ? ` (${r.note})` : ''}`)

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results.map((r) => `| ${r.name} | ${r.ok ? '✅' : '❌'} | ${String(r.note).replace(/\|/g, '\\|')} |`)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [`### Smoke test: ${site}`, '', '| Check | Result | Note |', '| --- | --- | --- |', ...rows, ''].join('\n') + '\n')
}

const failed = results.filter((r) => !r.ok)
if (failed.length) {
  console.error(`\n${failed.length} of ${results.length} checks failed for ${site}`)
  process.exit(1)
}
console.log(`\nAll ${results.length} checks passed for ${site}`)
