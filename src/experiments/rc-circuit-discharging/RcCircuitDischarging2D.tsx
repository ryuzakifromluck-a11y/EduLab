import type { RcLive } from '../rc-circuit-charging/RcBoard'
import { RcSchematic } from '../rc-circuit-charging/RcSchematic'

/** Two-way switch circuit diagram with a live capacitor-voltage bar. */
export function RcCircuitDischarging2D({ live, label, texts }: { live: () => RcLive; label: string; texts: { R: string; C: string; V: string } }) {
  return <RcSchematic variant="discharging" live={live} label={label} texts={texts} />
}
