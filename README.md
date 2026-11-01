# EduLab

**A Laboratory Without Borders. Science Accessible to Everyone.**

EduLab is a free, open virtual science laboratory. Students, teachers and independent learners can run interactive, scientifically accurate Physics and Chemistry experiments in the browser — no account, subscription or payment. An optional free account saves progress and preferences across devices.

## What's included

| Area | Status |
| --- | --- |
| Homepage, separate Physics and Chemistry sections with searchable, filterable libraries | ✅ |
| Pendulum Motion (nonlinear RK4 integration, exact period) | ✅ 3D + 2D fallback |
| Ohm's Law Circuit (switch, ammeter, voltmeter, recorded readings) | ✅ 3D + 2D fallback |
| Acid–Base Titration (exact strong acid/strong base equilibrium, 4 indicators) | ✅ 3D + 2D fallback |
| Projectile Motion and Reaction Rate (disappearing cross) | ✅ 3D + 2D fallback |
| Live graphs (freeze-to-inspect, CSV export), Formula Explorer | ✅ |
| Presentation Mode (fullscreen, large controls, keyboard/clicker shortcuts) | ✅ |
| English / Uzbek / Russian, light / dark themes, responsive layout, translation completeness test | ✅ |
| Knowledge checks (quiz per experiment, pass mark 70 %) | ✅ |
| Optional accounts: sign up / log in, saved progress per experiment, `/account` dashboard, completion badges, synced language and theme | ✅ needs `npm run api` |
| Passed knowledge checks saved to the account as the experiment's best score | ✅ |
| AI tutor on every experiment page (context-aware incl. quiz score, answers in EN/UZ/RU, key kept server-side) | ✅ needs `AI_API_KEY` |
| Global Impact dashboard | ✅ live data from the analytics API, falls back to clearly labelled **demo data** |
| Installable, works offline (PWA) | ✅ production build |
| SEO: per-page titles, Open Graph images, sitemap, robots.txt | ✅ |
| Accessibility pass (focus management, live announcements, labelled charts) | ✅ see `docs/ACCESSIBILITY.md` |
| CI/CD (lint, typecheck, test, build on GitHub Actions; Vercel deploy with smoke test) | ✅ |
| Monitoring (client error reports, health endpoint, hourly uptime check) | ✅ |
| Hypothesis stages, QR remote control | Planned |

## Getting started

Needs Node.js 22.18 or newer.

```bash
npm install
npm run api        # accounts API (8787) + analytics API (8788); keep it running
npm run dev        # in a second terminal: http://localhost:5173 (proxies /api to the APIs)
```

The site works without `npm run api`; only sign-in and live Global Impact figures need it. To try the AI tutor, copy `.env.example` to `.env.local`, set `AI_API_KEY`, and restart `npm run dev`.

```bash
npm run typecheck  # TypeScript, all projects
npm test           # unit tests + translation completeness check (Vitest)
npm run lint       # ESLint
npm run build      # production build in dist/ (prerendered SEO pages + service worker)
npm run preview    # serve dist/ to try the offline/PWA build
```

Deploys as a static site to Vercel (`vercel.json`) or Netlify (`public/_redirects`) with SPA fallback routing. The AI tutor endpoint (`api/tutor.ts`) runs as a Vercel Function; on a purely static host the rest of the app works and the tutor panel says it is unavailable.

## AI tutor

A chat panel ("Ask the tutor") on each experiment page sends the question, the recent conversation, the experiment's current parameters and readings, any knowledge-check score, and the app language to `POST /api/tutor`. The server adds a system prompt (patient tutor, simple language, guides instead of giving quiz answers, replies in the app language) and calls an OpenAI-compatible Chat Completions API.

1. Copy `.env.example` to `.env.local` and set `AI_API_KEY` (or point `AI_BASE_URL` at a local model such as Ollama).
2. `npm run dev` serves `/api/tutor` from the Vite dev server; on Vercel, set the same variables in the project settings.

The key is read only on the server and is never sent to the browser. The endpoint refuses browser calls from other sites (set `TUTOR_ALLOWED_ORIGINS` to allow more), so nobody can spend your quota from their own page; a `VITE_`-prefixed AI or Redis variable stops the build, because Vite would bundle it. `api/tutor.ts` checks the environment on each cold start and logs problems by variable name (never values); until `AI_API_KEY` is set the endpoint answers `503 not_configured` and `GET /api/tutor` returns `{ "available": false }`, which the chat panel shows as "not available".

