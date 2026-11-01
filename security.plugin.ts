import { loadEnv, type Plugin } from 'vite'

/**
 * Adds a Content-Security-Policy <meta> tag to the built pages, so the policy
 * travels with the HTML to any static host. Only same-origin scripts can run
 * (no inline script, no eval), which turns most XSS bugs into dead ends.
 *
 * `connect-src` also allows the origins of VITE_API_URL and VITE_ANALYTICS_URL
 * when those point at another host. Headers a <meta> cannot set
 * (frame-ancestors, HSTS, nosniff…) are in vercel.json and public/_headers.
 *
 * Build only: the dev server needs inline scripts and a websocket for HMR.
 */

/** Policy directives, shared with the test that checks the headers files agree. */
export function contentSecurityPolicy(connectOrigins: string[] = []): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    // React and the chart/3D libraries set style attributes at runtime.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...connectOrigins],
    // three.js text rendering builds its worker from a blob: URL.
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ')
}

export function originOf(url: string | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url.trim())) return null
  try {
    return new URL(url.trim()).origin
  } catch {
    return null
  }
}

export function securityHeaders(): Plugin {
  let csp = ''
  return {
    name: 'edulab-security',
    apply: 'build',
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || config.root, 'VITE_')
      const extra = [originOf(env.VITE_API_URL), originOf(env.VITE_ANALYTICS_URL)].filter((o): o is string => !!o)
      csp = contentSecurityPolicy([...new Set(extra)])
    },
    transformIndexHtml: {
      order: 'pre',
      handler: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' }],
    },
  }
}
