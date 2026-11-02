import { buildCanvasSheet, cachedSheet, type Ctx2D, type FrameSpec } from './canvasSheet'
import { label, roundRect } from './draw'
import { molarMass, prettyFormula } from './formula'
import { frameTexture, type SpriteSheet } from './spriteLoader'
import type { Localized } from './types'

/**
 * Chemical substances used across the chemistry labs, with periodic-table data for the elements.
 * Each substance is shown as a reagent "block" sprite: an original EduLab drawing of a labelled
 * sample in the substance's representative colour.
 */

export type SubstanceCategory = 'metal' | 'nonmetal' | 'compound' | 'mixture'
export type SubstanceState = 'solid' | 'liquid' | 'gas' | 'aqueous'

export interface ElementData {
  atomicNumber: number
  /** Standard atomic weight, g/mol. */
  atomicMass: number
  group: number
  period: number
  /** °C at 1 atm. */
  meltingPoint: number
  /** g/cm³ at 20 °C. */
  density: number
}

export interface Substance {
  id: string
  name: Localized
  /** Plain formula used for calculations, e.g. "CuSO4·5H2O". */
  formula: string
  category: SubstanceCategory
  state: SubstanceState
  /** Representative colour of the sample. */
  color: string
  /** g/mol; null for mixtures without a fixed formula. */
  molarMass: number | null
  element?: ElementData
  /** Frame name in the substance sprite sheet. */
  frame: string
}

type Def = Omit<Substance, 'molarMass' | 'frame'> & { molarMass?: number | null }

const S = (d: Def): Substance => ({
  ...d,
  molarMass: d.molarMass === undefined ? +molarMass(d.formula).toFixed(3) : d.molarMass,
  frame: `block-${d.id}`,
})

const el = (atomicNumber: number, atomicMass: number, group: number, period: number, meltingPoint: number, density: number): ElementData => ({
  atomicNumber,
  atomicMass,
  group,
  period,
  meltingPoint,
  density,
})

