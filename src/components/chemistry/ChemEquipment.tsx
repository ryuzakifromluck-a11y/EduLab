import type { ThreeElements } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { EQUIPMENT, equipmentSheet, type EquipmentId } from '../../lib/chemistry/equipmentCatalog'
import { findFrame, frameTexture } from '../../lib/chemistry/spriteLoader'

/** A piece of lab equipment as a camera-facing sprite. `height` overrides the catalog scale. */
export function ChemEquipment({ item: id, height, opacity = 1, ...props }: { item: EquipmentId; height?: number; opacity?: number } & Omit<ThreeElements['sprite'], 'ref' | 'scale' | 'id'>) {
  const eq = EQUIPMENT[id]
  const { map, aspect } = useMemo(() => {
    const sheet = equipmentSheet()
    const f = findFrame(sheet, id)
    return { map: frameTexture(sheet, f), aspect: f.w / f.h }
  }, [id])
  useEffect(() => () => map.dispose(), [map])
  const h = height ?? eq.scale
  return (
    <sprite scale={[h * aspect, h, 1]} {...props}>
      <spriteMaterial map={map} transparent depthWrite={false} opacity={opacity} toneMapped={false} />
    </sprite>
  )
}
