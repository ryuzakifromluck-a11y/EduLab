import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CLEAR_UG, type DnaExtractionSimulation } from '../../engines/dnaExtraction'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'
import { FILTRATE_COLOR, SAMPLE_COLOR } from './useDnaExtraction'

const TUBE_R = 0.24
const TUBE_H = 1.7
const TUBE_Y = 0.12
/** Filtrate and ethanol column heights inside the tube. */
const FILTRATE_H = 0.62
const ETHANOL_H = 0.5

/** Deterministic pseudo-random numbers so the strands look the same on every render. */
function strands(n: number) {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: n }, () => ({
    x: (rnd() - 0.5) * TUBE_R * 1.2,
    z: (rnd() - 0.5) * TUBE_R * 1.2,
    y: rnd() * 0.32,
    len: 0.12 + rnd() * 0.22,
    rx: (rnd() - 0.5) * 1.6,
    rz: (rnd() - 0.5) * 1.6,
  }))
}

/** Mortar and pestle, funnel with filter paper, test tube with cold ethanol, and the white DNA precipitate. */
export function DnaExtractionScene({ sim, glass, labels }: { sim: DnaExtractionSimulation; glass: string; labels: { tube: string; ethanol: string } }) {
  const pestle = useRef<THREE.Group>(null)
  const pieces = useRef<THREE.Group>(null)
  const mash = useRef<THREE.Mesh>(null)
  const funnel = useRef<THREE.Group>(null)
  const drip = useRef<THREE.Mesh>(null)
  const filtrate = useRef<THREE.Mesh>(null)
  const ethanol = useRef<THREE.Mesh>(null)
  const dna = useRef<THREE.Group>(null)
  const rod = useRef<THREE.Group>(null)
  const bubbles = useRef<THREE.Group>(null)
  const wisps = useMemo(() => strands(26), [])
  const source = sim.settings.source

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const st = sim.stage
    const p = sim.progress
    const after = (s: string[]) => s.includes(st)
    // Mortar: whole pieces become a mash while grinding.
    const ground = st === 'sample' ? 0 : st === 'mashing' ? p : 1
    if (pieces.current) {
      pieces.current.visible = ground < 0.98 && !after(['lysing', 'lysed', 'filtering', 'filtered', 'precipitating', 'precipitated', 'spooled'])
      pieces.current.scale.setScalar(1 - 0.85 * ground)
    }
    if (mash.current) {
      mash.current.visible = ground > 0.02 && !after(['filtering', 'filtered', 'precipitating', 'precipitated', 'spooled'])
      mash.current.scale.y = Math.max(0.05, ground)
    }
    if (pestle.current) {
      const grinding = st === 'mashing'
      pestle.current.rotation.z = grinding ? 0.35 + Math.sin(t * 9) * 0.25 : 0.35
      pestle.current.rotation.y = grinding ? t * 4 : 0
    }
    // Detergent bubbles while the cells are lysing.
    if (bubbles.current) {
      bubbles.current.visible = st === 'lysing' || st === 'lysed'
      bubbles.current.children.forEach((b, i) => (b.position.y = 0.32 + ((t * 0.15 + i * 0.07) % 0.12)))
    }
    // Filtering: the liquid drips through the funnel into the tube.
    const filled = after(['filtered', 'precipitating', 'precipitated', 'spooled']) ? 1 : st === 'filtering' ? p : 0
    if (funnel.current) funnel.current.visible = st === 'filtering' || st === 'lysed'
    if (drip.current) {
      drip.current.visible = st === 'filtering'
      drip.current.scale.y = 0.6 + 0.4 * Math.sin(t * 20)
    }
    if (filtrate.current) {
      const h = Math.max(0.001, FILTRATE_H * filled)
      filtrate.current.visible = filled > 0.01
      filtrate.current.scale.y = h
      filtrate.current.position.y = TUBE_Y + h / 2
    }
    if (ethanol.current) {
      ethanol.current.visible = after(['precipitating', 'precipitated', 'spooled'])
      const e = st === 'precipitating' ? Math.min(1, sim.elapsed / 3) : 1
      const h = Math.max(0.001, ETHANOL_H * e)
      ethanol.current.scale.y = h
      ethanol.current.position.y = TUBE_Y + FILTRATE_H + h / 2
    }
    // White strands rise into the ethanol layer as DNA comes out of solution.
    const amount = Math.min(1.2, sim.precipitated / CLEAR_UG)
    if (dna.current) {
      dna.current.visible = amount > 0.04 && st !== 'spooled'
      dna.current.children.forEach((c, i) => {
        const share = (i + 1) / dna.current!.children.length
        c.visible = share <= amount + 0.08
        c.scale.setScalar(Math.min(1, amount * 1.4))
      })
    }
    if (rod.current) {
      const spooled = st === 'spooled'
      rod.current.visible = spooled
      rod.current.position.y = TUBE_Y + TUBE_H + 0.35
      rod.current.rotation.y = spooled ? t * 1.5 : 0
      rod.current.children[1].visible = spooled && sim.precipitated > 0.5
      rod.current.children[1].scale.setScalar(0.4 + 0.6 * Math.min(1, amount))
    }
  })

  return (
    <>
      <LabLights />
      <Bench width={5} depth={3} />
      {/* Mortar and pestle */}
      <group position={[-1.7, 0, 0.1]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.55, 0.4, 0.5, 40, 1, true]} />
          <meshStandardMaterial color="#e8e4dc" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.4, 0.42, 0.06, 40]} />
          <meshStandardMaterial color="#e8e4dc" roughness={0.8} />
        </mesh>
        <group ref={pieces} position={[0, 0.16, 0]}>
          {[
            [-0.15, 0, 0.05],
            [0.14, 0.02, -0.08],
            [0.02, 0.06, 0.15],
          ].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]}>
              <sphereGeometry args={[0.12, 20, 16]} />
              <meshStandardMaterial color={SAMPLE_COLOR[source]} roughness={0.5} />
            </mesh>
          ))}
        </group>
        <mesh ref={mash} position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.46, 0.4, 0.22, 32]} />
          <meshStandardMaterial color={SAMPLE_COLOR[source]} roughness={0.9} />
        </mesh>
        <group ref={bubbles}>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} position={[Math.cos(i * 0.8) * 0.3, 0.32, Math.sin(i * 0.8) * 0.3]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
        <group ref={pestle} position={[0, 0.2, 0]}>
          <mesh position={[0.2, 0.45, 0]}>
            <cylinderGeometry args={[0.06, 0.1, 0.9, 16]} />
            <meshStandardMaterial color="#d8d2c6" roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* Test tube in a rack */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, TUBE_Y + TUBE_H / 2, 0]}>
          <cylinderGeometry args={[TUBE_R, TUBE_R, TUBE_H, 32, 1, true]} />
          <meshStandardMaterial color={glass} transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} roughness={0.08} />
        </mesh>
        <mesh position={[0, TUBE_Y, 0]}>
          <sphereGeometry args={[TUBE_R, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color={glass} transparent opacity={0.25} depthWrite={false} />
        </mesh>
        <mesh ref={filtrate} renderOrder={1}>
          <cylinderGeometry args={[TUBE_R - 0.015, TUBE_R - 0.015, 1, 32]} />
          <meshStandardMaterial color={FILTRATE_COLOR[source]} transparent opacity={0.85} depthWrite={false} />
        </mesh>
        <mesh ref={ethanol} renderOrder={1}>
          <cylinderGeometry args={[TUBE_R - 0.015, TUBE_R - 0.015, 1, 32]} />
          <meshStandardMaterial color="#e9f3ff" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <group ref={dna} position={[0, TUBE_Y + FILTRATE_H + 0.02, 0]}>
          {wisps.map((w, i) => (
            <mesh key={i} position={[w.x, w.y, w.z]} rotation={[w.rx, 0, w.rz]} renderOrder={2}>
              <cylinderGeometry args={[0.012, 0.018, w.len, 6]} />
              <meshStandardMaterial color="#fbfbf7" emissive="#ffffff" emissiveIntensity={0.15} roughness={0.9} />
            </mesh>
          ))}
        </group>
        {/* Rack */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.9, 0.06, 0.6]} />
          <meshStandardMaterial color="#5b6b86" />
        </mesh>
        {/* Funnel and filter paper */}
        <group ref={funnel} position={[0, TUBE_Y + TUBE_H + 0.32, 0]}>
          <mesh>
            <coneGeometry args={[0.45, 0.55, 32, 1, true]} />
            <meshStandardMaterial color={glass} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.03, 0]} rotation-x={Math.PI}>
            <coneGeometry args={[0.4, 0.5, 4, 1, true]} />
            <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} roughness={1} />
          </mesh>
          <mesh ref={drip} position={[0, -0.6, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.7, 8]} />
            <meshStandardMaterial color={FILTRATE_COLOR[source]} />
          </mesh>
        </group>
        {/* Glass rod for spooling */}
        <group ref={rod}>
          <mesh>
            <cylinderGeometry args={[0.025, 0.025, 1.6, 12]} />
            <meshStandardMaterial color={glass} transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, -0.7, 0]}>
            <torusKnotGeometry args={[0.07, 0.03, 48, 6]} />
            <meshStandardMaterial color="#fbfbf7" roughness={0.9} />
          </mesh>
        </group>
      </group>
      <Label3D lines={[labels.tube]} position={[0.75, 1.7, 0]} height={0.26} />

      {/* Ice-cold ethanol */}
      <group position={[1.7, 0, -0.1]}>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.9, 32]} />
          <meshStandardMaterial color="#cfe5ff" transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.2, 16]} />
          <meshStandardMaterial color="#2f6fd6" />
        </mesh>
        <Label3D lines={[labels.ethanol]} position={[0, 1.45, 0]} height={0.22} font="600 34px Inter Variable, sans-serif" />
      </group>
    </>
  )
}
