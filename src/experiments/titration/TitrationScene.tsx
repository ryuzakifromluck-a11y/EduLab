import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BURETTE_CAPACITY, type TitrationController } from './useTitration'
import { FLASK, flaskRadius, liquidHeight } from './flaskGeometry'
import { Label3D } from '../../components/lab/Label3D'

const BURETTE_X = 0
const GRAD_TOP = 4.1 // y of the 0 mL mark
const GRAD_BOTTOM = 2.3 // y of the 50 mL mark
const TUBE_R = 0.075
const TIP_Y = 1.7
const FLASK_Y = 0.06
const FALL_TIME = 0.32 // s for a drop to fall into the flask

function flaskProfile(height: number, inset = 0): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)]
  const n = 32
  for (let i = 0; i <= n; i++) {
    const y = (height * i) / n
    pts.push(new THREE.Vector2(Math.max(0.001, flaskRadius(y) - inset), y))
  }
  pts.push(new THREE.Vector2(0, height))
  return pts
}

export function TitrationScene({ ctl, glass }: { ctl: TitrationController; glass: string }) {
  const liquid = useRef<THREE.Mesh>(null)
  const liquidMat = useRef<THREE.MeshStandardMaterial>(null)
  const buretteLiquid = useRef<THREE.Mesh>(null)
  const handle = useRef<THREE.Mesh>(null)
  const dropMesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const shellGeom = useMemo(() => {
    const pts = flaskProfile(FLASK.coneHeight)
    pts.pop()
    pts.push(new THREE.Vector2(FLASK.neckRadius, FLASK.coneHeight + FLASK.neckHeight))
    return new THREE.LatheGeometry(pts, 48)
  }, [])

  // Rebuild the liquid geometry only when the height changes noticeably.
  const lastH = useRef(-1)
  const color = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const vol = ctl.params.acidVolume + ctl.addedRef.current
    const h = liquidHeight(vol)
    if (liquid.current && Math.abs(h - lastH.current) > 0.002) {
      liquid.current.geometry.dispose()
      liquid.current.geometry = new THREE.LatheGeometry(flaskProfile(h, 0.015), 48)
      lastH.current = h
    }
    if (liquidMat.current) {
      const c = ctl.color
      color.setRGB(c.r / 255, c.g / 255, c.b / 255, THREE.SRGBColorSpace)
      liquidMat.current.color.lerp(color, 0.25)
      liquidMat.current.opacity += (Math.max(0.35, c.a) - liquidMat.current.opacity) * 0.25
    }
    if (buretteLiquid.current) {
      const remaining = (BURETTE_CAPACITY - ctl.addedRef.current) / BURETTE_CAPACITY
      const top = GRAD_BOTTOM + (GRAD_TOP - GRAD_BOTTOM) * remaining
      const len = top - (TIP_Y + 0.25)
      buretteLiquid.current.scale.y = Math.max(0.001, len)
      buretteLiquid.current.position.y = TIP_Y + 0.25 + len / 2
    }
    if (handle.current) {
      const target = ctl.dripping ? Math.PI / 2 : 0
      handle.current.rotation.x += (target - handle.current.rotation.x) * 0.2
    }
    if (dropMesh.current) {
      const now = performance.now()
      const surface = FLASK_Y + liquidHeight(vol)
      const drops = ctl.drops.current
      for (let i = 0; i < 40; i++) {
        const d = drops[i]
        const age = d ? (now - d.t) / 1000 : Infinity
        if (age < FALL_TIME) {
          const k = age / FALL_TIME
          dummy.position.set(BURETTE_X, TIP_Y - (TIP_Y - surface) * k * k, 0)
          dummy.scale.setScalar(1)
        } else {
          dummy.scale.setScalar(0.0001)
        }
        dummy.updateMatrix()
        dropMesh.current.setMatrixAt(i, dummy.matrix)
      }
      dropMesh.current.instanceMatrix.needsUpdate = true
    }
  })

  const ticks = [0, 10, 20, 30, 40, 50]

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 6, 5]} intensity={1.4} castShadow />
      <directionalLight position={[-3, 3, -4]} intensity={0.4} />

      {/* Stand */}
      <mesh position={[-0.4, 0.02, 0]} receiveShadow>
        <boxGeometry args={[2.6, 0.04, 1.6]} />
        <meshStandardMaterial color="#3a4256" roughness={0.6} />
      </mesh>
      {/* White tile so colour changes are easy to see, as in a real lab */}
      <mesh position={[0, 0.045, 0]} receiveShadow>
        <boxGeometry args={[1.5, 0.01, 1.3]} />
        <meshStandardMaterial color="#f4f5f8" roughness={0.8} />
      </mesh>
      <mesh position={[-1.4, 2.25, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 4.5, 16]} />
        <meshStandardMaterial color="#9aa3b8" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[-0.7, 3.3, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.025, 0.025, 1.4, 12]} />
        <meshStandardMaterial color="#9aa3b8" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[BURETTE_X, 3.3, 0]}>
        <boxGeometry args={[0.24, 0.12, 0.24]} />
        <meshStandardMaterial color="#2b3245" />
      </mesh>

      {/* Burette */}
      <mesh position={[BURETTE_X, (GRAD_TOP + 0.25 + TIP_Y + 0.25) / 2, 0]}>
        <cylinderGeometry args={[TUBE_R, TUBE_R, GRAD_TOP + 0.25 - (TIP_Y + 0.25), 24, 1, true]} />
        <meshStandardMaterial color={glass} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={buretteLiquid}>
        <cylinderGeometry args={[TUBE_R * 0.85, TUBE_R * 0.85, 1, 20]} />
        <meshStandardMaterial color="#cfe3ff" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {ticks.map((ml) => {
        const y = GRAD_TOP - ((GRAD_TOP - GRAD_BOTTOM) * ml) / BURETTE_CAPACITY
        return (
          <group key={ml}>
            <mesh position={[BURETTE_X + 0.04, y, TUBE_R]}>
              <boxGeometry args={[0.08, 0.008, 0.002]} />
              <meshBasicMaterial color="#5b6478" />
            </mesh>
            <Label3D lines={[String(ml)]} position={[BURETTE_X + 0.22, y, 0]} height={0.12} color="#8a93a8" background={null} font="500 48px ui-monospace, monospace" />
          </group>
        )
      })}
      {/* Stopcock and tip */}
      <mesh position={[BURETTE_X, TIP_Y + 0.12, 0]}>
        <cylinderGeometry args={[TUBE_R, 0.02, 0.26, 20]} />
        <meshStandardMaterial color={glass} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh position={[BURETTE_X, TIP_Y + 0.05, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.04, 0.04, 0.22, 16]} />
        <meshStandardMaterial color="#2b3245" />
      </mesh>
      <mesh ref={handle} position={[BURETTE_X + 0.14, TIP_Y + 0.05, 0]}>
        <boxGeometry args={[0.04, 0.22, 0.04]} />
        <meshStandardMaterial color="#3b5bdb" />
      </mesh>

      {/* Flask */}
      <group position={[BURETTE_X, FLASK_Y, 0]}>
        <mesh geometry={shellGeom}>
          <meshStandardMaterial color={glass} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} roughness={0.1} />
        </mesh>
        <mesh ref={liquid} renderOrder={1}>
          <latheGeometry args={[flaskProfile(0.3, 0.015), 48]} />
          <meshStandardMaterial ref={liquidMat} color="#eef2f6" transparent opacity={0.4} depthWrite={false} roughness={0.2} />
        </mesh>
      </group>

      {/* Falling drops */}
      <instancedMesh ref={dropMesh} args={[undefined, undefined, 40]}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshStandardMaterial color="#cfe3ff" transparent opacity={0.85} />
      </instancedMesh>
    </>
  )
}
