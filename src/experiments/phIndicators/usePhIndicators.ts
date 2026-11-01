import { useState } from 'react'
import { SUBSTANCES, hydrogenIon, hydroxideIon, indicatorById, indicatorColor, nature, pOH, type IndicatorId } from '../../engines/indicators'

export type SampleId = (typeof SUBSTANCES)[number]['id'] | 'custom'

export interface PhTest {
  n: number
  sample: SampleId
  pH: number
  indicator: IndicatorId
  color: string
}

/** One sample tested with every indicator at once; the selected indicator is the one being studied. */
export function usePhIndicators() {
  const [sample, setSampleState] = useState<SampleId>('lemon')
  const [pH, setPhState] = useState(2.2)
  const [indicator, setIndicator] = useState<IndicatorId>('universal')
  const [tests, setTests] = useState<PhTest[]>([])
  const [count, setCount] = useState(0)

  const ind = indicatorById(indicator)
  const colour = indicatorColor(ind, pH)
  return {
    sample,
    setSample: (id: SampleId) => {
      setSampleState(id)
      const s = SUBSTANCES.find((x) => x.id === id)
      if (s) setPhState(s.pH)
    },
    pH,
    setPh: (v: number) => {
      setPhState(Math.round(v * 10) / 10)
      setSampleState('custom')
    },
    indicator,
    setIndicator,
    reset: () => {
      setSampleState('water')
      setPhState(7)
    },
    tests,
    record: () => {
      const n = count + 1
      setCount(n)
      setTests((ts) => [...ts, { n, sample, pH, indicator, color: colour.alpha < 0.05 ? 'none' : colour.hex }].slice(-40))
    },
    clearTests: () => setTests([]),
    hydrogen: hydrogenIon(pH),
    hydroxide: hydroxideIon(pH),
    pOH: pOH(pH),
    nature: nature(pH),
    colour,
  }
}

export type PhController = ReturnType<typeof usePhIndicators>
