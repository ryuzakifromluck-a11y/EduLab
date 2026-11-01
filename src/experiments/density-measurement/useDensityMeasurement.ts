import { useCallback, useState } from 'react'
import {
  BALANCE_RESOLUTION,
  CYLINDER_RESOLUTION,
  PYCNOMETER,
  RULER_RESOLUTION,
  blockVolume,
  cylinderReading,
  density,
  hydrometerDepth,
  hydrometerScale,
  liquidById,
  liquidDensity,
  massOf,
  pycnometerDensity,
  pycnometerMasses,
  readInstrument,
  solidById,
  waterDensity,
  type LiquidSample,
  type SolidSample,
} from '../../engines/densityMeasurement'
import { useSimLoop } from '../shared/lab'

export type Mode = 'solid' | 'liquid'
export type VolumeMethod = 'ruler' | 'cylinder' | 'overflow'
export type LiquidMethod = 'pycnometer' | 'hydrometer'
/** Where the solid sample is: on the bench, on the balance, or in the water. */
export type Place = 'bench' | 'balance' | 'water'
export type BottleState = 'empty' | 'water' | 'liquid'

export const START_VOLUME = 50 // mL in the graduated cylinder

export interface DensityResult {
  sample: string
  method: string
  mass: number
  volume: number
  density: number
  actual: number
}

export function useDensityMeasurement() {
  const [mode, setModeState] = useState<Mode>('solid')
  const [solidId, setSolidId] = useState<SolidSample['id']>('stone')
  const [volumeMethod, setVolumeMethodState] = useState<VolumeMethod>('cylinder')
  const [pushUnder, setPushUnder] = useState(false)
  const [place, setPlace] = useState<Place>('bench')
  const [from, setFrom] = useState<Place>('bench')
  const [anim, setAnim] = useState(1)
  const [mass, setMass] = useState<number | null>(null)
  const [volume, setVolume] = useState<number | null>(null)
  const [liquidId, setLiquidId] = useState<LiquidSample['id']>('oil')
  const [liquidMethod, setLiquidMethod] = useState<LiquidMethod>('pycnometer')
  const [temperature, setTemperature] = useState(20)
  const [bottle, setBottle] = useState<BottleState>('empty')
  const [bottleMasses, setBottleMasses] = useState<Partial<Record<BottleState, number>>>({})
  const [results, setResults] = useState<DensityResult[]>([])

  const solid = solidById(solidId)
  const liquid = liquidById(liquidId)
  const rhoWater = waterDensity(temperature)
  const regular = !!solid.dims

  useSimLoop(
    useCallback((dt: number) => setAnim((a) => Math.min(1, a + Math.min(dt, 0.1) / 1.2)), []),
    anim < 1,
    30,
  )

  const moveTo = (p: Place) => {
    if (p === place) return
    setFrom(place)
    setPlace(p)
    setAnim(0)
  }

  const trueMass = massOf(solid)
  const balanceReading = place === 'balance' && anim >= 1 ? readInstrument(trueMass, BALANCE_RESOLUTION) : 0
  const levelAfter = cylinderReading(START_VOLUME, solid, rhoWater, pushUnder)
  /** Live level in the cylinder (or the catch cylinder for the overflow can), mL. */
  const inWater = place === 'water' ? anim : from === 'water' ? 1 - anim : 0
  const cylinderLevel =
    volumeMethod === 'overflow' ? (levelAfter - START_VOLUME) * (place === 'water' ? anim : 0) : START_VOLUME + (levelAfter - START_VOLUME) * inWater
  const dims = solid.dims?.map((d) => readInstrument(d, RULER_RESOLUTION)) as [number, number, number] | undefined

  const measuredDensity = mass !== null && volume !== null ? density(mass, volume) : null

  // Liquid
  const masses = pycnometerMasses(liquid, temperature)
  const bottleReading = readInstrument(masses[bottle], 0.01)
  const pycno =
    bottleMasses.empty !== undefined && bottleMasses.water !== undefined && bottleMasses.liquid !== undefined
      ? pycnometerDensity({ empty: bottleMasses.empty, water: bottleMasses.water, liquid: bottleMasses.liquid }, rhoWater)
      : null
  const rhoLiquid = liquidDensity(liquid, temperature)
  const hydroDepth = hydrometerDepth(rhoLiquid)
  const hydroReading = hydroDepth === null ? null : readInstrument(hydrometerScale(hydroDepth), 1)

  const resetSolid = () => {
    setPlace('bench')
    setFrom('bench')
    setAnim(1)
    setMass(null)
    setVolume(null)
  }

  return {
    mode,
    setMode: (m: Mode) => {
      setModeState(m)
      resetSolid()
    },
    solid,
    solidId,
    setSolid: (id: SolidSample['id']) => {
      setSolidId(id)
      if (!solidById(id).dims && volumeMethod === 'ruler') setVolumeMethodState('cylinder')
      resetSolid()
    },
    regular,
    volumeMethod,
    setVolumeMethod: (m: VolumeMethod) => {
      setVolumeMethodState(m)
      if (place === 'water') moveTo('bench')
      setVolume(null)
    },
    pushUnder,
    setPushUnder: (v: boolean) => {
      setPushUnder(v)
      if (place === 'water') setVolume(null)
    },
    place,
    from,
    anim,
    moving: anim < 1,
    putOnBalance: () => moveTo('balance'),
    lowerIntoWater: () => moveTo('water'),
    backToBench: () => moveTo('bench'),
    balanceReading,
    recordMass: () => setMass(balanceReading),
    cylinderLevel,
    /** Volume read from the instrument for the current method. */
    volumeReading:
      volumeMethod === 'ruler'
        ? dims
          ? blockVolume(...dims)
          : null
        : place === 'water' && anim >= 1
          ? volumeMethod === 'overflow'
            ? readInstrument(levelAfter - START_VOLUME, CYLINDER_RESOLUTION)
            : readInstrument(levelAfter, CYLINDER_RESOLUTION)
          : null,
    dims,
    recordVolume: (v: number) => setVolume(v),
    mass,
    volume,
    measuredDensity,
    trueDensity: solid.density,
    rhoWater,
    // liquids
    liquid,
    liquidId,
    setLiquid: (id: LiquidSample['id']) => {
      setLiquidId(id)
      setBottle('empty')
      setBottleMasses({})
    },
    liquidMethod,
    setLiquidMethod,
    temperature,
    setTemperature: (v: number) => {
      setTemperature(v)
      setBottleMasses({})
    },
    bottle,
    fillBottle: (b: BottleState) => setBottle(b),
    bottleReading,
    bottleMasses,
    weighBottle: () => setBottleMasses((m) => ({ ...m, [bottle]: bottleReading })),
    pycno,
    pycnometerVolume: PYCNOMETER.volume,
    rhoLiquid,
    hydroDepth,
    hydroReading,
    reset: () => {
      resetSolid()
      setBottle('empty')
      setBottleMasses({})
    },
    results,
    saveResult: (r: DensityResult) => setResults((rs) => [...rs, r].slice(-20)),
    clearResults: () => setResults([]),
  }
}

export type DensityController = ReturnType<typeof useDensityMeasurement>
