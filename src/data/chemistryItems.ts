import type { Ctx2D } from '../lib/chemistry/canvasSheet'
import { EQUIPMENT, type EquipmentId } from '../lib/chemistry/equipmentCatalog'
import { prettyFormula } from '../lib/chemistry/formula'
import {
  balance,
  deliveryTube,
  gasJarWith,
  gasSyringe,
  glassRod,
  matches,
  phMeter,
  pneumaticTrough,
  reagentBottle,
  retortStand,
  spatula,
  stopwatch,
  testTubeRack,
  tongs,
  tweezers,
  type BottleSpec,
} from '../lib/chemistry/itemDrawings'
import { EFFECT_IDS, EFFECTS, type EffectId } from '../lib/chemistry/reactionCatalog'
import type { SoundId } from '../lib/chemistry/soundSynth'
import { BLOCK_PX, displayFormula, SUBSTANCE_LIST, substanceFrames, type Substance, type SubstanceState } from '../lib/chemistry/substanceCatalog'
import type { Localized } from '../lib/chemistry/types'

/**
 * The Chemistry "Items" catalog: lab containers, reagent solutions, solid substances, tools,
 * reaction effects and gases that students browse and place on the workbench.
 *
 * Every picture is original EduLab artwork drawn in code (the same canvas drawings the 3D labs
 * use), so the catalog ships no third-party image, sprite or sound files. To show a real
 * photograph or licensed artwork for an item instead, put the file under `public/chemistry/` and
 * set the item's `image` to its URL (for example `/chemistry/container/beaker.png`); the drawing
 * is then only used as a fallback.
 */

export const CHEMISTRY_ITEM_CATEGORIES = ['container', 'solution', 'substance', 'tool', 'reaction', 'gas'] as const
export type ChemistryItemCategory = (typeof CHEMISTRY_ITEM_CATEGORIES)[number]

export interface ItemArt {
  /** Drawing size in px; the picture is scaled to fit its tile. */
  w: number
  h: number
  draw: (ctx: Ctx2D, w: number, h: number) => void
  /** Animated art (reaction effects): frame count and rate for the live preview. */
  frames?: { count: number; fps: number; draw: (ctx: Ctx2D, w: number, h: number, frame: number, frames: number) => void }
}

export interface Concentration {
  value: number
  unit: 'mol/L' | '%'
}

export interface ChemistryItem {
  id: string
  name: Localized
  category: ChemistryItemCategory
  /** Formula with subscripts, ready to display (e.g. "KMnO₄"). */
  formula?: string
  concentration?: Concentration
  /** Optional URL of a real picture; replaces the drawing when set. */
  image?: string
  /** Code-drawn picture (always present, used when `image` is missing or fails to load). */
  art: ItemArt
  /** Link back to the 3D lab catalogs this item comes from. */
  source?: { catalog: 'equipment'; id: EquipmentId } | { catalog: 'substance'; id: string } | { catalog: 'effect'; id: EffectId }
  /** Nominal capacity in mL, for vessels. */
  capacity?: number
  state?: SubstanceState
  /** g/mol, for substances with a fixed formula. */
  molarMass?: number
  sound?: SoundId
  /** Extra search terms (other names, the formula without subscripts…). */
  keywords?: string[]
}

// ---------------------------------------------------------------------------------------------
// Builders

const fromEquipment = (id: EquipmentId, category: ChemistryItemCategory, sound: SoundId = 'glass-clink'): ChemistryItem => {
  const eq = EQUIPMENT[id]
  return {
    id,
    name: eq.name,
    category,
    art: { ...eq.px, draw: eq.draw },
    source: { catalog: 'equipment', id },
    capacity: eq.capacity,
    sound,
  }
}

const substanceDraws = (() => {
  let cache: Map<string, ItemArt['draw']> | null = null
  return (frame: string) => {
    cache ??= new Map(substanceFrames().map((f) => [f.name, f.draw]))
    return cache.get(frame)!
  }
})()

