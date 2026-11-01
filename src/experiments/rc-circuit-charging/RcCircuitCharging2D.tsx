import type { RcLive } from './RcBoard'
import { RcSchematic } from './RcSchematic'

/** Circuit diagram with a live capacitor-voltage bar. */
export function RcCircuitCharging2D({ live, label, texts }: { live: () => RcLive; label: string; texts: { R: string; C: string; V: string } }) {
  return <RcSchematic variant="charging" live={live} label={label} texts={texts} />
}
