import { useRef, useState } from 'react'
import { mediumById, traceRay, type Medium } from '../../engines/optics'
import { useAnimationFrame, useReducedMotion } from '../../lib/hooks'

export interface RayReading {
  n1: number
  n2: number
  incidence: number
  refraction: number | null
}

export function useOptics() {
  const reduced = useReducedMotion()
  const [m1, setM1] = useState<Medium['id']>('air')
  const [m2, setM2] = useState<Medium['id']>('glass')
  const [angle, setAngle] = useState(40)
  const [running, setRunning] = useState(!reduced)
  const [readings, setReadings] = useState<RayReading[]>([])
  // Phase of the light pulses (0–1 along each ray), advanced by the animation loop.
  const phase = useRef(0)
  useAnimationFrame((dt) => void (phase.current = (phase.current + dt * 0.45) % 1), running)

  const n1 = mediumById(m1).n
  const n2 = mediumById(m2).n
  const ray = traceRay(n1, n2, angle)
  return {
    m1,
    m2,
    n1,
    n2,
    setM1,
    setM2,
    swap: () => {
      setM1(m2)
      setM2(m1)
    },
    angle,
    setAngle,
    ray,
    phase,
    running,
    togglePlay: () => setRunning((r) => !r),
    reset: () => {
      setM1('air')
      setM2('glass')
      setAngle(40)
      setReadings([])
    },
    readings,
    record: () => setReadings((rs) => [...rs, { n1, n2, incidence: angle, refraction: ray.refraction }].slice(-60)),
    clearReadings: () => setReadings([]),
  }
}

export type OpticsController = ReturnType<typeof useOptics>
