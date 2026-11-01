import { useCallback, useMemo, useRef, useState } from 'react'
import { conversion, isolate, stoichiometry, type AspirinParams, type AspirinResult, type CatalystId } from '../../engines/synthesisOfAspirin'
import { useSimLoop } from '../shared/lab'

/** Simulated minutes per real second. */
export const SPEEDS = [0.5, 1, 2, 4]
export const MAX_MINUTES = 60

export type Phase = 'setup' | 'heating' | 'isolated'

/**
 * Aspirin synthesis bench: weigh salicylic acid, add acetic anhydride and catalyst, heat in a
 * water bath (time runs while heating), then quench, crystallise, filter and test the product.
 */
export function useSynthesisOfAspirin() {
  const [params, setParamsState] = useState<AspirinParams>({ saMass: 2, ac2oVolume: 5, catalyst: 'phosphoric', tempC: 85 })
  const [recrystallise, setRecrystalliseState] = useState(false)
  const [phase, setPhase] = useState<Phase>('setup')
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [result, setResult] = useState<AspirinResult | null>(null)
  const minutes = useRef(0)
  const log = useRef<{ t: number; X: number }[]>([{ t: 0, X: 0 }])
  const paramsRef = useRef(params)
  paramsRef.current = params
  const [, force] = useState(0)

  useSimLoop((dt) => {
    const p = paramsRef.current
    const next = Math.min(MAX_MINUTES, minutes.current + Math.min(dt, 0.1) * speed)
    minutes.current = next
    const last = log.current[log.current.length - 1]
    if (next - last.t >= 0.1 || next >= MAX_MINUTES) log.current.push({ t: next, X: conversion(p.catalyst, p.tempC, next) })
    if (next >= MAX_MINUTES) setRunning(false)
  }, running)

  const restart = useCallback(() => {
    minutes.current = 0
    log.current = [{ t: 0, X: 0 }]
    setRunning(false)
    setPhase('setup')
    setResult(null)
    force((n) => n + 1)
  }, [])

  const setParams = (patch: Partial<AspirinParams>) => {
    setParamsState((p) => ({ ...p, ...patch }))
    restart()
  }

  const stoich = useMemo(() => stoichiometry(params), [params])
  const X = conversion(params.catalyst, params.tempC, minutes.current)

  return {
    params,
    setSaMass: (v: number) => setParams({ saMass: v }),
    setAc2oVolume: (v: number) => setParams({ ac2oVolume: v }),
    setCatalyst: (c: CatalystId) => setParams({ catalyst: c }),
    setTemperature: (v: number) => setParams({ tempC: v }),
    recrystallise,
    setRecrystallise: (v: boolean) => {
      setRecrystalliseState(v)
      if (phase === 'isolated') setResult(isolate(paramsRef.current, minutes.current, v))
    },
    phase,
    running,
    /** Start or pause heating. */
    togglePlay: () => {
      if (phase === 'isolated') {
        restart()
        setPhase('heating')
        setRunning(true)
        return
      }
      if (minutes.current >= MAX_MINUTES) return
      setPhase('heating')
      setRunning((r) => !r)
    },
    /** Pour into cold water, crystallise, filter, dry and run the purity tests. */
    isolate: () => {
      setRunning(false)
      setPhase('isolated')
      setResult(isolate(paramsRef.current, minutes.current, recrystallise))
    },
    reset: restart,
    speed,
    setSpeed,
    minutes: minutes.current,
    minutesRef: minutes,
    conversion: X,
    stoich,
    result,
    log: log.current.slice(),
  }
}

export type AspirinController = ReturnType<typeof useSynthesisOfAspirin>