Cost controls:

- 5 messages per minute and 30 per UTC day for each client IP (`AI_RATE_LIMIT_PER_MINUTE`, `AI_RATE_LIMIT_PER_DAY`), plus 30 per device per day in the browser.
- Replies are capped at 450 tokens (`AI_MAX_TOKENS` can lower it, not raise it) and only the last 10 messages are sent as history.
- Limits are stored in Redis when `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are set (on Vercel: Storage → Upstash Redis), so they are shared by every instance and survive restarts. One atomic script checks and counts both windows. IPs are stored only as salted SHA-256 hashes. If Redis is unreachable the tutor keeps working with in-memory limits and logs a warning.
- Without Redis, `npm run dev` / `npm run preview` keep the counts in `server/data/tutor-rate-limit.json`, so restarting the dev server does not reset them.

The last 10 messages of each experiment's conversation are saved on the device (`localStorage`, key `edulab-tutor-chats`) and removed on sign-out. Offline, the panel says the tutor is not available and disables the input.

Quiz features can share results with the tutor by calling `useTutor.getState().reportQuizResult(experimentId, { score, total, passed })` from `src/store/tutor.ts`.

### Accounts API

`server/` is a small Node API (JWT sessions in an HttpOnly cookie, scrypt password hashes, zod-validated request bodies, PostgreSQL storage) that the frontend calls under `/api`. Experiments work without it; only sign-in and saving progress need it.

**Database.** Use any PostgreSQL 13+ (local, Docker, Render, Neon, …) or Supabase:

```bash
docker compose up -d                       # optional: local PostgreSQL 16 on port 5432
echo 'DATABASE_URL=postgres://edulab:edulab@localhost:5432/edulab' >> .env.local
npm run migrate                            # creates the tables; run again after each upgrade
npm run import-json                        # optional: copy users and progress from server/data/db.json
npm run api
```

For Supabase, copy the *Session pooler* or direct URI from *Project Settings → Database → Connection string* (the transaction pooler on port 6543 cannot hold the migration lock) and add `?sslmode=require`. If Node then reports `self-signed certificate in certificate chain`, use `?sslmode=require&uselibpqcompat=true` (encrypted, as `psql` does it) or pass Supabase's CA certificate. Migrations live in `server/migrations/*.sql`; each runs once and is recorded in `schema_migrations` (`npm run migrate -- --status` lists them). Tables: `users` (unique index on `lower(email)`), `progress` (one row per user and experiment, indexed by `experiment_id`), `sessions` (one row per issued token, so signing out revokes it) `hypotheses` (latest hypothesis per user and experiment) and `remote_sessions` (reserved for teacher QR sessions). The API refuses to start if migrations are pending.

Without `DATABASE_URL` the API still runs in development on the old JSON file (`server/data/db.json`), so the app works without installing PostgreSQL. In production a database is required unless `EDULAB_DB` is set explicitly.

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | API, scripts | PostgreSQL connection string. Alternatively `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`. `DB_POOL_MAX` sets connections per instance (default 10). |
| `JWT_SECRET` | API | Token signing key, 32+ characters. Required when `NODE_ENV=production`; in development one is generated next to the database. |
| `EDULAB_DB` | API | Path of the JSON database used when no database is configured (default `server/data/db.json`). |
| `CORS_ORIGINS` | API | Comma-separated exact origins allowed to call the API from another origin, e.g. `https://edulab.example`. Same-origin calls need no entry; `*` is refused. Default: the local Vite servers in development, none in production. |
| `COOKIE_SECURE` | API | `1`/`0`. Default `1` in production (cookie `__Host-edulab_session`, HTTPS only), `0` in development. |
| `COOKIE_SAMESITE` | API | `Lax` (default), `Strict`, or `None` when the app and the API are on different sites. |
| `TRUST_PROXY` | API | `1` behind your own reverse proxy, so rate limits use the real client address from `X-Real-IP` / `X-Forwarded-For`. |
| `PORT` | API | Default `8787` (`npm run api` also starts analytics on `ANALYTICS_PORT`, default 8788). |
| `VITE_API_URL` | Frontend build | Origin of the deployed API, e.g. `https://api.edulab.example`. Leave unset when the API is served from the same origin. |

The API, `npm run migrate` and `npm run import-json` read these from the environment, `.env.local` or `.env` (the environment wins). The static host cannot run the API, so deploy it separately on any Node 22.18+ host (Render, Fly.io, a VPS); with PostgreSQL it needs no persistent disk and can run several instances.

Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET|PATCH /api/auth/me`, `GET /api/progress`, `PUT /api/progress/:experimentId` (body `{ score?, settings? }`).

Serve the API from the same site as the app if you can (the same origin through a rewrite, or a subdomain such as `api.edulab.example`): the session cookie then works with the default `SameSite=Lax`, including in browsers that block third-party cookies. See [docs/SECURITY.md](docs/SECURITY.md) for the security model, limits and a deployment checklist.

Tests: `npm test` runs the API tests on an in-memory store. Set `TEST_DATABASE_URL` (e.g. `postgres://postgres:postgres@localhost:5432/edulab_test`) to run the same tests, plus migration and import tests, on PostgreSQL; each test file uses its own temporary schema. CI does this with a PostgreSQL service.

### QR Remote Control (teacher view)

`/teacher/remote` lets a teacher open a class session: the API returns a random 6-character code (e.g. `YVK-MN7`, no look-alike characters) shown as a QR code (`qrcode.react`) and in large type, with a "Show on board" mode for projectors. Students scan it with the phone camera (or open `/student/remote` to scan in the browser or type the code), enter their name, and open any experiment. Every experiment page then reports its parameters, readings and running/paused state every 2 seconds, and the teacher's grid polls every 2 seconds. Sessions close after 30 minutes or when the teacher ends them.

Served by the same accounts API (`npm run api`), no extra configuration. Sessions live in memory (`server/remote.ts`): they hold only display names and are meant to be short-lived, so a restart ends open classes. Run one API instance, or move the registry to a shared store before scaling out.

| Endpoint | Who | Purpose |
| --- | --- | --- |
| `POST /api/remote/session` | teacher | Opens a session; returns `{ code, teacherKey, expiresAt }`. |
| `GET /api/remote/session/:code` | anyone / teacher | Session summary; with header `X-Teacher-Key` also every student and their live state. |
| `POST /api/remote/session/:code/join` | student | Body `{ name }`; returns `{ studentId, studentKey }`. |
| `PUT /api/remote/session/:code/state` | student | Body `{ studentId, studentKey, experimentId, subject, params, readings, running }`. |
| `POST /api/remote/session/:code/leave` | student | Leaves the session. |
| `DELETE /api/remote/session/:code` | teacher | Ends the session (header `X-Teacher-Key`). |

## Analytics

Opening an experiment page counts one session. Visits are counted in `localStorage` and sent to `POST <api>/events`; while offline they stay queued and are sent on the next visit. The Global Impact page reads `GET <api>/impact`. If the API is unreachable, returns an error, or is not JSON, the page shows the demo figures with the *Demo data* label. Only aggregate counts are stored: no accounts, IP addresses or identifiers.

`npm run api` starts the analytics server on http://localhost:8788/api/analytics next to the accounts API, and `npm run dev` proxies `/api/analytics` to it. To run it on its own: `npm run analytics:server`.

`VITE_ANALYTICS_URL` defaults to `/api/analytics` (same origin). Set it to `off` to keep demo data only. The server reads `ANALYTICS_PORT` (default 8788), `ANALYTICS_DATA` (JSON file), `ALLOWED_ORIGIN` (comma-separated exact origins for CORS; unset means same-origin only) and `ANALYTICS_RATE_LIMIT_PER_MINUTE` (event posts per address, default 30). A passed knowledge check counts as a completed session (once per experiment per page load).

## SEO and link previews

- `src/seo/meta.ts` defines the title, description, Open Graph/Twitter tags and JSON-LD (`EducationalOrganization` on the home page, `Course` + breadcrumbs on experiments) for every route. `useSEO` applies them at runtime in the current language.
- `seo.plugin.ts` runs during `npm run build`: it writes `sitemap.xml` (every available experiment plus the static pages) and `robots.txt` (points at the sitemap, keeps `/account` and `/api/` out) from the experiment catalog, and prerenders the `<head>` of each route into its own HTML file (`dist/physics/pendulum.html`, …), so Telegram, Discord and Facebook previews work without JavaScript. The build fails if a page points at a social card that does not exist.
- Set **`VITE_SITE_URL`** to the public origin (e.g. `https://edulab.uz`) for production builds. On Vercel and Netlify the production URL is picked up automatically if it is not set. In GitHub Actions, set the repository variable **`SITE_URL`**; without it the CI build (and the deploy made from it) points previews at `localhost`.
- Social cards (1200×630) live in `public/og/`, one per experiment, subject and the home page, drawn from `scripts/og/cards.tsx`.

| Command | What it does |
| --- | --- |
| `npm run og:images` | Renders only the cards whose title, description or design changed (Playwright + Chromium). `-- --force` renders all. |
| `npm run og:check` | No browser: fails if any card is missing or stale. Runs in CI. |
| `npm run seo:check` | After `npm run build`: fetches every sitemap URL as Telegram and Discord would and checks title, description, canonical/og:url and a reachable 1200×630 og:image. Runs in CI. |

- `src/seo/og-manifest.json` (written by `og:images`) stores a hash per card. `og:image` URLs carry the image hash as `?v=…`, so after a card is redrawn, Telegram/Discord/Facebook fetch the new picture instead of their cached one.
- Response headers (service worker, manifest, hashed assets, `/og/*`, sitemap, robots) are defined once in `public/_headers`; `vercel.json` mirrors them (a test checks), and the CI deploy builds its Vercel config from them with `scripts/deploy/vercel-output.mjs`, which also serves each prerendered page at its clean URL.

## CI/CD

GitHub Actions runs on every push (`.github/workflows/ci.yml`): install with a cached `node_modules` (`.github/actions/setup`), then lint, typecheck, test and build in parallel. The built `dist/` is uploaded as an artifact for inspection.

On push to `main`, once every check passes, the deploy job builds with `vercel build` and ships that output with `vercel deploy --prebuilt --prod`. Building through Vercel (instead of uploading `dist/`) is what keeps the `api/` Functions (`/api/tutor`, `/api/errors`, `/api/health`) and the `vercel.json` headers and rewrites in the deployment. Only one production deploy runs at a time. Afterwards `scripts/smoke.mjs` checks the live site (see Monitoring) and fails the run if anything is broken.

Repository secrets (Settings → Secrets and variables → Actions). The deploy is skipped with a warning until the first three exist:

| Name | Kind | Purpose |
| --- | --- | --- |
| `VERCEL_TOKEN` | secret | Token from Vercel account settings |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | secret | From `.vercel/project.json` after running `npx vercel link` locally |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | secret, optional | Lets the smoke test reach a deployment URL behind Vercel Deployment Protection |
| `PRODUCTION_URL` | variable | Public site, e.g. `https://edulab.uz`. Used by the post-deploy smoke test and the uptime check |
| `API_URL` | variable, optional | Accounts API origin, so its `/api/health` is checked too |

Set `VITE_SITE_URL`, `AI_API_KEY` and the other runtime variables in the Vercel project (Settings → Environment Variables); `vercel pull` brings them into the CI build. If Vercel's Git integration is also connected, turn off its automatic production deploys so `main` isn't deployed twice.

Pull requests also run `.github/workflows/pr.yml` (lint, typecheck, test, build), which posts a single results comment that it updates on each push. To block merging on failures, add the `Lint`, `Typecheck`, `Test` and `Build` checks (and `Lint, typecheck, test & build`) as required status checks in the branch protection rules for `main`.

**Manual deploy:** `scripts/deploy.sh` (preview) or `scripts/deploy.sh --prod` runs the same checks, builds, deploys and smoke-tests from your machine. It needs `npx vercel login` (or `VERCEL_TOKEN`) and a folder linked with `npx vercel link`. To undo a bad production deploy: `npx vercel rollback` (then `npx vercel promote <url>` once fixed, because a rollback pauses automatic production assignment).

## Monitoring

- **Client errors.** `src/lib/monitoring.ts` (no dependencies) reports uncaught errors, unhandled promise rejections, route render errors and 3D scene crashes to `POST /api/errors`. Reports carry the message, stack, page path without query string, language, release (commit) and user agent; never account ids, emails, IPs or experiment inputs. Repeats of the same error are dropped and at most 10 reports are sent per page load; browser-extension and stale-chunk noise is ignored. Production builds only: in development errors just go to the console. `VITE_MONITORING_URL=off` turns it off; `VITE_MONITORING_SAMPLE_RATE` samples.
- **Where they go.** `api/errors.ts` validates each report and writes it as one JSON line to the Vercel runtime logs: search Logs for `client_error`, and group by `fingerprint`. Set `MONITORING_WEBHOOK_URL` to a Slack or Discord incoming webhook to be alerted on the first occurrence of each error (per function instance and hour). Reports are rate limited per IP.
- **Friendly error page.** A render error now shows a translated "Something went wrong" page with Reload and Home buttons instead of React Router's developer screen.
- **Health.** `GET /api/health` returns `{ ok, release, environment, tutorConfigured }`; the accounts API has its own `GET /api/health`.
- **Smoke test.** `node scripts/smoke.mjs <url> [--api <accounts-api-url>]` checks the home page, a prerendered experiment page (Open Graph tags), SPA fallback, the service worker and its no-cache header, the manifest, sitemap and robots.txt, the health endpoint, and that `/api/tutor` and `/api/errors` are deployed. Try it locally with `npm run build && npm run preview` and `node scripts/smoke.mjs http://localhost:4173 --preview`.
- **Uptime.** `.github/workflows/uptime.yml` runs the smoke test hourly against `PRODUCTION_URL`. On failure it opens an issue labelled `uptime` (or comments on the open one), and closes it when the site recovers. GitHub pauses scheduled workflows after 60 days without repository activity; re-enable it from the Actions tab.

## Architecture

```
src/
  engines/          Pure, framework-free calculation engines + unit tests
    pendulum.ts     θ'' + (g/L) sin θ = 0, RK4; exact period via AGM
    ohm.ts          V = IR, P = VI, open/closed circuit
    titration.ts    charge balance [H⁺] − [OH⁻] = D with Kw; indicators
  experiments/      One folder per experiment: state hook, 3D scene, 2D fallback, page
  components/lab/   Shared lab UI: viewport, controls, Formula Explorer, charts, Presentation Mode
  data/experiments.ts  Catalog (Physics and Chemistry kept separate)
  data/quizzes.ts   Knowledge-check questions per experiment, authored in en/uz/ru side by side
  components/quiz/  QuizPanel (modal quiz) and KnowledgeCheck (card at the end of ExperimentShell)
  lib/quiz.ts       Pure quiz logic: answering, scoring, pass mark (70 %), merging results
  store/quiz.ts     Quiz results store; localStorage by default, pluggable for accounts
  services/analytics.ts  Analytics interface; Phase 1 ships only a demo provider
  services/api.ts   Accounts API client
  store/auth.ts     Session store: user, login(), register(), logout(), isAuthenticated
  store/progress.ts Per-experiment progress for the signed-in user
  lib/progressModel.ts  Progress record shape and update rule (shared with the server)
server/             Accounts API (Node + pg) + tests
  db/               PostgreSQL store, connection config, migration runner, JSON importer
  migrations/       SQL migrations, applied in order by `npm run migrate`
  components/ai/    AI tutor chat panel (client in services/tutor.ts, state in store/tutor.ts)
server/tutor/       Tutor backend: request validation, system prompt, rate limiter, handler + tests
api/tutor.ts        Vercel Function wrapping server/tutor/handler.ts
server/monitoring/  Client error report intake (validation, rate limit, webhook alert) + tests
api/errors.ts, api/health.ts  Vercel Functions for error reports and health
scripts/smoke.mjs   Post-deploy / uptime smoke test; scripts/deploy.sh manual deploy
  services/analytics.ts  Analytics provider: API stats with demo fallback
  services/usageTracker.ts  Local, anonymous visit counter and offline event queue
server/analytics-server.mjs  Reference analytics API (zero dependencies)
  i18n/locales/     en.ts is the source; uz.ts and ru.ts are type-checked against it
  i18n/locales/     en.ts is the source; uz.ts and ru.ts are type-checked and tested against it
```

Design rules followed:

- The UI never computes science itself; it reads from `src/engines`, which are tested against textbook values.
- Simulations advance from equations every frame — no pre-recorded animations.
- Every listed experiment either opens a working page or is clearly marked *Planned* with no start button.
- Demo statistics are always labelled as demo data.

## Adding an experiment

1. Write and test the model in `src/engines/<name>.ts`.
2. Add a folder in `src/experiments/<name>/` with a hook, a scene, a 2D fallback and a page built on `ExperimentShell`.
3. Register it in `src/data/experiments.ts` (set `status: 'available'`) and in `SIMULATIONS` in `src/pages/ExperimentRoute.tsx`.
4. Add `catalog.<id>` and `exp.<id>` strings to all three locale files.
5. Optionally pass `progressSettings` (and `score`) to `ExperimentShell` so completed runs save their parameters.
6. Add a knowledge check for it in `src/data/quizzes.ts` (a test fails if an available experiment has none).

## Knowledge checks

Every experiment page ends with a *Knowledge check* card that opens a short multiple-choice quiz with immediate feedback, an explanation per question and a results screen (pass mark 70 %, rounded up). Once a quiz is passed in the current browser session the card switches to a quiet "Passed" state with a *Retake* button.

Results are stored per experiment as `{ attempts, bestScore, lastScore, total, passed, firstPassedAt, lastAttemptAt }` in `localStorage` (`edulab-quiz-results`).

`src/store/quizWiring.ts` connects them to the rest of the app (logic and tests in `src/store/quizSync.ts`):

- the AI tutor gets the latest score for the experiment as context;
- a passed quiz saves the experiment as completed in the signed-in account with the score as a percentage (the account keeps the best score);
- quizzes passed as a guest are saved to the account after signing in;
- a passed quiz counts as a completed session in the anonymous analytics.

## Offline / installable (PWA)

EduLab is a Progressive Web App. `public/manifest.json` and the icons in `public/icons/` make it installable, and `public/sw.js` keeps it working offline. The worker is only registered in production builds (`npm run build && npm run preview` to try it locally). `vercel.json` and `public/_headers` stop `sw.js` and the manifest from being cached by the CDN.

- **Precache.** After `vite build`, the `edulab-sw` plugin (`sw.plugin.ts`) writes the list of files in `dist/` into `dist/sw.js` (and `dist/precache-manifest.json`), so the first visit downloads the whole app, including every lazily loaded experiment and its 3D scene. OG images, store screenshots, `robots.txt` and `sitemap.xml` are left out. The build also fails if `manifest.json` lacks what browsers need to offer installation.
- **Strategies.** Navigations are network-first (3 s timeout, navigation preload) with the cached `index.html` as the fallback. Anonymous `/api` GETs are network-first with retry and fall back to the last answer; requests with a token are never cached. When the network is down the worker answers `/api` with a `503` + `X-EduLab-Offline`, which the client treats as "offline". Static files are cache-first.
- **Unsaved progress.** A completed run or passed quiz that cannot reach the server is kept in an outbox in `localStorage` (`src/lib/outbox.ts`, `src/store/outbox.ts`) and shown on the account page straight away. It is sent automatically when the app comes back online (`online` event, Background Sync where supported, tab focus, sign-in, start-up, and every minute while anything is waiting). The strip under the header says how many results are waiting and confirms when they are saved.
- **Install and updates.** `src/lib/pwa.ts` captures the browser's install prompt as soon as the app loads. The banner (and the footer's *Install the app* link, which stays after "Not now") opens it; on iPhone/iPad Safari it explains *Share → Add to Home Screen*. When a new version has downloaded, the banner offers *Reload* instead.
5. Run `npm run og:images` to create its social card. The sitemap picks the experiment up automatically once it is `available`.

## Translations

`src/i18n/locales/en.ts` is the source of truth. **Any new experiment or feature must add its strings to `en.ts`, `uz.ts` and `ru.ts` before `npm test` will pass.** `src/i18n/locales/locale-completeness.test.ts` fails when `uz.ts` or `ru.ts`:

- is missing a key that `en.ts` has (nested keys included),
- has a string where `en.ts` has a nested object, or the other way round,
- leaves a string empty that is filled in English,
- uses different `{{placeholders}}` from the English string.

Plural keys follow i18next: Russian needs `_one`, `_few`, `_many` and `_other` for every key that has `_one`/`_other` in English. Keys in `uz.ts`/`ru.ts` that `en.ts` does not have are printed as a warning and do not fail the run.
