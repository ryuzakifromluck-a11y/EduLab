import type { RemoteReading } from './remoteCode'

interface ReadingLike {
  label: unknown
  value: string
  unit?: string
}

/** Readings whose label is plain text (labels with markup are skipped), capped for the wire. */
export function toRemoteReadings(items: readonly ReadingLike[] | undefined, max = 8): RemoteReading[] {
  if (!items) return []
  return items
    .flatMap((m) => (typeof m.label === 'string' && m.label ? [{ label: m.label, value: m.value, ...(m.unit ? { unit: m.unit } : {}) }] : []))
    .slice(0, max)
}
