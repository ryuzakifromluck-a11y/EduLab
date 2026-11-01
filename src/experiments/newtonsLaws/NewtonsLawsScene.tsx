import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { G, appliedForce, frictionForce, type CartSimulation } from '../../engines/newtonsLaws'
import { Label3D } from '../../components/lab/Label3D'
import { Arrow, Bench, LabLights, setArrowLength } from '../shared/three'
import { TRACK } from './useNewtonsLaws'

/** World units per metre of track. */
const K = 0.5
const X0 = -(TRACK * K) / 2
const FORCE_SCALE = 1.4 / 40
const CART_W = 0.7

export function NewtonsLawsScene({ sim, labels }: { sim: CartSimulation; labels: { applied: string; friction: string; weight: string; normal: string } }) {
  const cart = useRef<THREE.Group>(null)
  const push = useRef<THREE.Group>(null)
  const fric = useRef<THREE.Group>(null)
  const weight = useRef<THREE.Group>(null)
  const normal = useRef<THREE.Group>(null)
  const wheels = useRef<THREE.Group>(null)

  useFrame(() => {
    const p = sim.params
    const x = X0 + sim.x * K
    cart.current?.position.set(x + CART_W / 2, 0, 0)
    const F = appliedForce(p)
    const f = frictionForce(p, sim.v)
    setArrowLength(push.current, F * FORCE_SCALE)
    setArrowLength(fric.current, f * FORCE_SCALE)
    const mg = p.mass * (p.gravity ?? G)
    setArrowLength(weight.current, mg * FORCE_SCALE * 0.5)
    setArrowLength(normal.current, mg * FORCE_SCALE * 0.5)
    if (wheels.current) wheels.current.children.forEach((w) => (w.rotation.z = -sim.x / 0.08))
    // Bigger loads look bigger.
    const load = cart.current?.getObjectByName('load')
    if (load) load.scale.y = 0.2 + (p.mass / 10) * 1.6
  })

  const ticks = Array.from({ length: TRACK / 2 + 1 }, (_, i) => i * 2)

  return (
    <>
      <LabLights />
      <Bench width={TRACK * K + 2} depth={2.2} />
      {/* Track */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[TRACK * K + 0.4, 0.04, 0.6]} />
        <meshStandardMaterial color="#9aa4b8" metalness={0.5} roughness={0.4} />
      </mesh>
      {[-0.2, 0.2].map((z) => (
        <mesh key={z} position={[0, 0.06, z]}>
          <boxGeometry args={[TRACK * K + 0.4, 0.04, 0.04]} />
          <meshStandardMaterial color="#5a6478" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Buffer at the far end */}
      <mesh position={[-X0 + 0.25, 0.2, 0]}>
        <boxGeometry args={[0.12, 0.36, 0.7]} />
        <meshStandardMaterial color="#e5484d" />
      </mesh>
      {ticks.map((m) => (
        <group key={m} position={[X0 + m * K, 0, 0.45]}>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.015, 0.02, 0.12]} />
            <meshStandardMaterial color="#e8ecf3" />
          </mesh>
          <Label3D lines={[`${m} m`]} position={[0, 0.16, 0.12]} height={0.18} color="#e8ecf3" background={null} font="600 40px Inter Variable, sans-serif" />
        </group>
      ))}

      <group ref={cart}>
        <mesh position={[0, 0.24, 0]} castShadow>
          <boxGeometry args={[CART_W, 0.18, 0.46]} />
          <meshStandardMaterial color="#3b5bdb" roughness={0.45} />
        </mesh>
        <mesh name="load" position={[0, 0.33, 0]} scale={[1, 0.5, 1]} castShadow>
          <boxGeometry args={[0.36, 0.2, 0.3]} />
          <meshStandardMaterial color="#8a93a8" metalness={0.6} roughness={0.35} />
        </mesh>
        <group ref={wheels}>
          {[
            [-0.22, 0.24],
            [0.22, 0.24],
            [-0.22, -0.24],
            [0.22, -0.24],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.11, z]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.08, 0.08, 0.05, 20]} />
              <meshStandardMaterial color="#1f2533" />
            </mesh>
          ))}
        </group>
        {/* Applied force pushes from behind, friction acts at the wheels. */}
        <Arrow ref={push} color="#2fbf71" position={[-CART_W / 2 - 1.5, 0.26, 0]} rotation-z={-Math.PI / 2} />
        <Arrow ref={fric} color="#e5484d" position={[0, 0.04, 0.34]} rotation-z={Math.PI / 2} />
        <Arrow ref={weight} color="#f0a85c" position={[0, 0.24, -0.3]} rotation-z={Math.PI} />
        <Arrow ref={normal} color="#7b93ff" position={[0, 0.24, -0.3]} />
        <Label3D lines={[labels.applied]} position={[-CART_W / 2 - 0.9, 0.55, 0]} height={0.22} color="#2fbf71" background="rgba(0,0,0,0.5)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
        <Label3D lines={[labels.friction]} position={[0, -0.14, 0.62]} height={0.22} color="#ff8c8f" background="rgba(0,0,0,0.5)" border="rgba(0,0,0,0)" font="600 34px Inter Variable, sans-serif" />
      </group>
      {/* Keep the arrow geometry stable: the applied-force arrow is drawn ending at the cart. */}
      <PushArrowAnchor push={push} />
    </>
  )
}

/** Shifts the push arrow so that its tip, not its tail, touches the back of the cart. */
function PushArrowAnchor({ push }: { push: RefObject<THREE.Group | null> }) {
  useFrame(() => {
    const g = push.current
    if (!g) return
    const head = g.getObjectByName('head')
    const len = head ? head.position.y + 0.08 : 0
    g.position.x = -CART_W / 2 - len - 0.02
  })
  return null
}
