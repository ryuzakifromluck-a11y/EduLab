import { useCallback, useMemo, useRef, useState } from 'react'
import { emissionSpectrum, flameColor, randomUnknown, type MetalId, type Mixture } from '../../engines/flameTest'
import { useSimLoop } from '../shared/lab'

export type SampleId = MetalId | 'unknown'
export const SPEEDS = [0.5, 1, 2]
/** Salt burns off the wire with this time constant (s)… */
export const BURN_TAU = 6
/** …down to traces that stay until the wire is cleaned in HCl. */
export const TRACE = 0.15

/**
 * Nichrome wire flame test. Clean the wire in HCl, dip it in a salt, hold it in the flame.
 * The salt burns off over a few seconds; traces stay on the wire until it is cleaned again.
 */
export function useFlameTest() {
  const [sample, setSample] = useState<SampleId>('Na')
  const [unknownId, setUnknownId] = useState<MetalId>(() => randomUnknown())
  const [inFlame, setInFlame] = useState(false)
  const [cobaltGlass, setCobaltGlass] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [guess, setGuess] = useState<MetalId>('Na')
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null)
  const [cleaned, setCleaned] = useState(true)
  /** The Bunsen burner starts unlit; dipping or pressing play lights it. */
  const [lit, setLit] = useState(false)
  /** Counts dips, so the scene can replay the burst of sparks for each one. */
  const [dips, setDips] = useState(0)
  const load = useRef<Mixture>({})
  const [, force] = useState(0)

  useSimLoop((dt) => {
    const k = Math.exp((-Math.min(dt, 0.1) * speed) / BURN_TAU)
    for (const id of Object.keys(load.current) as MetalId[]) {
      const a = load.current[id]!
      if (a > TRACE) load.current[id] = TRACE + (a - TRACE) * k
    }
  }, inFlame)

  const metal: MetalId = sample === 'unknown' ? unknownId : sample
  const mixture = inFlame ? load.current : {}
  const color = flameColor(mixture, cobaltGlass)
  const loadKey = JSON.stringify(load.current)
  const spectrum = useMemo(() => emissionSpectrum(JSON.parse(loadKey) as Mixture, cobaltGlass), [loadKey, cobaltGlass])

  const clean = useCallback(() => {
    load.current = {}
    setCleaned(true)
    setInFlame(false)
    force((n) => n + 1)
  }, [])

  return {
    sample,
    setSample: (s: SampleId) => {
      setSample(s)
      setVerdict(null)
    },
    metal,
    unknownId,
    newUnknown: () => {
      setUnknownId((u) => randomUnknown(Math.random, u))
      setSample('unknown')
      setVerdict(null)
    },
    /** Dip the wire into the selected salt. */
    dip: () => {
      const traces = Object.keys(load.current).length > 0
      load.current = { ...load.current, [metal]: 1 }
      setCleaned(!traces)
      setLit(true)
      setInFlame(true)
      setDips((d) => d + 1)
      force((n) => n + 1)
    },
    lit,
    light: () => setLit(true),
    dips,
    clean,
    cleaned,
    loaded: Object.keys(load.current) as MetalId[],
    loadAmount: (id: MetalId) => load.current[id] ?? 0,
    inFlame,
    togglePlay: () => {
      setLit(true)
      setInFlame((f) => !f)
    },
    reset: () => {
      clean()
      setVerdict(null)
    },
    cobaltGlass,
    setCobaltGlass,
    speed,
    setSpeed,
    color,
    spectrum,
    guess,
    setGuess: (g: MetalId) => {
      setGuess(g)
      setVerdict(null)
    },
    check: () => setVerdict(guess === unknownId ? 'correct' : 'wrong'),
    verdict,
  }
}

export type FlameTestController = ReturnType<typeof useFlameTest>
