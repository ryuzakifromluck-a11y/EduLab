import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Label3D } from '../../components/lab/Label3D'
import { Bench, LabLights } from '../shared/three'
import type { GcMsController } from './useGcMsAnalysis'

const OVEN = new THREE.Vector3(-1.1, 0.75, 0)
const MS = new THREE.Vector3(1.0, 0.55, 0)
const BAND_COLORS = ['#f59f3a', '#2ccfb5', '#7b93ff', '#d38cf0', '#f06a8a', '#e6d45a']

/** Coiled capillary column inside the oven (helix), entering from the injector and leaving to the MS. */
function useColumnCurve() {
  return useMemo(() => {
    const pts: THREE.Vector3[] = [new THREE.Vector3(OVEN.x - 0.45, OVEN.y + 0.85, 0.1)]
    const turns = 4
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * turns * Math.PI * 2
      pts.push(new THREE.Vector3(OVEN.x + Math.cos(a) * 0.42, OVEN.y + 0.45 - (i / 160) * 0.7, Math.sin(a) * 0.42))
    }
    pts.push(new THREE.Vector3(OVEN.x + 0.6, OVEN.y - 0.3, 0), new THREE.Vector3(MS.x - 0.55, MS.y, 0))
    return new THREE.CatmullRomCurve3(pts)
  }, [])
}

function drawScreen(ctx: CanvasRenderingContext2D, title: string, draw: (w: number, h: number) => void) {
  const { width: W, height: H } = ctx.canvas
  ctx.fillStyle = '#0d1422'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#9aa6bf'
  ctx.font = '600 22px Inter Variable, sans-serif'
  ctx.fillText(title, 16, 30)
  ctx.strokeStyle = '#2a3550'
  ctx.lineWidth = 2
  ctx.strokeRect(40, 44, W - 56, H - 74)
  draw(W, H)
}