export const SUBSTANCE_LIST: Substance[] = [
  // Metals
  S({ id: 'li', name: { en: 'Lithium', uz: 'Litiy', ru: 'Литий' }, formula: 'Li', category: 'metal', state: 'solid', color: '#c9ced6', element: el(3, 6.94, 1, 2, 180.5, 0.534) }),
  S({ id: 'na', name: { en: 'Sodium', uz: 'Natriy', ru: 'Натрий' }, formula: 'Na', category: 'metal', state: 'solid', color: '#d3d6db', element: el(11, 22.99, 1, 3, 97.8, 0.968) }),
  S({ id: 'k', name: { en: 'Potassium', uz: 'Kaliy', ru: 'Калий' }, formula: 'K', category: 'metal', state: 'solid', color: '#cfcad8', element: el(19, 39.098, 1, 4, 63.5, 0.862) }),
  S({ id: 'mg', name: { en: 'Magnesium', uz: 'Magniy', ru: 'Магний' }, formula: 'Mg', category: 'metal', state: 'solid', color: '#c4c8cc', element: el(12, 24.305, 2, 3, 650, 1.738) }),
  S({ id: 'ca', name: { en: 'Calcium', uz: 'Kalsiy', ru: 'Кальций' }, formula: 'Ca', category: 'metal', state: 'solid', color: '#d8d4cb', element: el(20, 40.078, 2, 4, 842, 1.55) }),
  S({ id: 'al', name: { en: 'Aluminium', uz: 'Alyuminiy', ru: 'Алюминий' }, formula: 'Al', category: 'metal', state: 'solid', color: '#d0d5db', element: el(13, 26.982, 13, 3, 660.3, 2.7) }),
  S({ id: 'fe', name: { en: 'Iron', uz: 'Temir', ru: 'Железо' }, formula: 'Fe', category: 'metal', state: 'solid', color: '#8a8d91', element: el(26, 55.845, 8, 4, 1538, 7.874) }),
  S({ id: 'cu', name: { en: 'Copper', uz: 'Mis', ru: 'Медь' }, formula: 'Cu', category: 'metal', state: 'solid', color: '#b87333', element: el(29, 63.546, 11, 4, 1084.6, 8.96) }),
  S({ id: 'zn', name: { en: 'Zinc', uz: 'Rux', ru: 'Цинк' }, formula: 'Zn', category: 'metal', state: 'solid', color: '#b9c0c7', element: el(30, 65.38, 12, 4, 419.5, 7.14) }),
  // Non-metals
  S({ id: 'c', name: { en: 'Carbon (graphite)', uz: 'Uglerod (grafit)', ru: 'Углерод (графит)' }, formula: 'C', category: 'nonmetal', state: 'solid', color: '#2f3033', element: el(6, 12.011, 14, 2, 3642, 2.267) }),
  S({ id: 'p4', name: { en: 'White phosphorus', uz: 'Oq fosfor', ru: 'Белый фосфор' }, formula: 'P4', category: 'nonmetal', state: 'solid', color: '#f1ecc8', element: el(15, 30.974, 15, 3, 44.1, 1.823) }),
  S({ id: 's', name: { en: 'Sulfur', uz: 'Oltingugurt', ru: 'Сера' }, formula: 'S', category: 'nonmetal', state: 'solid', color: '#f2d23c', element: el(16, 32.06, 16, 3, 115.2, 2.07) }),
  S({ id: 'h2', name: { en: 'Hydrogen', uz: 'Vodorod', ru: 'Водород' }, formula: 'H2', category: 'nonmetal', state: 'gas', color: '#e9f1ff', element: el(1, 1.008, 1, 1, -259.2, 0.00008988) }),
  S({ id: 'o2', name: { en: 'Oxygen', uz: 'Kislorod', ru: 'Кислород' }, formula: 'O2', category: 'nonmetal', state: 'gas', color: '#dceaff', element: el(8, 15.999, 16, 2, -218.8, 0.001429) }),
  // Compounds
  S({ id: 'h2o', name: { en: 'Water', uz: 'Suv', ru: 'Вода' }, formula: 'H2O', category: 'compound', state: 'liquid', color: '#cfe3ff' }),
  S({ id: 'hcl', name: { en: 'Hydrochloric acid', uz: 'Xlorid kislota', ru: 'Соляная кислота' }, formula: 'HCl', category: 'compound', state: 'aqueous', color: '#eef4fb' }),
  S({ id: 'h2so4', name: { en: 'Sulfuric acid (dilute)', uz: 'Sulfat kislota (suyultirilgan)', ru: 'Серная кислота (разбавленная)' }, formula: 'H2SO4', category: 'compound', state: 'aqueous', color: '#eef2f6' }),
  S({ id: 'naoh', name: { en: 'Sodium hydroxide', uz: 'Natriy gidroksid', ru: 'Гидроксид натрия' }, formula: 'NaOH', category: 'compound', state: 'aqueous', color: '#f4f6f8' }),
  S({ id: 'nacl', name: { en: 'Sodium chloride', uz: 'Natriy xlorid', ru: 'Хлорид натрия' }, formula: 'NaCl', category: 'compound', state: 'solid', color: '#f7f7f7' }),
  S({ id: 'kcl', name: { en: 'Potassium chloride', uz: 'Kaliy xlorid', ru: 'Хлорид калия' }, formula: 'KCl', category: 'compound', state: 'solid', color: '#f3f3f5' }),
  S({ id: 'cacl2', name: { en: 'Calcium chloride', uz: 'Kalsiy xlorid', ru: 'Хлорид кальция' }, formula: 'CaCl2', category: 'compound', state: 'solid', color: '#f1f0ec' }),
  S({ id: 'bacl2', name: { en: 'Barium chloride', uz: 'Bariy xlorid', ru: 'Хлорид бария' }, formula: 'BaCl2', category: 'compound', state: 'solid', color: '#f4f4f2' }),
  S({ id: 'srcl2', name: { en: 'Strontium chloride', uz: 'Stronsiy xlorid', ru: 'Хлорид стронция' }, formula: 'SrCl2', category: 'compound', state: 'solid', color: '#f5f3f3' }),
  S({ id: 'cucl2', name: { en: 'Copper(II) chloride', uz: 'Mis(II) xlorid', ru: 'Хлорид меди(II)' }, formula: 'CuCl2', category: 'compound', state: 'solid', color: '#3fa9a1' }),
  S({ id: 'cuso4-5h2o', name: { en: 'Copper(II) sulfate pentahydrate', uz: 'Mis(II) sulfat pentagidrat', ru: 'Пентагидрат сульфата меди(II)' }, formula: 'CuSO4·5H2O', category: 'compound', state: 'solid', color: '#2f74c0' }),
  S({ id: 'caco3', name: { en: 'Calcium carbonate', uz: 'Kalsiy karbonat', ru: 'Карбонат кальция' }, formula: 'CaCO3', category: 'compound', state: 'solid', color: '#f2efe8' }),
  S({ id: 'na2so4', name: { en: 'Sodium sulfate', uz: 'Natriy sulfat', ru: 'Сульфат натрия' }, formula: 'Na2SO4', category: 'compound', state: 'solid', color: '#f6f6f4' }),
  S({ id: 'c6h8o6', name: { en: 'Ascorbic acid (vitamin C)', uz: 'Askorbin kislota (C vitamini)', ru: 'Аскорбиновая кислота (витамин C)' }, formula: 'C6H8O6', category: 'compound', state: 'solid', color: '#fbf6e4' }),
  S({ id: 'c9h8o4', name: { en: 'Aspirin (acetylsalicylic acid)', uz: 'Aspirin (atsetilsalitsil kislota)', ru: 'Аспирин (ацетилсалициловая кислота)' }, formula: 'C9H8O4', category: 'compound', state: 'solid', color: '#fafafa' }),
  S({ id: 'phenolphthalein', name: { en: 'Phenolphthalein', uz: 'Fenolftalein', ru: 'Фенолфталеин' }, formula: 'C20H14O4', category: 'compound', state: 'solid', color: '#fbfaf5' }),
  // Mixtures and materials
  S({ id: 'starch', name: { en: 'Starch', uz: 'Kraxmal', ru: 'Крахмал' }, formula: '(C6H10O5)n', category: 'mixture', state: 'solid', color: '#f7f5ee' }),
  S({ id: 'paraffin', name: { en: 'Paraffin wax', uz: 'Parafin', ru: 'Парафин' }, formula: 'CnH2n+2', category: 'mixture', state: 'solid', color: '#f3eedb', molarMass: null }),
  S({ id: 'filter-paper', name: { en: 'Filter paper', uz: 'Filtr qogʻoz', ru: 'Фильтровальная бумага' }, formula: '(C6H10O5)n', category: 'mixture', state: 'solid', color: '#fdfdfb' }),
]

