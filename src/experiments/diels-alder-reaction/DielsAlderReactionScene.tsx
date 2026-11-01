import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { DielsAlderAnalysis } from '../../engines/dielsAlderReaction'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'

const RING = 0.8 // ring radius
const Y0 = 1.0 // plane of the diene
const LIFT = 1.3 // starting height of the dienophile above the diene
const UP = new THREE.Vector3(0, 1, 0)

const COLORS = { diene: '#4f7cff', dienophile: '#f59f3a', carbon: '#5c6475', oxygen: '#e04848', plus: '#3b82f6', minus: '#ef4444', bond: '#c9ced8' }

/** Hexagon vertex i (C1…C6) in the horizontal plane. */
const ringPoint = (i: number) => {
  const a = ((30 + 60 * i) * Math.PI) / 180
  return new THREE.Vector3(RING * Math.cos(a), Y0, RING * Math.sin(a))
}

type Atom = { key: string; color: string; r: number; at: (g: number) => THREE.Vector3 }
type Bond = { a: string; b: string; kind: 'sigma' | 'piLoss' | 'piGain' | 'newSigma' }

/** Builds the atoms and bonds of the reacting pair as functions of the progress g (0 → 1). */
function buildModel(a: DielsAlderAnalysis) {
  const lift = (g: number) => new THREE.Vector3(0, LIFT * (1 - g) ** 1.5, 0)
  const atoms: Atom[] = []
  const bonds: Bond[] = []
  const P = [0, 1, 2, 3, 4, 5].map(ringPoint)
  const center = new THREE.Vector3(0, Y0, 0)
  const radial = (i: number) => P[i].clone().sub(center).normalize()
  for (let i = 0; i < 4; i++) atoms.push({ key: `C${i + 1}`, color: COLORS.diene, r: 0.13, at: () => P[i].clone() })
  for (const i of [4, 5]) atoms.push({ key: `C${i + 1}`, color: COLORS.dienophile, r: 0.13, at: (g) => P[i].clone().add(lift(g)) })
  bonds.push({ a: 'C1', b: 'C2', kind: 'sigma' }, { a: 'C2', b: 'C3', kind: 'sigma' }, { a: 'C3', b: 'C4', kind: 'sigma' }, { a: 'C5', b: 'C6', kind: 'sigma' })
  bonds.push({ a: 'C1', b: 'C2', kind: 'piLoss' }, { a: 'C3', b: 'C4', kind: 'piLoss' }, { a: 'C5', b: 'C6', kind: 'piLoss' }, { a: 'C2', b: 'C3', kind: 'piGain' })
  bonds.push({ a: 'C4', b: 'C5', kind: 'newSigma' }, { a: 'C6', b: 'C1', kind: 'newSigma' })

  const d = a.diene.id
  if (d === 'dimethylbutadiene') {
    for (const i of [1, 2]) {
      atoms.push({ key: `Me${i}`, color: COLORS.carbon, r: 0.11, at: () => P[i].clone().addScaledVector(radial(i), 0.55) })
      bonds.push({ a: `C${i + 1}`, b: `Me${i}`, kind: 'sigma' })
    }
  }
  if (d === 'cyclopentadiene') {
    atoms.push({ key: 'C7', color: COLORS.diene, r: 0.12, at: () => center.clone().add(new THREE.Vector3(0.25, -0.55, 0)) })
    bonds.push({ a: 'C1', b: 'C7', kind: 'sigma' }, { a: 'C4', b: 'C7', kind: 'sigma' })
  }
  // Acceptor groups on the dienophile: endo points down towards the diene π system, exo up.
  const tilt = a.major === 'exo' ? 0.7 : -0.7
  const subDir = (i: number) => radial(i).multiplyScalar(0.75).add(new THREE.Vector3(0, tilt, 0)).normalize()
  const from = (base: (g: number) => THREE.Vector3, dir: THREE.Vector3, len: number) => (g: number) => base(g).addScaledVector(dir, len)
  const atomAt = (key: string) => atoms.find((x) => x.key === key)!.at
  if (a.dienophile.id === 'methylAcrylate') {
    const dir = subDir(4)
    const cAt = from(atomAt('C5'), dir, 0.5)
    atoms.push({ key: 'Ca', color: COLORS.carbon, r: 0.11, at: cAt })
    atoms.push({ key: 'O1', color: COLORS.oxygen, r: 0.11, at: (g) => cAt(g).add(new THREE.Vector3(0, 0.38, 0).add(radial(4).multiplyScalar(0.15))) })
    atoms.push({ key: 'O2', color: COLORS.oxygen, r: 0.11, at: (g) => cAt(g).addScaledVector(radial(3), -0.42) })
    atoms.push({ key: 'Me', color: COLORS.carbon, r: 0.11, at: (g) => cAt(g).addScaledVector(radial(3), -0.42).addScaledVector(radial(4), 0.42) })
    bonds.push({ a: 'C5', b: 'Ca', kind: 'sigma' }, { a: 'Ca', b: 'O1', kind: 'sigma' }, { a: 'Ca', b: 'O2', kind: 'sigma' }, { a: 'O2', b: 'Me', kind: 'sigma' })
  }
  if (a.dienophile.id === 'maleicAnhydride') {
    const c1 = from(atomAt('C5'), subDir(4), 0.55)
    const c2 = from(atomAt('C6'), subDir(5), 0.55)
    atoms.push({ key: 'Ca', color: COLORS.carbon, r: 0.11, at: c1 }, { key: 'Cb', color: COLORS.carbon, r: 0.11, at: c2 })
    atoms.push({ key: 'Ob', color: COLORS.oxygen, r: 0.11, at: (g) => c1(g).add(c2(g)).multiplyScalar(0.5).addScaledVector(subDir(4).add(subDir(5)).normalize(), 0.35) })
    atoms.push({ key: 'Oa', color: COLORS.oxygen, r: 0.11, at: (g) => c1(g).addScaledVector(radial(3), -0.4) })
    atoms.push({ key: 'Oc', color: COLORS.oxygen, r: 0.11, at: (g) => c2(g).addScaledVector(radial(0), 0.4) })
    bonds.push({ a: 'C5', b: 'Ca', kind: 'sigma' }, { a: 'C6', b: 'Cb', kind: 'sigma' }, { a: 'Ca', b: 'Ob', kind: 'sigma' }, { a: 'Cb', b: 'Ob', kind: 'sigma' }, { a: 'Ca', b: 'Oa', kind: 'sigma' }, { a: 'Cb', b: 'Oc', kind: 'sigma' })
  }
  return { atoms, bonds, P }
}