const fromSubstance = (s: Substance): ChemistryItem => ({
  id: `substance-${s.id}`,
  name: s.name,
  category: 'substance',
  formula: displayFormula(s),
  art: { w: BLOCK_PX, h: BLOCK_PX, draw: (ctx, w, h) => substanceDraws(s.frame)(ctx, w, h) },
  source: { catalog: 'substance', id: s.id },
  state: s.state,
  molarMass: s.molarMass ?? undefined,
  sound: 'click',
  keywords: [s.formula],
})

/** Still frame shown on the card: the most characteristic moment of each effect. */
const STILL: Partial<Record<EffectId, number>> = { precipitate: 1, explode: 0.3, cloud: 0.6 }

const fromEffect = (id: EffectId): ChemistryItem => {
  const fx = EFFECTS[id]
  const still = Math.min(fx.frameCount - 1, Math.round((STILL[id] ?? 0.5) * (fx.frameCount - 1)))
  return {
    id: `effect-${id}`,
    name: fx.name,
    category: 'reaction',
    art: {
      ...fx.px,
      draw: (ctx, w, h) => fx.draw(ctx, w, h, still, fx.frameCount),
      frames: { count: fx.frameCount, fps: fx.fps, draw: fx.draw },
    },
    source: { catalog: 'effect', id },
    sound: fx.sound ?? undefined,
  }
}

const bottle = (
  id: string,
  name: Localized,
  formula: string,
  concentration: Concentration | undefined,
  spec: BottleSpec,
  keywords: string[] = [],
): ChemistryItem => {
  const pretty = prettyFormula(formula)
  return {
    id,
    name,
    category: 'solution',
    formula: pretty,
    concentration,
    state: 'aqueous',
    art: { w: 150, h: 230, draw: reagentBottle({ text: pretty, ...spec }) },
    sound: 'drip',
    keywords: [formula, ...keywords],
  }
}

const gas = (id: string, name: Localized, formula: string, tint: string | null, keywords: string[] = []): ChemistryItem => {
  const pretty = prettyFormula(formula)
  return {
    id,
    name,
    category: 'gas',
    formula: pretty,
    state: 'gas',
    art: { w: 140, h: 240, draw: gasJarWith(tint, pretty) },
    sound: 'whoosh',
    keywords: [formula, ...keywords],
  }
}

const drawn = (id: string, category: ChemistryItemCategory, name: Localized, w: number, h: number, draw: ItemArt['draw'], sound: SoundId = 'click'): ChemistryItem => ({
  id,
  name,
  category,
  art: { w, h, draw },
  sound,
})

const M = (value: number): Concentration => ({ value, unit: 'mol/L' })
const P = (value: number): Concentration => ({ value, unit: '%' })

// ---------------------------------------------------------------------------------------------
// Catalog

const CONTAINERS: ChemistryItem[] = [
  ...(
    [
      'beaker',
      'conical-flask-100',
      'conical-flask-250',
      'test-tube',
      'big-test-tube',
      'round-bottom-flask',
      'florence-flask',
      'distilling-flask',
      'volumetric-flask-50',
      'volumetric-flask-100',
      'volumetric-flask-250',
      'separating-funnel',
      'evaporating-dish',
      'crucible',
      'watch-glass',
      'u-tube',
    ] as const
  ).map((id) => fromEquipment(id, 'container')),
  {
    ...drawn('wide-mouth-bottle', 'container', { en: 'Wide-mouth bottle', uz: 'Keng ogʻizli shisha', ru: 'Широкогорлая склянка' }, 150, 230, reagentBottle({ wide: true }), 'glass-clink'),
    capacity: 250,
  },
  {
    ...drawn('narrow-mouth-bottle', 'container', { en: 'Narrow-mouth bottle', uz: 'Tor ogʻizli shisha', ru: 'Узкогорлая склянка' }, 150, 230, reagentBottle({}), 'glass-clink'),
    capacity: 250,
  },
  {
    ...drawn('dropping-bottle', 'container', { en: 'Dropping bottle', uz: 'Tomizgichli shisha', ru: 'Капельница (склянка)' }, 150, 230, reagentBottle({ dropper: true }), 'glass-clink'),
    capacity: 60,
  },
]

