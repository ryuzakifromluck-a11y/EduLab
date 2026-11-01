import { ampliconSize, annealingEfficiency, denaturationEfficiency, extensionEfficiency, findTarget, pairTm, type PcrPhase, type PcrSettings } from '../../engines/pcr'

/**
 * What the template looks like during a cycle, shared by the 3D and 2D views:
 * how far apart the two strands are, whether primers sit on them and how much
 * of each new strand has been built (all 0–1). `step` is the progress through
 * the current step; a step that fails in the model (too cool to denature,
 * too hot to anneal, too short to extend) fails visibly here too.
 */
export function strandPose(phase: PcrPhase | 'idle' | 'hold', step: number, s: PcrSettings) {
  const target = findTarget(s.target)
  const denatured = denaturationEfficiency(s.denatureTemp) > 0.5
  const annealed = denatured && annealingEfficiency(s.annealTemp, pairTm(target)) > 0.5
  const extendTo = extensionEfficiency(s.extensionTime, ampliconSize(target))
  const gap = denatured ? 1 : 0.12
  switch (phase) {
    case 'denature':
      return { gap: Math.min(1, step * 2.5) * gap, primers: 0, built: 0 }
    case 'anneal':
      return { gap, primers: annealed ? Math.min(1, step * 2) : 0, built: 0 }
    case 'extend':
      return { gap, primers: annealed ? 1 : 0, built: annealed ? Math.min(step * 1.15, extendTo) : 0 }
    default:
      return { gap: 0, primers: 0, built: 0 }
  }
}
