/* EduLab service worker.
 *
 * At build time the `edulab-sw` Vite plugin replaces the two placeholders below with
 * the build id and the list of every file the app needs in dist/ (shell, lazy
 * experiment chunks with their three.js scenes, locale data, fonts, icons), so the
 * whole lab works offline after the first visit. In dev the placeholders stay as-is
 * and the worker is never registered.
 *
 * Strategies:
 *   navigation        network first (3 s timeout), then the cached app shell
 *   /api GET          network first with retry, then the last good answer, then a JSON 503
 *   /api: only public data (PUBLIC_API) is cached; per-user calls are retried, then a JSON 503
 *   /api writes       passed through untouched; the app queues unsent progress itself
 *   everything else   cache first (hashed assets never change), then network
 */
const BUILD_ID = '__EDULAB_BUILD_ID__'
const PRECACHE_URLS = self.__EDULAB_PRECACHE__ || ['/', '/index.html', '/favicon.svg', '/manifest.json']

const PRECACHE = `edulab-precache-${BUILD_ID}`
// Hashed build assets never change, so this cache survives updates: a tab still
// running the previous build can keep lazy-loading its own chunks.
const ASSETS = 'edulab-assets'
const ASSETS_MAX_ENTRIES = 200
const API = 'edulab-api'
const PUBLIC_API = ['/api/analytics/impact']
const SHELL = '/index.html'
const NAV_TIMEOUT_MS = 3000
const API_TIMEOUT_MS = 8000
const SYNC_TAG = 'edulab-progress'
// Servers often send `Vary: Origin`; module-script requests carry an Origin header that
// the precache requests did not, so without ignoreVary every lazy chunk would miss offline.
const MATCH = { ignoreVary: true }

self.addEventListener('install', (event) => {
  event.waitUntil(precache())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k.startsWith('edulab-precache-') && k !== PRECACHE).map((k) => caches.delete(k)))
      await trimCache(ASSETS, ASSETS_MAX_ENTRIES)
      // Lets the browser start the navigation request while the worker boots.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {})
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
  else if (event.data === 'GET_VERSION') event.ports[0]?.postMessage({ buildId: BUILD_ID, precached: PRECACHE_URLS.length })
})

/* Background Sync (Chrome, Edge, Android): connectivity is back, so ask open tabs to send
 * their queued progress. The queue lives in the page because sending needs the user's session cookie,
 * which the worker never handles itself. */
self.addEventListener('sync', (event) => {
  if (event.tag !== SYNC_TAG) return
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) client.postMessage({ type: 'SYNC', tag: SYNC_TAG })
    }),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(navigation(event))
  } else if (url.pathname.startsWith('/api/')) {
    // Only public, anonymous data is cached. Accounts, progress and the tutor are per user
    // (the session is a cookie the worker cannot see), so they always go to the network
    // (retried, then a JSON 503 when offline) and can never be served to the next person
    // who signs in on a shared device.
    if (PUBLIC_API.some((p) => url.pathname.startsWith(p))) event.respondWith(apiNetworkFirst(request))
    else event.respondWith(apiNoStore(request))
  } else {
    event.respondWith(cacheFirst(request))
  }
})

/** Downloads every precache URL, retrying each a few times so one flaky request doesn't fail the install. */
async function precache() {
  const cache = await caches.open(PRECACHE)
  // The old version's assets are good candidates: most hashed files are unchanged between builds.
  await Promise.all(
    PRECACHE_URLS.map(async (url) => {
      const existing = url.startsWith('/assets/') ? await caches.match(url, MATCH) : undefined
      if (existing) return cache.put(url, existing)
      const response = await retry(() => fetch(url, { cache: 'reload' }), 3, 500)
      if (!response.ok) throw new Error(`precache ${url}: ${response.status}`)
      return cache.put(url, response)
    }),
  )
}

/** SPA navigation: fresh HTML when the network answers quickly, otherwise the cached shell. */
async function navigation(event) {
  try {
    const response = await withTimeout(
      (async () => (await event.preloadResponse) || fetch(event.request))(),
      NAV_TIMEOUT_MS,
    )
    if (response.ok) {
      const cache = await caches.open(PRECACHE)
      cache.put(SHELL, response.clone())
      return response
    }
    // A 404/500 from the host still gets the app, which renders its own error page.
  } catch {
    /* offline or slow: fall through to the cached shell */
  }
  return (await caches.match(SHELL, MATCH)) || (await caches.match('/', MATCH)) || offlinePage()
}

async function apiNetworkFirst(request) {
  const cache = await caches.open(API)
  try {
    const response = await retry(() => withTimeout(fetch(request), API_TIMEOUT_MS), 2, 600)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request, MATCH)
    return cached || offlineJson()
  }
}

async function apiNoStore(request) {
  try {
    return await retry(() => withTimeout(fetch(request), API_TIMEOUT_MS), 2, 600)
  } catch {
    return offlineJson()
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, MATCH)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(ASSETS)
    cache.put(request, response.clone())
  }
  return response
}

/** Retries `fn` on a network error (not on an HTTP error status) with exponential backoff. */
async function retry(fn, retries, baseMs) {
  // No point waiting for backoff when the device knows it has no connection.
  if (self.navigator && self.navigator.onLine === false) retries = 0
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt >= retries) throw err
      await new Promise((r) => setTimeout(r, baseMs * 2 ** attempt))
    }
  }
}

async function trimCache(name, max) {
  const cache = await caches.open(name)
  const keys = await cache.keys()
  // Cache keys come back in insertion order, so the oldest go first.
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)))
}

function offlineJson() {
  return new Response(JSON.stringify({ error: 'offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-EduLab-Offline': '1' },
  })
}

function offlinePage() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EduLab</title>' +
      '<body style="font-family:system-ui,sans-serif;background:#0a0e17;color:#e6e9f2;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:16px">' +
      '<div><h1 style="font-size:20px">EduLab is offline</h1><p>Connect to the internet once to download the lab, then it works offline.</p></div>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => (clearTimeout(id), resolve(v)),
      (e) => (clearTimeout(id), reject(e)),
    )
  })
}
