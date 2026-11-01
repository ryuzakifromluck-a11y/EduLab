import { useCallback, useRef, useState } from 'react'
import { Rod, materialById, steadyHeatFlow, type Material } from '../../engines/heatTransfer'
import { useSimLoop } from '../shared/lab'

export const T_COLD = 20
export const SPEEDS = [1, 5, 20, 50, 200]
const MAX_LOG = 2000

export interface ProbeSample {
  t: number
  a: number
  b: number
}

interface Settings {
  a: Material['id']
  b: Material['id']
  tHot: number
  length: number
}

const DEFAULTS: Settings = { a: 'copper', b: 'steel', tHot: 90, length: 0.2 }

export function useHeatTransfer() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(20)
  const rods = useRef<{ a: Rod; b: Rod }>(null as unknown as { a: Rod; b: Rod })
  const make = (s: Settings) => ({
    a: new Rod(materialById(s.a), s.length, s.tHot, T_COLD),
    b: new Rod(materialById(s.b), s.length, s.tHot, T_COLD),
  })
  if (!rods.current) rods.current = make(DEFAULTS)
  const log = useRef<ProbeSample[]>([{ t: 0, a: T_COLD, b: T_COLD }])
  const [, force] = useState(0)

  useSimLoop((dt) => {
    const { a, b } = rods.current
    const step = dt * speed
    a.advance(step)
    b.advance(step)
    const last = log.current[log.current.length - 1]
    if (a.time - last.t >= Math.max(0.5, speed * 0.05)) {
      log.current.push({ t: a.time, a: a.at(0.5), b: b.at(0.5) })
      if (log.current.length > MAX_LOG) log.current = log.current.filter((_, i) => i % 2 === 0)
    }
  }, running)

  const apply = useCallback((p: Partial<Settings>) => {
    setSettings((old) => {
      const next = { ...old, ...p }
      rods.current = make(next)
      log.current = [{ t: 0, a: T_COLD, b: T_COLD }]
      return next
    })
    force((n) => n + 1)
  }, [])

  const { a, b } = rods.current
  const mA = materialById(settings.a)
  const mB = materialById(settings.b)
  return {
    rods: rods.current,
    settings,
    setA: (id: Material['id']) => apply({ a: id }),
    setB: (id: Material['id']) => apply({ b: id }),
    setHot: (tHot: number) => apply({ tHot }),
    setLength: (length: number) => apply({ length }),
    running,
    togglePlay: () => setRunning((r) => !r),
    reset: () => {
      apply({})
      setRunning(false)
    },
    speed,
    setSpeed,
    time: a.time,
    probeA: a.at(0.5),
    probeB: b.at(0.5),
    flowA: a.heatOut,
    flowB: b.heatOut,
    steadyA: steadyHeatFlow(mA, settings.length, settings.tHot, T_COLD),
    steadyB: steadyHeatFlow(mB, settings.length, settings.tHot, T_COLD),
    profileA: a.profile(),
    profileB: b.profile(),
    log: log.current.slice(),
  }
}

export type HeatController = ReturnType<typeof useHeatTransfer>