/** GC oven with column, injector, transfer line, quadrupole MS and two read-out screens. */
export function GcMsAnalysisScene({ ctl, labels }: { ctl: GcMsController; labels: { oven: string; ms: string; chrom: string; spectrum: string; injector: string } }) {
  const curve = useColumnCurve()
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 500, 0.018, 6, false), [curve])
  const bands = useRef<(THREE.Mesh | null)[]>([])
  const glow = useRef<THREE.MeshStandardMaterial>(null)
  const canvases = useMemo(() => {
    const make = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 256
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      return { canvas, tex }
    }
    return { chrom: make(), spec: make() }
  }, [])

  // Redraw the chromatogram and spectrum screens when the data change.
  const traceLen = ctl.trace.length
  useEffect(() => {
    const ctx = canvases.chrom.canvas.getContext('2d')
    if (!ctx) return
    const full = ctl.fullTrace
    const max = Math.max(1e-9, ...full.map((p) => p.signal))
    drawScreen(ctx, labels.chrom, (W, H) => {
      ctx.strokeStyle = '#2ccfb5'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctl.trace.forEach((p, i) => {
        const x = 40 + (p.t / ctl.tEnd) * (W - 56)
        const y = H - 30 - (p.signal / max) * (H - 84)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctl.peaks.forEach((p, i) => {
        const x = 40 + (p.t / ctl.tEnd) * (W - 56)
        ctx.fillStyle = i === ctl.selected ? '#ffffff' : '#f0a85c'
        ctx.font = '600 16px Inter Variable, sans-serif'
        ctx.fillText(String(i + 1), x - 4, H - 36 - (p.height / max) * (H - 84))
      })
    })
    canvases.chrom.tex.needsUpdate = true
  }, [canvases, traceLen, ctl.fullTrace, ctl.trace, ctl.peaks, ctl.selected, ctl.tEnd, labels.chrom])

  useEffect(() => {
    const ctx = canvases.spec.canvas.getContext('2d')
    if (!ctx) return
    const spec = ctl.peak?.spectrum ?? []
    drawScreen(ctx, labels.spectrum, (W, H) => {
      ctx.fillStyle = '#7b93ff'
      for (const p of spec) {
        const x = 40 + (p.mz / 100) * (W - 56)
        const h = (p.I / 100) * (H - 84)
        ctx.fillRect(x - 2, H - 30 - h, 4, h)
        if (p.I > 25) {
          ctx.fillStyle = '#e8ecf5'
          ctx.font = '500 14px ui-monospace, monospace'
          ctx.fillText(String(p.mz), x - 8, H - 36 - h)
          ctx.fillStyle = '#7b93ff'
        }
      }
    })
    canvases.spec.tex.needsUpdate = true
  }, [canvases, ctl.peak, labels.spectrum])

  useFrame((state) => {
    const t = ctl.timeRef.current
    ctl.elutions.forEach((e, i) => {
      const m = bands.current[i]
      if (!m) return
      const f = t / e.tR
      m.visible = t > 0 && f < 1.02
      if (m.visible) m.position.copy(curve.getPointAt(Math.min(1, Math.max(0, f))))
    })
    if (glow.current) glow.current.emissiveIntensity = 0.25 + 0.15 * Math.sin(state.clock.elapsedTime * 2) + Math.min(0.6, ctl.cond.tempC / 300)
  })

  return (
    <>
      <LabLights />
      <Bench width={6} depth={3} />
      {/* GC oven (front panel open) */}
      <mesh position={[OVEN.x, OVEN.y, -0.6]}>
        <boxGeometry args={[1.4, 1.5, 0.06]} />
        <meshStandardMaterial ref={glow} color="#3a3f4b" emissive="#ff7a2a" emissiveIntensity={0.3} />
      </mesh>
      {[-0.7, 0.7].map((dx) => (
        <mesh key={dx} position={[OVEN.x + dx, OVEN.y, 0]}>
          <boxGeometry args={[0.06, 1.5, 1.25]} />
          <meshStandardMaterial color="#cfd5df" />
        </mesh>
      ))}
      <mesh position={[OVEN.x, OVEN.y + 0.78, 0]}>
        <boxGeometry args={[1.46, 0.06, 1.25]} />
        <meshStandardMaterial color="#cfd5df" />
      </mesh>
      <mesh position={[OVEN.x, 0, 0]}>
        <boxGeometry args={[1.46, 0.06, 1.25]} />
        <meshStandardMaterial color="#cfd5df" />
      </mesh>
      <mesh geometry={tube}>
        <meshStandardMaterial color="#c9a46a" metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Injector port + syringe */}
      <mesh position={[OVEN.x - 0.45, OVEN.y + 0.95, 0.1]}>
        <cylinderGeometry args={[0.09, 0.09, 0.22, 20]} />
        <meshStandardMaterial color="#8f97a6" metalness={0.7} />
      </mesh>
      <mesh position={[OVEN.x - 0.45, OVEN.y + 1.35, 0.1]}>
        <cylinderGeometry args={[0.03, 0.03, 0.55, 12]} />
        <meshStandardMaterial color="#e8ecf5" transparent opacity={0.7} />
      </mesh>
      {/* Analyte bands travelling through the column */}
      {ctl.elutions.map((e, i) => (
        <mesh key={e.id} ref={(m) => void (bands.current[i] = m)} visible={false}>
          <sphereGeometry args={[0.055, 16, 12]} />
          <meshStandardMaterial color={BAND_COLORS[i % BAND_COLORS.length]} emissive={BAND_COLORS[i % BAND_COLORS.length]} emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* Mass spectrometer: ion source + quadrupole + detector */}
      <mesh position={[MS.x, MS.y, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.3, 0.3, 1.1, 32, 1, true]} />
        <meshStandardMaterial color="#a9bad6" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2 + Math.PI / 4
        return (
          <mesh key={k} position={[MS.x + 0.05, MS.y + Math.cos(a) * 0.12, Math.sin(a) * 0.12]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 16]} />
            <meshStandardMaterial color="#d3d8e0" metalness={0.9} roughness={0.2} />
          </mesh>
        )
      })}
      <mesh position={[MS.x + 0.6, MS.y, 0]}>
        <boxGeometry args={[0.12, 0.5, 0.5]} />
        <meshStandardMaterial color="#5a6478" />
      </mesh>
      <mesh position={[MS.x, 0.12, 0]}>
        <boxGeometry args={[1.3, 0.24, 0.8]} />
        <meshStandardMaterial color="#cfd5df" />
      </mesh>
      {/* Screens */}
      <mesh position={[-1.0, 2.2, -0.7]}>
        <planeGeometry args={[1.9, 0.95]} />
        <meshBasicMaterial map={canvases.chrom.tex} toneMapped={false} />
      </mesh>
      <mesh position={[1.1, 2.2, -0.7]}>
        <planeGeometry args={[1.9, 0.95]} />
        <meshBasicMaterial map={canvases.spec.tex} toneMapped={false} />
      </mesh>
      <Label3D lines={[labels.oven, `${ctl.cond.tempC} °C`]} position={[OVEN.x, 1.85, 0.4]} height={0.26} />
      <Label3D lines={[labels.ms]} position={[MS.x, 1.15, 0.3]} height={0.18} color="#e8ecf5" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
      <Label3D lines={[labels.injector]} position={[OVEN.x - 0.85, 1.95, 0.1]} height={0.16} color="#e8ecf5" background="rgba(0,0,0,0.55)" border="rgba(0,0,0,0)" font="600 32px Inter Variable, sans-serif" />
    </>
  )
}
