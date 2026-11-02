import { describe, expect, it } from 'vitest'
import { layoutSheet } from './canvasSheet'
import { EQUIPMENT, EQUIPMENT_IDS, equipmentByType, equipmentFrames } from './equipmentCatalog'
import { molarMass, parseFormula, prettyFormula } from './formula'
import { EFFECT_IDS, EFFECTS, effectsByKind } from './reactionCatalog'
import { renderSound, SOUND_IDS, SOUNDS } from './soundSynth'
import { displayFormula, elements, SUBSTANCE_LIST, SUBSTANCES, substanceByFormula, substanceFrames } from './substanceCatalog'
import { pick } from './types'

describe('formula tools', () => {
  it('parses hydrates, brackets and polymers', () => {
    expect(parseFormula('CuSO4·5H2O')).toEqual({ Cu: 1, S: 1, O: 9, H: 10 })
    expect(parseFormula('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 })
    expect(parseFormula('(C6H10O5)n')).toEqual({ C: 6, H: 10, O: 5 })
    expect(() => parseFormula('Xx2')).toThrow(/Unknown element/)
    expect(() => parseFormula('Ca(OH2')).toThrow(/Unbalanced/)
  })
  it('computes molar masses', () => {
    expect(molarMass('H2O')).toBeCloseTo(18.015, 2)
    expect(molarMass('NaCl')).toBeCloseTo(58.44, 2)
    expect(molarMass('CuSO4·5H2O')).toBeCloseTo(249.69, 1)
    expect(molarMass('C9H8O4')).toBeCloseTo(180.16, 1)
  })
  it('formats subscripts', () => {
    expect(prettyFormula('CuSO4·5H2O')).toBe('CuSO₄·5H₂O')
    expect(prettyFormula('Ca(OH)2')).toBe('Ca(OH)₂')
  })
})

describe('substance catalog', () => {
  it('has at least 20 well-formed substances with unique ids and frames', () => {
    expect(SUBSTANCE_LIST.length).toBeGreaterThanOrEqual(20)
    expect(new Set(SUBSTANCE_LIST.map((s) => s.id)).size).toBe(SUBSTANCE_LIST.length)
    expect(new Set(SUBSTANCE_LIST.map((s) => s.frame)).size).toBe(SUBSTANCE_LIST.length)
    for (const s of SUBSTANCE_LIST) {
      expect(s.color, s.id).toMatch(/^#[0-9a-f]{6}$/i)
      for (const l of ['en', 'uz', 'ru'] as const) expect(s.name[l].trim(), `${s.id} ${l}`).not.toBe('')
      if (s.category !== 'mixture') expect(s.molarMass, s.id).toBeGreaterThan(0)
    }
  })
  it('classifies elements correctly and agrees with their atomic masses', () => {
    for (const s of elements()) {
      const e = s.element!
      expect(['metal', 'nonmetal']).toContain(s.category)
      const atoms = parseFormula(s.formula)
      expect(Object.keys(atoms)).toHaveLength(1)
      expect(s.molarMass! / Object.values(atoms)[0]).toBeCloseTo(e.atomicMass, 2)
    }
    expect(SUBSTANCES.na.element).toMatchObject({ atomicNumber: 11, group: 1, period: 3 })
    expect(SUBSTANCES.na.category).toBe('metal')
    expect(SUBSTANCES.s.category).toBe('nonmetal')
    expect(SUBSTANCES.h2o.state).toBe('liquid')
    expect(SUBSTANCES.h2.state).toBe('gas')
    expect(substanceByFormula('CuSO4·5H2O')?.id).toBe('cuso4-5h2o')
    expect(displayFormula(SUBSTANCES.paraffin)).toBe('CₙH₂ₙ₊₂')
  })
  it('lays out one sprite frame per substance', () => {
    const layout = layoutSheet(substanceFrames(), 1024)
    expect(layout.frames).toHaveLength(SUBSTANCE_LIST.length)
  })
})

describe('equipment catalog', () => {
  it('describes every item and lays it out on one sheet', () => {
    expect(EQUIPMENT_IDS.length).toBeGreaterThanOrEqual(25)
    for (const id of EQUIPMENT_IDS) {
      const e = EQUIPMENT[id]
      expect(e.id).toBe(id)
      expect(e.scale).toBeGreaterThan(0)
      expect(['container', 'heater', 'tool', 'glass']).toContain(e.type)
    }
    for (const t of ['container', 'heater', 'tool', 'glass'] as const) expect(equipmentByType(t).length).toBeGreaterThan(0)
    const layout = layoutSheet(equipmentFrames())
    expect(layout.meta.width).toBeLessThanOrEqual(2048)
    expect(layout.meta.height).toBeLessThanOrEqual(2048)
    expect(pick(EQUIPMENT.beaker.name, 'ru-RU')).toBe('Химический стакан')
    expect(pick(EQUIPMENT.beaker.name, 'fr')).toBe('Beaker')
  })
})

describe('reaction effects', () => {
  it('covers the reaction kinds with sensible timing and sounds', () => {
    for (const k of ['fire', 'smoke', 'bubble', 'precipitate', 'explode', 'vapor', 'spark'] as const) expect(effectsByKind(k).length, k).toBeGreaterThan(0)
    expect(EFFECT_IDS.length).toBeGreaterThanOrEqual(10)
    const withSound = EFFECT_IDS.filter((id) => EFFECTS[id].sound)
    expect(new Set(withSound.map((id) => EFFECTS[id].sound)).size).toBeGreaterThanOrEqual(5)
    for (const id of EFFECT_IDS) {
      const e = EFFECTS[id]
      expect(e.duration).toBeCloseTo(e.frameCount / e.fps)
      expect(layoutSheet(Array.from({ length: e.frameCount }, (_, i) => ({ name: `${id}/${i}`, ...e.px })), 1024).meta.width).toBeLessThanOrEqual(1024)
    }
  })
})

describe('synthesised sounds', () => {
  it.each(SOUND_IDS)('%s renders finite, normalised samples', (id) => {
    const sr = 22050
    const x = renderSound(id, sr)
    const def = SOUNDS[id]
    // Loops lose their cross-fade tail; one-shots are exactly as long as declared.
    if (def.loop) expect(x.length).toBeLessThanOrEqual(Math.round(def.duration * sr))
    else expect(x.length).toBe(Math.round(def.duration * sr))
    let peak = 0
    for (const v of x) {
      expect(Number.isFinite(v)).toBe(true)
      peak = Math.max(peak, Math.abs(v))
    }
    expect(peak).toBeGreaterThan(0.5)
    expect(peak).toBeLessThanOrEqual(0.9 + 1e-6)
  })
  it('is deterministic', () => {
    expect(renderSound('fizz', 8000)).toEqual(renderSound('fizz', 8000))
  })
})
