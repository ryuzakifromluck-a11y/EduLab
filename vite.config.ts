import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tutorDevApi } from './server/tutor/vitePlugin.ts'
import { serviceWorker } from './sw.plugin.ts'
import { seo } from './seo.plugin.ts'
import { securityHeaders } from './security.plugin.ts'

// Release id baked into the client for error reports: CI passes VITE_RELEASE; Vercel's own builds expose the commit.
const release = (process.env.VITE_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'dev').slice(0, 12)

export default defineConfig({
  define: {
    'import.meta.env.VITE_RELEASE': JSON.stringify(release),
  },
  // tutorDevApi() serves POST /api/tutor inside the dev server.
  plugins: [react(), tailwindcss(), tutorDevApi(), securityHeaders(), seo(), serviceWorker()],
  server: {
    // `npm run api` starts the accounts API (8787) and the analytics API (8788);
    // the dev server forwards /api to them. /api/tutor is served by tutorDevApi().
    proxy: {
      '/api/analytics': 'http://localhost:8788',
      '^/api/(?!tutor|analytics)': 'http://localhost:8787',
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
})