function placeCylinder(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, q: THREE.Quaternion) {
  const dir = b.clone().sub(a)
  const len = dir.length()
  mesh.position.copy(a).addScaledVector(dir, 0.5)
  mesh.scale.set(1, Math.max(1e-3, len), 1)
  mesh.quaternion.copy(q.setFromUnitVectors(UP, dir.normalize()))
}

/**
 * The reacting pair: the dienophile (orange) drops onto the s-cis diene (blue). Old π bonds
 * fade, the C2=C3 π bond and two new σ bonds (C4–C5, C6–C1) grow, and the p-orbital lobes
 * of the diene HOMO and dienophile LUMO (blue +, red −) show the in-phase overlap.
 */
export function DielsAlderReactionScene({ analysis, progress, labels }: { analysis: DielsAlderAnalysis; progress: () => number; labels: { diene: string; dienophile: string; product: string } }) {
  const model = useMemo(() => buildModel(analysis), [analysis])
  const atomRefs = useRef<(THREE.Mesh | null)[]>([])
  const bondRefs = useRef<(THREE.Mesh | null)[]>([])
  const bondMats = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  const lobeRefs = useRef<(THREE.Group | null)[]>([])
  const lobeMats = useRef<THREE.MeshStandardMaterial[]>([])
  const label = useRef<THREE.Group>(null)
  const q = useMemo(() => new THREE.Quaternion(), [])

  // Lobe signs (top lobe): diene HOMO ψ₂ = + + − −, dienophile LUMO π* has its lower lobes − (C5) and + (C6).
  const lobes = useMemo(() => [
    { atom: 'C1', top: 1 },
    { atom: 'C2', top: 1 },
    { atom: 'C3', top: -1 },
    { atom: 'C4', top: -1 },
    { atom: 'C5', top: 1 },
    { atom: 'C6', top: -1 },
  ], [])

  useFrame(() => {
    const g = Math.min(1, Math.max(0, progress()))
    const pos = new Map(model.atoms.map((a) => [a.key, a.at(g)]))
    model.atoms.forEach((a, i) => atomRefs.current[i]?.position.copy(pos.get(a.key)!))
    const center = new THREE.Vector3(0, Y0, 0)
    model.bonds.forEach((b, i) => {
      const mesh = bondRefs.current[i]
      const mat = bondMats.current[i]
      if (!mesh || !mat) return
      let A = pos.get(b.a)!
      let B = pos.get(b.b)!
      if (b.kind === 'piLoss' || b.kind === 'piGain') {
        // Second line of a double bond, drawn towards the ring centre.
        const mid = A.clone().add(B).multiplyScalar(0.5)
        const off = center.clone().setY(mid.y).sub(mid).normalize().multiplyScalar(0.13)
        A = A.clone().add(off).lerp(B, 0.12)
        B = B.clone().add(off).lerp(pos.get(b.a)!.clone().add(off), 0.12)
      }
      placeCylinder(mesh, A, B, q)
      const vis = b.kind === 'piLoss' ? 1 - g : b.kind === 'piGain' || b.kind === 'newSigma' ? g : 1
      mat.opacity = vis
      mesh.visible = vis > 0.02
    })
    lobes.forEach((l, i) => {
      const grp = lobeRefs.current[i]
      if (!grp) return
      grp.position.copy(pos.get(l.atom)!)
      grp.visible = g < 0.97
    })
    for (const m of lobeMats.current) m.opacity = 0.45 * (1 - g)
    if (label.current) label.current.visible = g > 0.9
  })

  return (
    <>
      <LabLights />
      <Bench width={5} depth={3} />
      {model.atoms.map((a, i) => (
        <mesh key={a.key} ref={(m) => void (atomRefs.current[i] = m)} castShadow>
          <sphereGeometry args={[a.r, 24, 16]} />
          <meshStandardMaterial color={a.color} roughness={0.35} metalness={0.1} />
        </mesh>
      ))}
      {model.bonds.map((b, i) => (
        <mesh key={`${b.a}-${b.b}-${b.kind}`} ref={(m) => void (bondRefs.current[i] = m)}>
          <cylinderGeometry args={[b.kind === 'sigma' || b.kind === 'newSigma' ? 0.045 : 0.03, b.kind === 'sigma' || b.kind === 'newSigma' ? 0.045 : 0.03, 1, 10]} />
          <meshStandardMaterial
            ref={(m) => void (bondMats.current[i] = m)}
            color={b.kind === 'newSigma' ? '#2ccfb5' : b.kind === 'piGain' ? '#2ccfb5' : COLORS.bond}
            transparent
            opacity={1}
          />
        </mesh>
      ))}
      {lobes.map((l, i) => (
        <group key={l.atom} ref={(g) => void (lobeRefs.current[i] = g)}>
          {[1, -1].map((side) => (
            <mesh key={side} position={[0, side * 0.24, 0]} scale={[0.12, 0.22, 0.12]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial
                ref={(m) => {
                  if (m && !lobeMats.current.includes(m)) lobeMats.current.push(m)
                }}
                color={l.top * side > 0 ? COLORS.plus : COLORS.minus}
                transparent
                opacity={0.45}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
      <Label3D lines={[labels.diene]} position={[-1.35, 0.35, 0.9]} height={0.2} color="#9db5ff" background="rgba(0,0,0,0.6)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
      <Label3D lines={[labels.dienophile]} position={[1.45, 2.55, -0.6]} height={0.2} color="#ffc68a" background="rgba(0,0,0,0.6)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
      <group ref={label}>
        <Label3D lines={[labels.product]} position={[0, 2.3, 0]} height={0.26} />
      </group>
    </>
  )
}