const SOLUTIONS: ChemistryItem[] = [
  bottle('hcl-solution', { en: 'Hydrochloric acid', uz: 'Xlorid kislota', ru: 'Соляная кислота' }, 'HCl', M(1), { fill: '#e8f1fb', dropper: true }),
  bottle('h2so4-solution', { en: 'Sulfuric acid (dilute)', uz: 'Sulfat kislota (suyultirilgan)', ru: 'Серная кислота (разбавленная)' }, 'H2SO4', M(0.5), { fill: '#eef2f6' }),
  bottle('hno3-solution', { en: 'Nitric acid', uz: 'Nitrat kislota', ru: 'Азотная кислота' }, 'HNO3', M(1), { fill: '#f6efc9', amber: true }),
  bottle('ch3cooh-solution', { en: 'Acetic acid', uz: 'Sirka kislota', ru: 'Уксусная кислота' }, 'CH3COOH', M(1), { fill: '#f1f3f5' }, ['vinegar']),
  bottle('naoh-solution', { en: 'Sodium hydroxide solution', uz: 'Natriy gidroksid eritmasi', ru: 'Раствор гидроксида натрия' }, 'NaOH', M(1), { fill: '#f4f6f8', dropper: true }),
  bottle('limewater', { en: 'Limewater', uz: 'Ohakli suv', ru: 'Известковая вода' }, 'Ca(OH)2', M(0.02), { fill: '#f3f4ef' }),
  bottle('ammonia-solution', { en: 'Ammonia solution', uz: 'Ammiak eritmasi', ru: 'Раствор аммиака' }, 'NH3·H2O', M(1), { fill: '#f0f5f9' }),
  bottle('na2co3-solution', { en: 'Sodium carbonate solution', uz: 'Natriy karbonat eritmasi', ru: 'Раствор карбоната натрия' }, 'Na2CO3', M(1), { fill: '#f4f6f6' }),
  bottle('nacl-solution', { en: 'Sodium chloride solution', uz: 'Natriy xlorid eritmasi', ru: 'Раствор хлорида натрия' }, 'NaCl', M(1), { fill: '#eef3f8' }, ['brine', 'salt']),
  bottle('cuso4-solution', { en: 'Copper(II) sulfate solution', uz: 'Mis(II) sulfat eritmasi', ru: 'Раствор сульфата меди(II)' }, 'CuSO4', M(0.5), { fill: '#3b86d1' }),
  bottle('fecl3-solution', { en: 'Iron(III) chloride solution', uz: 'Temir(III) xlorid eritmasi', ru: 'Раствор хлорида железа(III)' }, 'FeCl3', M(0.1), { fill: '#c98a2a' }),
  bottle('agno3-solution', { en: 'Silver nitrate solution', uz: 'Kumush nitrat eritmasi', ru: 'Раствор нитрата серебра' }, 'AgNO3', M(0.1), { fill: '#f2f2f2', amber: true, dropper: true }),
  bottle('bacl2-solution', { en: 'Barium chloride solution', uz: 'Bariy xlorid eritmasi', ru: 'Раствор хлорида бария' }, 'BaCl2', M(0.1), { fill: '#f1f3f6', dropper: true }),
  bottle('ki-solution', { en: 'Potassium iodide solution', uz: 'Kaliy yodid eritmasi', ru: 'Раствор иодида калия' }, 'KI', M(0.1), { fill: '#f6f4ea', dropper: true }),
  bottle('kmno4-solution', { en: 'Potassium permanganate solution', uz: 'Kaliy permanganat eritmasi', ru: 'Раствор перманганата калия' }, 'KMnO4', M(0.01), { fill: '#8e1f9e', amber: true }),
  bottle('h2o2-solution', { en: 'Hydrogen peroxide', uz: 'Vodorod peroksid', ru: 'Пероксид водорода' }, 'H2O2', P(3), { fill: '#eef4fa', amber: true }),
  bottle('phenolphthalein-solution', { en: 'Phenolphthalein indicator', uz: 'Fenolftalein indikatori', ru: 'Индикатор фенолфталеин' }, 'C20H14O4', P(1), { fill: '#f7f6f1', dropper: true }, ['indicator']),
  bottle('methyl-orange', { en: 'Methyl orange indicator', uz: 'Metiloranj indikatori', ru: 'Индикатор метиловый оранжевый' }, 'C14H14N3NaO3S', P(0.1), { fill: '#f08a24', dropper: true }, ['indicator']),
  bottle('litmus-solution', { en: 'Litmus solution', uz: 'Lakmus eritmasi', ru: 'Раствор лакмуса' }, 'Litmus', undefined, { fill: '#7b3fa0', dropper: true }, ['indicator']),
  bottle('universal-indicator', { en: 'Universal indicator', uz: 'Universal indikator', ru: 'Универсальный индикатор' }, 'pH 1–14', undefined, { fill: '#3f9b4a', dropper: true }, ['indicator']),
  bottle('ethanol', { en: 'Ethanol', uz: 'Etanol', ru: 'Этанол' }, 'C2H5OH', P(95), { fill: '#f3f6fa' }, ['alcohol', 'spirit']),
  bottle('distilled-water', { en: 'Distilled water', uz: 'Distillangan suv', ru: 'Дистиллированная вода' }, 'H2O', undefined, { fill: '#cfe3ff' }),
]

