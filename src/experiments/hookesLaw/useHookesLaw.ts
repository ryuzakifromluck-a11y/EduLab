import { useCallback, useRef, useState } from 'react'
import { SpringSystem, elasticEnergy, springById, stiffnessFrom, weight, type Spring } from '../../engines/hookesLaw'
import { useReducedMotion } from '../../lib/hooks'
import { useSimLoop } from '../shared/lab'

export const MASS_MAX = 1000 // g
export const MASS_STEP = 50

export interface SpringReading {
  spring: Spring['id']
  mass: number
  force: number
  extension: number
}

export function useHookesLaw() {
  const reduced = useReducedMotion()
  const [springId, setSpringId] = useState<Spring['id']>('medium')
  const [massG, setMassState] = useState(200)
  const [running, setRunning] = useState(!reduced)
  const [readings, setReadings] = useState<SpringReading[]>([])
  const sys = useRef<SpringSystem>(null as unknown as SpringSystem)
  if (!sys.current) {
    sys.current = new SpringSystem(springById('medium'))
    sys.current.setMass(0.2)
    sys.current.settle()
  }
  const [, force] = useState(0)

  useSimLoop((dt) => sys.current.advance(dt), running, 20)

  const setMass = useCallback(
    (g: number) => {
      setMassState(g)
      sys.current.setMass(g / 1000)
      if (!running) sys.current.settle()
    },
    [running],
  )

  const replaceSpring = useCallback(
    (id: Spring['id'] = springId) => {
      setSpringId(id)
      sys.current.replace(springById(id))
      force((n) => n + 1)
    },
    [springId],
  )

  const s = sys.current
  const spring = s.spring
  const ownReadings = readings.filter((r) => r.spring === springId)
  return {
    sys: s,
    spring,
    springId,
    chooseSpring: (id: Spring['id']) => replaceSpring(id),
    replaceSpring: () => replaceSpring(),
    massG,
    setMass,
    running,
    togglePlay: () => {
      if (running) s.settle()
      setRunning((r) => !r)
    },
    reset: () => {
      setMassState(0)
      s.setMass(0)
      replaceSpring()
      setReadings([])
    },
    force: weight(massG / 1000),
    extension: s.equilibrium,
    liveExtension: s.x,
    energy: elasticEnergy(spring.k, s.equilibrium - s.set),
    overLimit: s.overLimit,
    permanentSet: s.set,
    readings,
    ownReadings,
    measuredK: stiffnessFrom(ownReadings.filter((r) => r.force <= spring.limit)),
    record: () =>
      setReadings((rs) => [...rs, { spring: springId, mass: massG, force: weight(massG / 1000), extension: s.equilibrium }].slice(-60)),
    clearReadings: () => setReadings([]),
  }
}

export type HookesController = ReturnType<typeof useHookesLaw>
