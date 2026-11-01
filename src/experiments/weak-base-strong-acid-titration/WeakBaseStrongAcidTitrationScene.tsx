import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Label3D } from '../../components/lab/Label3D'
import { FLASK, flaskRadius, liquidHeight } from '../titration/flaskGeometry'
import { BURETTE_CAPACITY, type WeakBaseController } from './useWeakBaseStrongAcidTitration'

const GRAD_TOP = 4.1
const GRAD_BOTTOM = 2.3
const TUBE_R = 0.075
const TIP_Y = 1.7
const FLASK_Y = 0.06
const FALL_TIME = 0.32
// pH-curve screen
const SX = 2.1
const SY = 2.4
const SW = 2.2
const SH = 1.7

function flaskProfile(height: number, inset = 0): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)]
  for (let i = 0; i <= 32; i++) {
    const y = (height * i) / 32
    pts.push(new THREE.Vector2(Math.max(0.001, flaskRadius(y) - inset), y))
  }
  pts.push(new THREE.Vector2(0, height))
  return pts
}

const toScreen = (v: number, pH: number) => new THREE.Vector3(SX - SW / 2 + (v / BURETTE_CAPACITY) * SW, SY - SH / 2 + (pH / 14) * SH, 0.011)

/** Burette of HCl over a flask of NH₃ + indicator, with a live pH-curve screen beside it. */
export function WeakBaseStrongAcidTitrationScene({ ctl, glass, labels }: { ctl: WeakBaseController; glass: string; labels: { pH: string; curve: string } }) {
  const liquid = useRef<THREE.Mesh>(null)
  const liquidMat = useRef<THREE.MeshStandardMaterial>(null)
  const buretteLiquid = useRef<THREE.Mesh>(null)
  const handle = useRef<THREE.Mesh>(null)
  const dropMesh = useRef<THREE.InstancedMesh>(null)
  const marker = useRef<THREE.Mesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  const lastH = useRef(-1)
  const shell = useMemo(() => {
    const pts = flaskProfile(FLASK.coneHeight)
    pts.pop()
    pts.push(new THREE.Vector2(FLASK.neckRadius, FLASK.coneHeight + FLASK.neckHeight))
    return new THREE.LatheGeometry(pts, 48)
  }, [])
  const curveLine = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(ctl.curve.map((p) => toScreen(p.volume, p.pH)))
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#2ccfb5' }))
  }, [ctl.curve])
  const grid = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (const pH of [0, 7, 14]) pts.push(toScreen(0, pH), toScreen(BURETTE_CAPACITY, pH))
    for (const v of [0, 10, 20, 30, 40, 50]) pts.push(toScreen(v, 0), toScreen(v, 14))
    return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#3b4660' }))
  }, [])
  const eqLine = useMemo(() => {
    const v = Math.min(BURETTE_CAPACITY, ctl.veq)
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints([toScreen(v, 0), toScreen(v, 14)]), new THREE.LineDashedMaterial({ color: '#f0a85c', dashSize: 0.05, gapSize: 0.04 }))
  }, [ctl.veq])
  eqLine.computeLineDistances()

  useFrame(() => {
    const vol = ctl.params.baseVolume + ctl.addedRef.current
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
    if (handle.current) handle.current.rotation.x += ((ctl.dripping ? Math.PI / 2 : 0) - handle.current.rotation.x) * 0.2
    if (marker.current) marker.current.position.copy(toScreen(ctl.addedRef.current, ctl.point.pH))
    if (dropMesh.current) {
      const now = performance.now()
      const surface = FLASK_Y + liquidHeight(vol)
      for (let i = 0; i < 40; i++) {
        const d = ctl.drops.current[i]
        const age = d ? (now - d.t) / 1000 : Infinity
        if (age < FALL_TIME) {
          const k = age / FALL_TIME
          dummy.position.set(0, TIP_Y - (TIP_Y - surface) * k * k, 0)
          dummy.scale.setScalar(1)
        } else dummy.scale.setScalar(0.0001)
        dummy.updateMatrix()
        dropMesh.current.setMatrixAt(i, dummy.matrix)
      }
      dropMesh.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 6, 5]} intensity={1.4} castShadow />
      <directionalLight position={[-3, 3, -4]} intensity={0.4} />
      <mesh position={[0.6, 0.02, 0]} receiveShadow>
        <boxGeometry args={[4.6, 0.04, 1.6]} />
        <meshStandardMaterial color="#3a4256" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.045, 0]}>
        <boxGeometry args={[1.5, 0.01, 1.3]} />
        <meshStandardMaterial color="#f4f5f8" roughness={0.8} />
      </mesh>
      {/* Stand and clamp */}
      <mesh position={[-1.4, 2.25, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 4.5, 16]} />
        <meshStandardMaterial color="#9aa3b8" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[-0.7, 3.3, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.025, 0.025, 1.4, 12]} />
        <meshStandardMaterial color="#9aa3b8" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Burette */}
      <mesh position={[0, (GRAD_TOP + TIP_Y + 0.5) / 2, 0]}>
        <cylinderGeometry args={[TUBE_R, TUBE_R, GRAD_TOP - TIP_Y, 24, 1, true]} />
        <meshStandardMaterial color={glass} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={buretteLiquid}>
        <cylinderGeometry args={[TUBE_R * 0.85, TUBE_R * 0.85, 1, 20]} />
        <meshStandardMaterial color="#ffe1d6" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {[0, 10, 20, 30, 40, 50].map((ml) => {
        const y = GRAD_TOP - ((GRAD_TOP - GRAD_BOTTOM) * ml) / BURETTE_CAPACITY
        return <Label3D key={ml} lines={[String(ml)]} position={[0.22, y, 0]} height={0.12} color="#8a93a8" background={null} font="500 48px ui-monospace, monospace" />
      })}
      <mesh position={[0, TIP_Y + 0.12, 0]}>
        <cylinderGeometry args={[TUBE_R, 0.02, 0.26, 20]} />
        <meshStandardMaterial color={glass} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh ref={handle} position={[0.14, TIP_Y + 0.05, 0]}>
        <boxGeometry args={[0.04, 0.22, 0.04]} />
        <meshStandardMaterial color="#d9731a" />
      </mesh>
      {/* Flask */}
      <group position={[0, FLASK_Y, 0]}>
        <mesh geometry={shell}>
          <meshStandardMaterial color={glass} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} roughness={0.1} />
        </mesh>
        <mesh ref={liquid} renderOrder={1}>
          <latheGeometry args={[flaskProfile(0.3, 0.015), 48]} />
          <meshStandardMaterial ref={liquidMat} color="#eef2f6" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      </group>
      <instancedMesh ref={dropMesh} args={[undefined, undefined, 40]}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshStandardMaterial color="#ffe1d6" transparent opacity={0.85} />
      </instancedMesh>
      {/* pH meter read-out */}
      <Label3D lines={[labels.pH, ctl.point.pH.toFixed(2)]} position={[0.95, 0.75, 0.3]} height={0.36} />
      {/* pH-curve screen */}
      <mesh position={[SX, SY, 0]}>
        <planeGeometry args={[SW + 0.3, SH + 0.3]} />
        <meshStandardMaterial color="#121a2a" />
      </mesh>
      <mesh position={[SX, SY - SH / 2 - 0.9, -0.05]}>
        <boxGeometry args={[0.08, 1.6, 0.08]} />
        <meshStandardMaterial color="#5a6478" />
      </mesh>
      <primitive object={grid} />
      <primitive object={eqLine} />
      <primitive object={curveLine} />
      <mesh ref={marker}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Label3D lines={[labels.curve]} position={[SX, SY + SH / 2 + 0.32, 0.02]} height={0.18} color="#e8ecf5" background="rgba(0,0,0,0.6)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
    </>
  )
}
