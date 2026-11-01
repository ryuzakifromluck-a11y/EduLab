import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PendulumSimulation, degToRad } from '../../engines/pendulum'
import { useUi } from '../../store/ui'

/** Decorative hero scene: a real pendulum integration, a water molecule and a few drifting particles. */
function Scene({ animate }: { animate: boolean }) {
  const dark = useUi((s) => s.theme) === 'dark'
  const sim = useMemo(() => new PendulumSimulation({ length: 1.6, gravity: 9.81 }, degToRad(32)), [])
  const arm = useRef<THREE.Group>(null)
  const molecule = useRef<THREE.Group>(null)
  const particles = useRef<THREE.Points>(null)
  const particleGeom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = 70
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 7
      arr[i * 3 + 1] = (Math.random() - 0.3) * 4
      arr[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1
    }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [])

  useFrame((_, dt) => {
    if (!animate) return
    sim.advance(Math.min(dt, 0.05))
    if (arm.current) arm.current.rotation.z = sim.state.theta
    if (molecule.current) {
      molecule.current.rotation.y += dt * 0.35
      molecule.current.rotation.x = Math.sin(performance.now() / 3000) * 0.25
    }
    if (particles.current) particles.current.rotation.y += dt * 0.02
  })

  const physics = dark ? '#7b93ff' : '#3b5bdb'
  const chem = dark ? '#2ccfb5' : '#0e9f8a'

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <points ref={particles} geometry={particleGeom}>
        <pointsMaterial size={0.035} color={dark ? '#a9b8ff' : '#8a9bd6'} transparent opacity={0.6} />
      </points>

      {/* Pendulum */}
      <group position={[-1.1, 1.35, 0]}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.025, 0.025, 1.0, 12]} />
          <meshStandardMaterial color="#9aa3b8" metalness={0.7} roughness={0.3} />
        </mesh>
        <group ref={arm} rotation-z={sim.state.theta}>
          <mesh position={[0, -0.8, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 1.6, 6]} />
            <meshStandardMaterial color={dark ? '#c8cfdd' : '#5b6478'} />
          </mesh>
          <mesh position={[0, -1.6, 0]}>
            <sphereGeometry args={[0.16, 32, 32]} />
            <meshStandardMaterial color={physics} metalness={0.5} roughness={0.25} />
          </mesh>
        </group>
      </group>

      {/* H2O molecule (104.5° bond angle) */}
      <group ref={molecule} position={[1.1, 0.0, 0]}>
        <mesh>
          <sphereGeometry args={[0.32, 32, 32]} />
          <meshStandardMaterial color={chem} roughness={0.3} />
        </mesh>
        {[-1, 1].map((s) => {
          const a = (s * degToRad(104.5)) / 2
          const dir = new THREE.Vector3(Math.sin(a), -Math.cos(a), 0)
          return (
            <group key={s}>
              <mesh position={dir.clone().multiplyScalar(0.62)}>
                <sphereGeometry args={[0.19, 24, 24]} />
                <meshStandardMaterial color={dark ? '#e8ecf5' : '#ffffff'} roughness={0.35} />
              </mesh>
              <mesh position={dir.clone().multiplyScalar(0.32)} rotation-z={a}>
                <cylinderGeometry args={[0.05, 0.05, 0.4, 12]} />
                <meshStandardMaterial color="#9aa3b8" />
              </mesh>
            </group>
          )
        })}
      </group>
    </>
  )
}

export default function HeroScene({ animate }: { animate: boolean }) {
  return (
    // With reduced motion the scene is a still image: render on demand instead of every frame.
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.2, 5.2], fov: 40 }}
      gl={{ alpha: true, antialias: true }}
      frameloop={animate ? 'always' : 'demand'}
      aria-hidden
    >
      <Scene animate={animate} />
    </Canvas>
  )
}
