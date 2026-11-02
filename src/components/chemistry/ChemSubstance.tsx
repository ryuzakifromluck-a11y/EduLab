import type { ThreeElements } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { getSubstanceTexture } from '../../lib/chemistry/substanceCatalog'

/** A reagent block (labelled sample) as a camera-facing sprite. */
export function ChemSubstance({ substance: id, size = 0.3, ...props }: { substance: string; size?: number } & Omit<ThreeElements['sprite'], 'ref' | 'scale' | 'id'>) {
  const map = useMemo(() => getSubstanceTexture(id), [id])
  useEffect(() => () => map.dispose(), [map])
  return (
    <sprite scale={[size, size, 1]} {...props}>
      <spriteMaterial map={map} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  )
}
