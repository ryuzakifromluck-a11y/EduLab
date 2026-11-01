import { useSyncExternalStore } from 'react'

/**
 * Progressive Web App plumbing: install prompt, online/offline state, service worker
 * registration and updates, and background-sync requests. Imported from main.tsx
 * before React renders, so a `beforeinstallprompt` that fires early is not lost.
 */

export const INSTALL_DISMISSED_KEY = 'edulab-install-dismissed'
/** After a dismissal the install banner stays hidden for this long. */
export const INSTALL_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000
/** Tag used for Background Sync; the service worker asks open tabs to flush the progress outbox. */
export const SYNC_TAG = 'edulab-progress'

/** Chrome/Edge/Android event fired when the app meets installability criteria. Not in lib.dom. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/** True when the banner may show, given the stored dismissal timestamp (ms since epoch, as a string). */
export function installBannerAllowed(dismissedAt: string | null, now: number): boolean {
  if (!dismissedAt) return true
  const at = Number(dismissedAt)
  if (!Number.isFinite(at)) return true
  return now - at >= INSTALL_SNOOZE_MS
}

export function readInstallDismissed(): string | null {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY)
  } catch {
    return null
  }
}

export function rememberInstallDismissed(now = Date.now()) {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(now))
  } catch {
    /* storage unavailable */
  }
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * iOS and iPadOS never fire `beforeinstallprompt`; installing is "Share → Add to Home Screen"
 * in Safari only (other iOS browsers can't install). iPadOS reports itself as a Mac, so a
 * touch-capable "Macintosh" counts too.
 */
export function isIosSafari(ua: string, maxTouchPoints = 0): boolean {
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)
  if (!ios) return false
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo|GSA\//.test(ua)
  return /Safari\//.test(ua) && !otherBrowser
}

/* ------------------------------------------------------------------ */
/* Tiny external stores (subscribe + snapshot) used with useSyncExternalStore. */

function createStore<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return
      value = next
      for (const l of listeners) l()
    },
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

/* ------------------------------------------------------------------ */
/* Install */

export type InstallMode = 'prompt' | 'ios' | null

const deferredPrompt = createStore<BeforeInstallPromptEvent | null>(null)
const installed = createStore(false)

if (typeof window !== 'undefined') {
  installed.set(isStandalone())
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep the browser's mini-infobar from showing; EduLab shows its own banner and button.
    e.preventDefault()
    deferredPrompt.set(e as BeforeInstallPromptEvent)
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt.set(null)
    installed.set(true)
  })
}

function installMode(): InstallMode {
  if (installed.get()) return null
  if (deferredPrompt.get()) return 'prompt'
  if (typeof navigator !== 'undefined' && isIosSafari(navigator.userAgent, navigator.maxTouchPoints)) return 'ios'
  return null
}

const subscribeInstall = (l: () => void) => {
  const a = deferredPrompt.subscribe(l)
  const b = installed.subscribe(l)
  return () => {
    a()
    b()
  }
}

/** How EduLab can be installed right now: the browser's prompt, iOS instructions, or not at all. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribeInstall, installMode, () => null)
}

/** Shows the browser's install dialog. Resolves to the user's answer, or 'unavailable'. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferredPrompt.get()
  if (!e) return 'unavailable'
  // A prompt event can be used only once.
  deferredPrompt.set(null)
  try {
    await e.prompt()
    const { outcome } = await e.userChoice
    if (outcome === 'accepted') installed.set(true)
    return outcome
  } catch {
    return 'unavailable'
  }
}

/* ------------------------------------------------------------------ */
/* Online / offline */

const online = createStore(typeof navigator === 'undefined' ? true : navigator.onLine)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => online.set(true))
  window.addEventListener('offline', () => online.set(false))
}

export const isOnline = () => online.get()

/** Calls `fn(isOnline)` on every change. Returns an unsubscribe function. */
export function onConnectivityChange(fn: (online: boolean) => void): () => void {
  return online.subscribe(() => fn(online.get()))
}

export function useOnline(): boolean {
  return useSyncExternalStore(online.subscribe, online.get, () => true)
}

/* ------------------------------------------------------------------ */
/* Service worker: registration, updates, background sync */

const updateWaiting = createStore<ServiceWorker | null>(null)
const syncHandlers = new Set<() => void>()

/** True when a new version has been downloaded and is waiting to take over. */
export function useUpdateAvailable(): boolean {
  return useSyncExternalStore(
    updateWaiting.subscribe,
    () => updateWaiting.get() !== null,
    () => false,
  )
}

/** Activates the waiting version; the page reloads once it controls the tab. */
export function applyUpdate() {
  const waiting = updateWaiting.get()
  if (!waiting) return
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  waiting.postMessage('SKIP_WAITING')
}

export function dismissUpdate() {
  updateWaiting.set(null)
}

/** Registers a callback the service worker can trigger (Background Sync) to flush queued data. */
export function onSyncRequest(fn: () => void): () => void {
  syncHandlers.add(fn)
  return () => syncHandlers.delete(fn)
}

interface SyncManager {
  register(tag: string): Promise<void>
}

/**
 * Asks the browser to wake the service worker when connectivity returns (Chrome/Edge/Android).
 * Elsewhere this is a no-op; the `online` event and app start-up cover those browsers.
 */
export async function requestBackgroundSync(tag = SYNC_TAG) {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & { sync?: SyncManager }
    await reg.sync?.register(tag)
  } catch {
    /* unsupported or refused */
  }
}

function watchForUpdates(reg: ServiceWorkerRegistration) {
  // Only an update matters: the very first install has no previous version to replace.
  const offer = (sw: ServiceWorker | null) => {
    if (sw && navigator.serviceWorker.controller) updateWaiting.set(sw)
  }
  offer(reg.waiting)
  reg.addEventListener('updatefound', () => {
    const sw = reg.installing
    sw?.addEventListener('statechange', () => sw.state === 'installed' && offer(sw))
  })
  // Long-lived tabs (and installed apps, which are rarely reloaded) check hourly.
  window.setInterval(() => void reg.update().catch(() => {}), 60 * 60 * 1000)
}

/** Registers /sw.js in production builds. The dev server never gets a worker, so HMR is unaffected. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC' && event.data.tag === SYNC_TAG) for (const fn of syncHandlers) fn()
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(watchForUpdates)
      .catch((err) => console.warn('Service worker registration failed', err))
  })
}
