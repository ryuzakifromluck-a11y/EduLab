import { LANES, type GelSimulation } from '../../engines/gelElectrophoresis'
import { GelImage } from './GelImage'

/** Top view of the gel; bands show under UV, the blue dye front always. */
export function GelElectrophoresis2D({ sim, uv, selected, laneLabels, label }: { sim: GelSimulation; uv: boolean; selected: number; laneLabels: string[]; label: string }) {
  const lanes = LANES.map((id, i) => ({
    label: laneLabels[i],
    bands: sim.bands(id).map((b) => ({ key: b.bp, distance: b.distance, intensity: id === 'ladder' ? 0.6 : 0.9 })),
  }))
  return <GelImage lanes={lanes} uv={uv} dye={sim.dye} bandWidth={sim.width} highlight={selected + 1} label={label} className="h-full max-h-[460px] w-full" />
}
