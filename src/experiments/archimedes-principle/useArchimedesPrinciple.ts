import { useCallback, useState } from 'react'
import { bodyById, fluidById, immerse, sgFromWeights, type Body, type Fluid } from '../../engines/archimedesPrinciple'
import { useSimLoop } from '../shared/lab'

export const LOWER_STEP = 0.5 // cm
/** The balance can lower the body 2 cm below full immersion. */
export const EXTRA = 2

export interface ArchReading {
  body: Body['id']
  fluid: Fluid['id']
  depth: number
  apparent: number
  buoyancy: number
}

export function useArchimedesPrinciple() {
  const [bodyId, setBodyId] = useState<Body['id']>('aluminium')
  const [fluidId, setFluidId] = useState<Fluid['id']>('water')
  const [lowered, setLowered] = useState(0) // cm the balance has been lowered below first contact
  const [running, setRunning] = useState(false)
  const [readings, setReadings] = useState<ArchReading[]>([])
  const body = bodyById(bodyId)
  const fluid = fluidById(fluidId)
  const maxLower = body.height + EXTRA

  const step = useCallback(
    (dt: number) => {
      setLowered((x) => {
        const next = Math.min(maxLower, Math.round((x + 1.2 * Math.min(dt, 0.1)) * 100) / 100)
        if (next >= maxLower) setRunning(false)
        return next
      })
    },
    [maxLower],
  )
  useSimLoop(step, running, 20)

  const r = immerse(body, fluid, Math.min(1, lowered / body.height))
  const full = immerse(body, fluid, 1)
  const inWater = immerse(body, fluidById('water'), 1)

  return {
    body,
    fluid,
    bodyId,
    fluidId,
    setBody: (id: Body['id']) => {
      setBodyId(id)
      setLowered(0)
      setRunning(false)
    },
    setFluid: (id: Fluid['id']) => {
      setFluidId(id)
      setLowered(0)
      setRunning(false)
    },
    lowered,
    maxLower,
    setLowered: (v: number) => {
      setRunning(false)
      setLowered(Math.max(0, Math.min(maxLower, v)))
    },
    running,
    togglePlay: () => {
      if (!running && lowered >= maxLower) setLowered(0)
      setRunning((x) => !x)
    },
    reset: () => {
      setRunning(false)
      setLowered(0)
    },
    reading: r,
    /** Depth of the body's bottom below the surface, cm. */
    depth: r.submerged * body.height,
    full,
    /** SG from the readings in air and fully in water (only for bodies that sink in water). */
    sg: sgFromWeights(inWater.weight, inWater.apparent),
    readings,
    record: () =>
      setReadings((rs) => [...rs, { body: bodyId, fluid: fluidId, depth: r.submerged * body.height, apparent: r.apparent, buoyancy: r.buoyancy }].slice(-60)),
    clearReadings: () => setReadings([]),
  }
}

export type ArchimedesController = ReturnType<typeof useArchimedesPrinciple>
