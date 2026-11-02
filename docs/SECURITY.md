# EduLab security model

This is the result of the security audit of the accounts API, AI tutor, analytics server and web app, and the reference for deploying them safely.

## Audit findings and fixes

| # | Area | Finding (before) | Severity | Fix |
| --- | --- | --- | --- | --- |
| 1 | Session | The JWT was kept in `localStorage`, so any injected script could read and send it away; it stayed valid for 30 days with no way to sign out on the server. | High | The token is now an `HttpOnly` cookie (`__Host-edulab_session`, `Secure`, `SameSite=Lax`, `Path=/`). Page scripts cannot read it. `POST /api/auth/logout` expires it; sign-out while offline is finished on the next online start. Only the public profile stays in `localStorage`. Tokens saved by older versions are moved into the cookie once and removed. |
| 2 | CORS | `CORS_ORIGINS` defaulted to `*`. Analytics also answered `Access-Control-Allow-Origin: *`. | Medium | Exact-origin allowlists only. `*` is refused at start-up. Production default is same-origin only. Credentialed CORS (`Allow-Credentials: true`) is sent only to listed origins, and preflights from other origins get 403. |
| 3 | CSRF | Not an issue with bearer tokens, but would become one with cookies. | (new) | Every write must be `application/json` (an HTML form cannot send it, and cross-origin it forces a preflight) and, when the browser sends `Origin`, come from the API's own origin or a listed one. Otherwise 403/415. `SameSite=Lax` is a third layer. |
| 4 | Brute force | No rate limit on sign-in or sign-up. | High | Sign-in: 5 attempts per minute per account and address, plus 30 per minute per address across accounts (a classroom behind one IP can still sign in together). Sign-up: 5 per minute per address. Profile and progress writes: 60 per minute per user. 429 with `Retry-After`, and the form shows a translated message. |
| 5 | Rate-limit bypass | The tutor keyed its limit on the first `X-Forwarded-For` entry, which the client controls; the dev server passed it through. A client could send a new address with every request and never be limited. | High | Forwarding headers are believed only behind a trusted proxy (`VERCEL`, `TRUST_PROXY=1`), and then only `X-Real-IP` or the right-most hop. The dev server overwrites them. IPv6 clients are grouped by /64. Limiter memory is capped (oldest keys dropped). |
| 6 | Tutor abuse | Any website could call `/api/tutor` from its visitors' browsers and spend the AI quota. Bodies had no size cap on the dev server. | Medium | Browser calls from other origins get 403 (extra origins via `TUTOR_ALLOWED_ORIGINS`). JSON only. Bodies over 48 KB get 413. |
| 7 | Validation | Hand-written checks were mostly sound, but: no upper bound on password length (scrypt cost), invisible/bidi characters allowed in names, `decodeURIComponent` could throw (500), any `[a-z0-9-]` id could be stored as progress, and `__proto__`-style setting keys were copied into objects. | Medium | All bodies go through zod schemas (`server/schemas.ts`) that reuse the shared rules in `src/lib/authValidation.ts`, so the form and the API reject the same input. Passwords are capped at 128 characters, names are stripped of control and bidi characters, emails cannot contain `<>"` or backticks, experiment ids must be in the catalog, settings keys must be plain identifiers, and the score must be a number from 0 to 100. Malformed paths return 400. |
| 8 | Account enumeration | Sign-in for an unknown email skipped the password hash, so it answered measurably faster than a wrong password. | Low | Unknown emails are checked against a dummy hash, so both take the same time. (Sign-up still says "email taken", which is normal UX; the sign-up limit slows probing.) |
| 9 | Response headers | API and site sent no security headers. | Medium | API: `nosniff`, `X-Frame-Options: DENY`, `CSP: default-src 'none'`, `Referrer-Policy: no-referrer`, `no-store`, HSTS when cookies are secure. Site (`vercel.json`, `public/_headers`): `nosniff`, `DENY` framing, `Referrer-Policy`, `Permissions-Policy`, HSTS, COOP. |
| 10 | XSS | No `dangerouslySetInnerHTML`, React escapes text, and JSON-LD is already escaped. But there was no CSP and one inline script. | Defence in depth | The build adds a Content-Security-Policy to every page (`security.plugin.ts`): scripts only from the site itself, no inline script, no eval, no plugins, no `<base>` hijack. The theme script moved to `public/theme-init.js`. A test (`locale-safety.test.ts`) fails if any translation contains script tags, `javascript:` URLs, event handlers, entities, or any tag other than `<b>`. |
| 11 | Offline cache | The service worker cached `/api/*` GET responses without an `Authorization` header. With a cookie session, that would have cached `/api/auth/me` and `/api/progress` and shown them to the next person on a shared device. | High (with fix 1) | Only `/api/analytics/impact` (public, anonymous) is cached. |
| 12 | Secrets and storage | A weak `JWT_SECRET` was accepted; `db.json` was written world-readable. | Low | Production requires a 32+ character secret. The database file is written `0600`. |
| 13 | Analytics | Anyone could post unlimited events and grow the stats file with made-up experiment ids. | Low | 30 posts per minute per address, JSON only, at most 200 distinct experiment ids kept. |

Already correct and kept: `passwordHash` never leaves the server (all responses go through `publicUser`, now covered by tests), scrypt hashes with per-user salts, constant-time comparisons, HS256 JWTs with a fixed header and expiry, the AI key only on the server with provider errors never forwarded.

**SQL injection:** the API stores JSON files and builds no queries, so there is nothing to inject today. When the store moves to PostgreSQL, use parameterised queries only (`$1`, `$2`), never string concatenation.

## Deployment checklist

1. Set `NODE_ENV=production` and a random `JWT_SECRET` (32+ characters).
2. Serve the API from the same site as the app: ideally the same origin through a rewrite (`/api/auth/*`, `/api/progress/*` → the API host), or a subdomain such as `api.edulab.example`. Then leave `COOKIE_SAMESITE` at `Lax`.
3. If the app calls the API from another origin, set `VITE_API_URL` at build time (the CSP then allows it) and `CORS_ORIGINS=https://your-app.example` on the API. Only use `COOKIE_SAMESITE=None` if the two are on different sites, and know that browsers that block third-party cookies will then not keep users signed in.
4. Behind your own reverse proxy (nginx, Caddy), set `TRUST_PROXY=1` so limits see real client addresses. Do not set it when clients reach Node directly.
5. On the analytics API (Vercel Functions or the local server), set `ALLOWED_ORIGIN` only if the app posts to it from another origin. It stores only aggregate counters in `analytics_counters`; client addresses are used in memory for rate limiting and never written.
6. Set a monthly spend limit on the LLM account; the per-IP tutor limit is in memory and per instance.

## Known limits

- Rate limits are in memory, per process. They reset on restart and are not shared between instances. Moving them to Redis or PostgreSQL is planned with the database work.
- A signed-in session cannot be revoked from another device (for example "sign out everywhere" or after a password change); tokens expire after 30 days. Adding a per-user session version to the token would allow this once the database lands.
- `style-src` allows `'unsafe-inline'` because React and the chart/3D libraries set inline styles. Style injection cannot run script under this policy.