export const SUBSTANCES: Record<string, Substance> = Object.fromEntries(SUBSTANCE_LIST.map((s) => [s.id, s]))

/** Look up by formula as written in the catalog ("NaCl", "CuSO4·5H2O"). */
export const substanceByFormula = (formula: string) => SUBSTANCE_LIST.find((s) => s.formula === formula)

export const elements = () => SUBSTANCE_LIST.filter((s) => s.element).sort((a, b) => a.element!.atomicNumber - b.element!.atomicNumber)

/** Formula for display, with subscripts. */
export const displayFormula = (s: Substance) => (s.formula === 'CnH2n+2' ? 'CₙH₂ₙ₊₂' : prettyFormula(s.formula))

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

export const BLOCK_PX = 128

function drawBlock(s: Substance) {
  return (ctx: Ctx2D, w: number, h: number) => {
    const pad = w * 0.06
    // Sample: a block for solids, a filled vial for liquids and solutions, a faint cloud for gases.
    if (s.state === 'solid') {
      const g = ctx.createLinearGradient(0, pad, 0, h - pad)
      g.addColorStop(0, s.color)
      g.addColorStop(1, shade(s.color, -0.25))
      ctx.fillStyle = g
      roundRect(ctx, pad, pad, w - 2 * pad, h - 2 * pad, w * 0.14)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      roundRect(ctx, pad * 2, pad * 1.6, w - 4 * pad, h * 0.14, w * 0.06)
      ctx.fill()
    } else {
      ctx.fillStyle = s.state === 'gas' ? 'rgba(220,235,255,0.35)' : shade(s.color, -0.05)
      roundRect(ctx, pad, pad, w - 2 * pad, h - 2 * pad, w * 0.2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(205,225,255,0.95)'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    const dark = s.state === 'solid' ? luminance(s.color) < 0.55 : false
    label(ctx, displayFormula(s), w / 2, h / 2, w * 0.3, dark ? '#ffffff' : '#1d2433', w - 4 * pad)
  }
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.round(Math.max(0, Math.min(255, amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`
}

export const substanceFrames = (): FrameSpec[] => SUBSTANCE_LIST.map((s) => ({ name: s.frame, w: BLOCK_PX, h: BLOCK_PX, draw: drawBlock(s) }))

/** The substance block sprite sheet, drawn on first use. Browser only. */
export const substanceSheet = (): SpriteSheet => cachedSheet('substances', () => buildCanvasSheet(substanceFrames(), 1024))

export function getSubstanceTexture(id: string) {
  const s = SUBSTANCES[id]
  if (!s) throw new Error(`Unknown substance "${id}"`)
  return frameTexture(substanceSheet(), s.frame)
}
