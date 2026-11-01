import { useCallback, useMemo, useRef, useState } from 'react'
import {
  MIXTURES,
  chromatogram,
  detectPeaks,
  elutions,
  holdUpTime,
  matchLibrary,
  resolution,
  runTime,
  spectrumAt,
  type ColumnId,
  type GcConditions,
  type MixtureId,
} from '../../engines/gcMsAnalysis'
import { useSimLoop } from '../shared/lab'

/** Simulated minutes per real second. */
export const SPEEDS = [0.5, 1, 2, 5]

/**
 * GC/MS run. "Inject" starts the clock; the chromatogram is recorded up to the current time and
 * each detected peak can be opened to see its mass spectrum and library match.
 */
export function useGcMsAnalysis() {
  const [mixture, setMixtureState] = useState<MixtureId>('A')
  const [cond, setCond] = useState<GcConditions>({ column: 'nonpolar', tempC: 60, flow: 1 })
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selected, setSelected] = useState<number | null>(null)
  const time = useRef(0)
  const [, force] = useState(0)

  const els = useMemo(() => elutions(MIXTURES[mixture], cond), [mixture, cond])
  const tEnd = useMemo(() => runTime(els), [els])
  const trace = useMemo(() => chromatogram(els, tEnd, 800), [els, tEnd])
  const allPeaks = useMemo(
    () =>
      detectPeaks(els, tEnd).map((p) => {
        const spectrum = spectrumAt(els, p.t)
        return { ...p, spectrum, matches: matchLibrary(spectrum).slice(0, 3) }
      }),
    [els, tEnd],
  )
  const minResolution = useMemo(() => {
    let min = Infinity
    for (let i = 1; i < els.length; i++) min = Math.min(min, resolution(els[i - 1], els[i]))
    return min
  }, [els])

  useSimLoop((dt) => {
    time.current = Math.min(tEnd, time.current + Math.min(dt, 0.1) * speed)
    if (time.current >= tEnd) setRunning(false)
  }, running)

  const restart = useCallback(() => {
    time.current = 0
    setRunning(false)
    setSelected(null)
    force((n) => n + 1)
  }, [])

  const now = time.current
  const peaks = allPeaks.filter((p) => p.t + 0.02 <= now || now >= tEnd)
  const sel = selected !== null && selected < peaks.length ? peaks[selected] : null

  return {
    mixture,
    setMixture: (m: MixtureId) => {
      setMixtureState(m)
      restart()
    },
    cond,
    setColumn: (column: ColumnId) => {
      setCond((c) => ({ ...c, column }))
      restart()
    },
    setTemperature: (tempC: number) => {
      setCond((c) => ({ ...c, tempC }))
      restart()
    },
    setFlow: (flow: number) => {
      setCond((c) => ({ ...c, flow }))
      restart()
    },
    running,
    togglePlay: () => {
      if (!running && time.current >= tEnd) {
        time.current = 0
        setSelected(null)
      }
      setRunning((r) => !r)
    },
    reset: restart,
    speed,
    setSpeed,
    time: now,
    timeRef: time,
    tEnd,
    holdUp: holdUpTime(cond.flow),
    elutions: els,
    trace: trace.filter((p) => p.t <= now),
    fullTrace: trace,
    peaks,
    selected: sel ? selected : null,
    select: setSelected,
    peak: sel,
    minResolution,
    done: now >= tEnd,
  }
}

export type GcMsController = ReturnType<typeof useGcMsAnalysis>
