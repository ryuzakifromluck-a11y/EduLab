/**
 * Screen-reader announcements. `announce()` can be called from anywhere (hooks,
 * event handlers, non-React code such as a quiz engine); <LiveAnnouncer /> in the
 * app layout renders the aria-live regions that speak the messages.
 */

export type Politeness = 'polite' | 'assertive'

type Listener = (message: string, politeness: Politeness) => void

const listeners = new Set<Listener>()

export function announce(message: string, politeness: Politeness = 'polite') {
  if (!message) return
  for (const l of listeners) l(message, politeness)
}

export function subscribeAnnouncements(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