const SUBSTANCES: ChemistryItem[] = SUBSTANCE_LIST.filter((s) => s.state === 'solid').map(fromSubstance)

const TOOLS: ChemistryItem[] = [
  fromEquipment('dropper', 'tool'),
  fromEquipment('burette', 'tool'),
  fromEquipment('measuring-cylinder-10', 'tool'),
  fromEquipment('measuring-cylinder-50', 'tool'),
  fromEquipment('measuring-cylinder-100', 'tool'),
  fromEquipment('funnel', 'tool'),
  fromEquipment('thermometer', 'tool'),
  fromEquipment('alcohol-lamp', 'tool', 'match'),
  fromEquipment('bunsen-burner', 'tool', 'whoosh'),
  fromEquipment('tripod', 'tool', 'click'),
  fromEquipment('wire-gauze', 'tool', 'click'),
  fromEquipment('mortar-and-pestle', 'tool', 'click'),
  fromEquipment('spot-plate', 'tool', 'click'),
  fromEquipment('nichrome-wire', 'tool', 'click'),
  fromEquipment('battery', 'tool', 'hum'),
  drawn('retort-stand', 'tool', { en: 'Retort stand with clamp', uz: 'Qisqichli shtativ', ru: 'Штатив с лапкой' }, 200, 320, retortStand),
  drawn('test-tube-rack', 'tool', { en: 'Test-tube rack', uz: 'Probirka tagligi', ru: 'Штатив для пробирок' }, 260, 200, testTubeRack, 'glass-clink'),
  drawn('glass-rod', 'tool', { en: 'Glass stirring rod', uz: 'Shisha tayoqcha', ru: 'Стеклянная палочка' }, 30, 300, glassRod, 'glass-clink'),
  drawn('spatula', 'tool', { en: 'Spatula', uz: 'Shpatel', ru: 'Шпатель' }, 60, 260, spatula),
  drawn('crucible-tongs', 'tool', { en: 'Crucible tongs', uz: 'Tigel qisqichi', ru: 'Тигельные щипцы' }, 100, 280, tongs),
  drawn('tweezers', 'tool', { en: 'Tweezers', uz: 'Pinset', ru: 'Пинцет' }, 60, 240, tweezers),
  drawn('matches', 'tool', { en: 'Matches', uz: 'Gugurt', ru: 'Спички' }, 220, 150, matches, 'match'),
  drawn('stopwatch', 'tool', { en: 'Stopwatch', uz: 'Sekundomer', ru: 'Секундомер' }, 180, 210, stopwatch, 'beep'),
  drawn('balance', 'tool', { en: 'Electronic balance', uz: 'Elektron tarozi', ru: 'Электронные весы' }, 240, 170, balance, 'beep'),
  drawn('ph-meter', 'tool', { en: 'pH meter', uz: 'pH-metr', ru: 'pH-метр' }, 120, 280, phMeter, 'beep'),
]

