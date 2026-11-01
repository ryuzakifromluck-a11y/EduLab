import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'
import { FLASK, flaskRadius } from '../titration/flaskGeometry'
import type { AspirinController } from './useSynthesisOfAspirin'

const STEAM = 24
const CRYSTALS = 160

function flaskProfile(height: number, inset = 0): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)]
  for (let i = 0; i <= 24; i++) {
    const y = (height * i) / 24
    pts.push(new THREE.Vector2(Math.max(0.001, flaskRadius(y) - inset), y))
  }
  pts.push(new THREE.Vector2(0, height))
  return pts
}

/**
 * Left: Erlenmeyer flask in a water bath on a hot plate (steam while heating).
 * Middle: Büchner funnel where the aspirin crystals collect after isolation.
 * Right: FeCl₃ test tube and the melting-point apparatus read-out.
 */
export function SynthesisOfAspirinScene({ ctl, glass, labels }: { ctl: AspirinController; glass: string; labels: { flask: string; filter: string; fecl3: string; mp: string; plate: string } }) {
  const shell = useMemo(() => {
    const pts = flaskProfile(FLASK.coneHeight)
    pts.pop()
    pts.push(new THREE.Vector2(FLASK.neckRadius, FLASK.coneHeight + FLASK.neckHeight))
    return new THREE.LatheGeometry(pts, 40)
  }, [])
  const liquid = useMemo(() => new THREE.LatheGeometry(flaskProfile(0.32, 0.015), 40), [])
  const plateTop = useRef<THREE.MeshStandardMaterial>(null)
  const liquidMat = useRef<THREE.MeshStandardMaterial>(null)
  const steam = useRef<THREE.InstancedMesh>(null)
  const crystals = useRef<THREE.InstancedMesh>(null)
  const d = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(() => {
    let s = 7
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    return Array.from({ length: Math.max(STEAM, CRYSTALS) }, () => ({ a: r() * Math.PI * 2, r: Math.sqrt(r()), p: r(), h: r() }))
  }, [])
  const hot = new THREE.Color('#ff5a2a')
  const cold = new THREE.Color('#3a4256')
  const clear = new THREE.Color('#e9eef5')
  const cloudy = new THREE.Color('#f7f3e6')

  useFrame((state) => {
    const heating = ctl.running
    if (plateTop.current) plateTop.current.color.lerp(heating ? hot : cold, 0.05)
    if (liquidMat.current) liquidMat.current.color.lerp(ctl.phase === 'isolated' ? clear : clear.clone().lerp(cloudy, ctl.conversion), 0.1)
    const t = state.clock.elapsedTime
    if (steam.current) {
      for (let i = 0; i < STEAM; i++) {
        const s = seeds[i]
        const k = (t * 0.35 + s.p) % 1
        d.position.set(-1.6 + Math.cos(s.a) * 0.55 * s.r, 0.75 + k * 1.2, Math.sin(s.a) * 0.55 * s.r)
        d.scale.setScalar(heating ? 0.06 + k * 0.1 : 0.0001)
        d.updateMatrix()
        steam.current.setMatrixAt(i, d.matrix)
      }
      steam.current.instanceMatrix.needsUpdate = true
    }
    if (crystals.current) {
      const n = ctl.result ? Math.min(CRYSTALS, Math.round((ctl.result.productMass / 3) * CRYSTALS)) : 0
      for (let i = 0; i < CRYSTALS; i++) {
        const s = seeds[i]
        d.position.set(Math.cos(s.a) * 0.36 * s.r, 1.3 + s.h * 0.05, Math.sin(s.a) * 0.36 * s.r)
        d.rotation.set(s.a, s.p * 3, s.h * 2)
        d.scale.setScalar(i < n ? 1 : 0.0001)
        d.updateMatrix()
        crystals.current.setMatrixAt(i, d.matrix)
      }
      crystals.current.instanceMatrix.needsUpdate = true
    }
  })

  const r = ctl.result
  const mpText = r ? `${r.meltingRange[0].toFixed(0)}–${r.meltingRange[1].toFixed(0)} °C` : '— °C'

  return (
    <>
      <LabLights />
      <Bench width={6} depth={2.8} />
      {/* Hot plate */}
      <mesh position={[-1.6, 0.1, 0]}>
        <boxGeometry args={[1.3, 0.2, 1.1]} />
        <meshStandardMaterial color="#d6dae2" roughness={0.5} />
      </mesh>
      <mesh position={[-1.6, 0.205, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.012, 40]} />
        <meshStandardMaterial ref={plateTop} color="#3a4256" />
      </mesh>
      {/* Water bath */}
      <mesh position={[-1.6, 0.55, 0]}>
        <cylinderGeometry args={[0.62, 0.6, 0.7, 40, 1, true]} />
        <meshStandardMaterial color={glass} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[-1.6, 0.45, 0]}>
        <cylinderGeometry args={[0.6, 0.59, 0.48, 40]} />
        <meshStandardMaterial color="#8ec5ff" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      {/* Flask in the bath */}
      <group position={[-1.6, 0.23, 0]} scale={0.62}>
        <mesh geometry={shell}>
          <meshStandardMaterial color={glass} transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh geometry={liquid} renderOrder={1}>
          <meshStandardMaterial ref={liquidMat} color="#e9eef5" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      </group>
      {/* Thermometer */}
      <mesh position={[-1.25, 0.95, 0.2]} rotation-z={0.15}>
        <cylinderGeometry args={[0.025, 0.025, 1.2, 12]} />
        <meshStandardMaterial color="#f2f4f8" transparent opacity={0.8} />
      </mesh>
      <instancedMesh ref={steam} args={[undefined, undefined, STEAM]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.25} depthWrite={false} />
      </instancedMesh>
      <Label3D lines={[labels.plate, `${ctl.params.tempC} °C`]} position={[-1.6, 1.95, 0]} height={0.32} />

      {/* Büchner funnel on a filter flask */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.18, 0.42, 0.9, 32, 1, true]} />
          <meshStandardMaterial color={glass} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 12]} />
          <meshStandardMaterial color="#e7e2d6" />
        </mesh>
        <mesh position={[0, 1.3, 0]}>
          <cylinderGeometry args={[0.45, 0.38, 0.32, 40, 1, true]} />
          <meshStandardMaterial color="#f4f1ea" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.02, 40]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </mesh>
        <instancedMesh ref={crystals} args={[undefined, undefined, CRYSTALS]} frustumCulled={false}>
          <boxGeometry args={[0.05, 0.02, 0.03]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} emissive="#ffffff" emissiveIntensity={0.15} />
        </instancedMesh>
        <Label3D lines={[labels.filter, r ? `${r.productMass.toFixed(2)} g` : '— g']} position={[0, 1.95, 0]} height={0.32} />
      </group>

      {/* FeCl₃ test tube */}
      <group position={[1.35, 0, 0.1]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.5, 0.06, 0.3]} />
          <meshStandardMaterial color="#8b6b4a" />
        </mesh>
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.9, 20, 1, true]} />
          <meshStandardMaterial color={glass} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.45, 20]} />
          <meshStandardMaterial color={r ? r.fecl3Color : '#f1d78a'} transparent opacity={r ? 0.9 : 0.35} />
        </mesh>
        <Label3D lines={[labels.fecl3]} position={[0, 1.45, 0]} height={0.2} color="#ffffff" background="rgba(0,0,0,0.6)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
      </group>

      {/* Melting-point apparatus */}
      <group position={[2.25, 0, -0.1]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.7, 0.6, 0.6]} />
          <meshStandardMaterial color="#e3e6ec" roughness={0.6} />
        </mesh>
        <Label3D lines={[labels.mp, mpText]} position={[0, 0.95, 0.05]} height={0.32} />
      </group>
    </>
  )
}