const REACTIONS: ChemistryItem[] = EFFECT_IDS.map(fromEffect)

const GASES: ChemistryItem[] = [
  fromEquipment('gas-jar', 'gas'),
  drawn('pneumatic-trough', 'gas', { en: 'Pneumatic trough', uz: 'Pnevmatik vanna', ru: 'Пневматическая ванна' }, 260, 160, pneumaticTrough, 'bubble'),
  drawn('delivery-tube', 'gas', { en: 'Delivery tube with bung', uz: 'Probkali gaz oʻtkazgich nay', ru: 'Газоотводная трубка с пробкой' }, 220, 200, deliveryTube, 'glass-clink'),
  drawn('gas-syringe', 'gas', { en: 'Gas syringe', uz: 'Gaz shprisi', ru: 'Газовый шприц' }, 300, 90, gasSyringe, 'click'),
  gas('gas-h2', { en: 'Hydrogen', uz: 'Vodorod', ru: 'Водород' }, 'H2', null),
  gas('gas-o2', { en: 'Oxygen', uz: 'Kislorod', ru: 'Кислород' }, 'O2', null),
  gas('gas-n2', { en: 'Nitrogen', uz: 'Azot', ru: 'Азот' }, 'N2', null),
  gas('gas-co2', { en: 'Carbon dioxide', uz: 'Karbonat angidrid', ru: 'Углекислый газ' }, 'CO2', null),
  gas('gas-cl2', { en: 'Chlorine', uz: 'Xlor', ru: 'Хлор' }, 'Cl2', 'rgba(190, 210, 70, 0.75)'),
  gas('gas-no2', { en: 'Nitrogen dioxide', uz: 'Azot dioksid', ru: 'Диоксид азота' }, 'NO2', 'rgba(170, 80, 30, 0.75)'),
  gas('gas-nh3', { en: 'Ammonia', uz: 'Ammiak', ru: 'Аммиак' }, 'NH3', null),
  gas('gas-so2', { en: 'Sulfur dioxide', uz: 'Oltingugurt dioksid', ru: 'Диоксид серы' }, 'SO2', null),
  gas('gas-ch4', { en: 'Methane', uz: 'Metan', ru: 'Метан' }, 'CH4', null),
  gas('gas-hcl', { en: 'Hydrogen chloride', uz: 'Vodorod xlorid', ru: 'Хлороводород' }, 'HCl', null),
  gas('gas-i2-vapour', { en: 'Iodine vapour', uz: 'Yod bugʻi', ru: 'Пары иода' }, 'I2', 'rgba(140, 60, 170, 0.7)'),
]

export const CHEMISTRY_ITEMS: ChemistryItem[] = [...CONTAINERS, ...SOLUTIONS, ...SUBSTANCES, ...TOOLS, ...REACTIONS, ...GASES]

export const CHEMISTRY_ITEM_BY_ID: Record<string, ChemistryItem> = Object.fromEntries(CHEMISTRY_ITEMS.map((i) => [i.id, i]))

export const itemsInCategory = (category: ChemistryItemCategory | 'all') =>
  category === 'all' ? CHEMISTRY_ITEMS : CHEMISTRY_ITEMS.filter((i) => i.category === category)

const SUBSCRIPTS: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', 'ₙ': 'n' }

/** Lower case, subscripts turned into plain digits, so "kmno4" finds "KMnO₄". */
export const normalizeSearch = (text: string) =>
  text
    .replace(/[₀-₉ₙ]/g, (c) => SUBSCRIPTS[c] ?? c)
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Filters the catalog by category and a search string matched against the item's name in every
 * language, its formula (with or without subscripts) and its keywords.
 */
export function filterItems(items: readonly ChemistryItem[], category: ChemistryItemCategory | 'all', query: string): ChemistryItem[] {
  const needle = normalizeSearch(query)
  return items.filter((item) => {
    if (category !== 'all' && item.category !== category) return false
    if (!needle) return true
    const hay = normalizeSearch([item.name.en, item.name.uz, item.name.ru, item.formula ?? '', ...(item.keywords ?? [])].join(' | '))
    return needle.split(' ').every((word) => hay.includes(word))
  })
}
