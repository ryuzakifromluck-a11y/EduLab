/**
 * Pure hypothesis-stage logic: validating a student's hypothesis, testing it
 * against what happened in the run (or against the model), and folding the
 * outcome into a stored record. No React, storage or engine imports here, so
 * it can be unit-tested and shared with the accounts API (`server/app.ts`).
 *
 * A hypothesis has three parts, matching the three questions the student answers:
 *   1. What will you do?            → `variable` + `change` (+ optional `plan` text)
 *   2. What result do you expect?   → `outcome` + `expected` (+ `prediction` text)
 *   3. Which values will change?    → `affected` (outcome ids)
 */

import { sanitizeSettings, type ProgressSettings } from './progressModel.ts'

export type Direction = 'increase' | 'decrease' | 'same'
export type Change = 'increase' | 'decrease'
export type Verdict = 'confirmed' | 'partly' | 'refuted'
export type SelfAssessment = 'yes' | 'partly' | 'no'

export const DIRECTIONS: readonly Direction[] = ['increase', 'decrease', 'same']
export const CHANGES: readonly Change[] = ['increase', 'decrease']
export const SELF_ASSESSMENTS: readonly SelfAssessment[] = ['yes', 'partly', 'no']
export const VERDICTS: readonly Verdict[] = ['confirmed', 'partly', 'refuted']

/** Relative change below which a value counts as "stayed the same". */
export const SAME_TOLERANCE = 0.01
/** Share of a variable's range used when the model has to make the change for the student. */
export const MODEL_STEP = 0.25
export const MAX_TEXT = 500
export const MIN_PREDICTION = 3

/** An input the student can change. `id` matches the key in the experiment's progress settings. */
export interface HypothesisVariable {
  id: string
  /** i18n key of the label (usually the experiment's own slider label). */
  labelKey: string
  unit: string
  min: number
  max: number
  /** Decimals used when showing a value. */
  digits: number
}

/** A value the student can make a prediction about. */
export interface HypothesisOutcome {
  id: string
  labelKey: string
  unit: string
  digits: number
  /** Relative change below which this value counts as "stayed the same" (default `SAME_TOLERANCE`). */
  tolerance?: number
}

/** Per-experiment description used to test hypotheses. `evaluate` must be pure. */
export interface HypothesisSpec {
  experimentId: string
  variables: HypothesisVariable[]
  outcomes: HypothesisOutcome[]
  /** Values used for any setting missing from a run. */
  defaults: ProgressSettings
  /** Computes every outcome for the given settings. Non-finite values (e.g. "never") are allowed. */
  evaluate: (settings: ProgressSettings) => Record<string, number>
}

export interface HypothesisDraft {
  variable: string
  change: Change
  plan: string
  outcome: string
  expected: Direction
  prediction: string
  affected: string[]
}

export interface OutcomeChange {
  id: string
  /** `null` stands for "never / infinite" (JSON has no Infinity). */
  from: number | null
  to: number | null
  direction: Direction
}

export interface HypothesisComparison {
  variable: string
  from: number
  to: number
  /** `run`: the student changed the variable; `model`: EduLab made the planned change with the model. */
  source: 'run' | 'model'
  /** Other variables the student also changed during the run (kept fixed for the comparison). */
  confounded: string[]
  outcomes: OutcomeChange[]
  predictionCorrect: boolean
  /** Readings whose "will change / won't change" choice matched what happened. */
  affectedCorrect: number
  affectedTotal: number
  verdict: Verdict
}

export interface HypothesisResult extends HypothesisComparison {
  selfAssessment: SelfAssessment
  reflection: string
  comparedAt: string
}

export interface HypothesisRecord {
  experimentId: string
  draft: HypothesisDraft
  /** Settings when the hypothesis was saved, i.e. the start of the run. */
  baseline: ProgressSettings
  createdAt: string
  updatedAt: string
  /** Hypotheses tested for this experiment so far, and how many were confirmed. */
  tested: number
  confirmed: number
  /** The latest comparison; `null` while the current hypothesis has not been tested yet. */
  result: HypothesisResult | null
}

/** A draft as typed in the form: nothing is chosen for the student, so the choices may still be empty. */
export type DraftInput = Omit<HypothesisDraft, 'change' | 'expected'> & { change: Change | ''; expected: Direction | '' }

export const emptyDraft = (): DraftInput => ({
  variable: '',
  change: '',
  plan: '',
  outcome: '',
  expected: '',
  prediction: '',
  affected: [],
})

export type DraftField = 'variable' | 'change' | 'outcome' | 'expected' | 'prediction' | 'affected'

/** Returns the fields that need attention, in form order; empty when the draft can be saved. */
export function validateDraft(spec: HypothesisSpec, d: DraftInput): DraftField[] {
  const errors: DraftField[] = []
  if (!spec.variables.some((v) => v.id === d.variable)) errors.push('variable')
  if (!(CHANGES as readonly string[]).includes(d.change)) errors.push('change')
  if (!spec.outcomes.some((o) => o.id === d.outcome)) errors.push('outcome')
  if (!(DIRECTIONS as readonly string[]).includes(d.expected)) errors.push('expected')
  if (d.prediction.trim().length < MIN_PREDICTION) errors.push('prediction')
  if (!d.affected.length || d.affected.some((id) => !spec.outcomes.some((o) => o.id === id))) errors.push('affected')
  return errors
}

/** The draft as a complete hypothesis, or `null` while `validateDraft` still reports problems. */
export function completeDraft(spec: HypothesisSpec, d: DraftInput): HypothesisDraft | null {
  return validateDraft(spec, d).length ? null : (d as HypothesisDraft)
}

/** Direction of a change from `from` to `to`; `null` and non-finite values mean "infinite". */
export function directionOf(from: number | null, to: number | null, tolerance = SAME_TOLERANCE): Direction {
  const a = from === null || !Number.isFinite(from) ? Infinity : from
  const b = to === null || !Number.isFinite(to) ? Infinity : to
  if (a === b) return 'same'
  if (a === Infinity) return 'decrease'
  if (b === Infinity) return 'increase'
  const scale = Math.max(Math.abs(a), Math.abs(b))
  if (scale < 1e-12 || Math.abs(b - a) / scale < tolerance) return 'same'
  return b > a ? 'increase' : 'decrease'
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const finiteOrNull = (x: number | undefined) => (typeof x === 'number' && Number.isFinite(x) ? x : null)

function numberSetting(spec: HypothesisSpec, settings: ProgressSettings, id: string): number {
  const v = settings[id]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const d = spec.defaults[id]
  return typeof d === 'number' ? d : 0
}

/**
 * Tests a hypothesis. The chosen variable goes from its value at the start of the run
 * to its value at the end, with every other setting held at its end value, so only the
 * student's change is measured. If the student did not change the variable the way they
 * planned, the model makes the planned change instead (a quarter of the slider range).
 */
export function compareHypothesis(
  spec: HypothesisSpec,
  draft: HypothesisDraft,
  baseline: ProgressSettings,
  final: ProgressSettings,
): HypothesisComparison {
  const variable = spec.variables.find((v) => v.id === draft.variable) ?? spec.variables[0]
  const end: ProgressSettings = { ...spec.defaults, ...final }
  const start = numberSetting(spec, baseline, variable.id)
  const finish = numberSetting(spec, end, variable.id)
  const span = variable.max - variable.min
  const minMove = span * 0.005

  let from = start
  let to = finish
  let source: 'run' | 'model' = 'run'
  const moved = draft.change === 'increase' ? finish - start > minMove : start - finish > minMove
  if (!moved) {
    source = 'model'
    const step = span * MODEL_STEP
    if (draft.change === 'increase') {
      from = clamp(finish, variable.min, variable.max - step)
      to = from + step
    } else {
      from = clamp(finish, variable.min + step, variable.max)
      to = from - step
    }
  }

  const confounded = spec.variables
    .filter((v) => v.id !== variable.id)
    .filter((v) => Math.abs(numberSetting(spec, baseline, v.id) - numberSetting(spec, end, v.id)) > (v.max - v.min) * 0.005)
    .map((v) => v.id)

  const before = spec.evaluate({ ...end, [variable.id]: from })
  const after = spec.evaluate({ ...end, [variable.id]: to })
  const outcomes: OutcomeChange[] = spec.outcomes.map((o) => {
    const a = finiteOrNull(before[o.id])
    const b = finiteOrNull(after[o.id])
    return { id: o.id, from: a, to: b, direction: directionOf(a, b, o.tolerance) }
  })

  const main = outcomes.find((o) => o.id === draft.outcome)
  const predictionCorrect = !!main && main.direction === draft.expected
  const affectedCorrect = outcomes.filter((o) => draft.affected.includes(o.id) === (o.direction !== 'same')).length
  const affectedTotal = outcomes.length
  const verdict: Verdict =
    predictionCorrect && affectedCorrect === affectedTotal
      ? 'confirmed'
      : predictionCorrect || affectedCorrect * 2 >= affectedTotal
        ? 'partly'
        : 'refuted'

  return { variable: variable.id, from, to, source, confounded, outcomes, predictionCorrect, affectedCorrect, affectedTotal, verdict }
}

/** Starts a new hypothesis, keeping the experiment's running totals. */
export function createRecord(
  prev: HypothesisRecord | undefined,
  experimentId: string,
  draft: HypothesisDraft,
  baseline: ProgressSettings,
  now: Date = new Date(),
): HypothesisRecord {
  const at = now.toISOString()
  return {
    experimentId,
    draft: cleanDraft(draft),
    baseline: { ...baseline },
    createdAt: at,
    updatedAt: at,
    tested: prev?.tested ?? 0,
    confirmed: prev?.confirmed ?? 0,
    result: null,
  }
}

/** Changes the wording or choices of the current hypothesis without restarting the run. */
export function editRecord(prev: HypothesisRecord, draft: HypothesisDraft, now: Date = new Date()): HypothesisRecord {
  return { ...prev, draft: cleanDraft(draft), updatedAt: now.toISOString() }
}

/** Saves the comparison and the student's own judgement. Re-saving the same hypothesis does not count twice. */
export function applyResult(
  prev: HypothesisRecord,
  comparison: HypothesisComparison,
  selfAssessment: SelfAssessment,
  reflection: string,
  now: Date = new Date(),
): HypothesisRecord {
  const at = now.toISOString()
  const first = prev.result === null
  const wasConfirmed = prev.result?.verdict === 'confirmed'
  const isConfirmed = comparison.verdict === 'confirmed'
  return {
    ...prev,
    updatedAt: at,
    tested: prev.tested + (first ? 1 : 0),
    confirmed: prev.confirmed + (isConfirmed ? 1 : 0) - (!first && wasConfirmed ? 1 : 0),
    result: { ...comparison, selfAssessment, reflection: reflection.trim().slice(0, MAX_TEXT), comparedAt: at },
  }
}

/** Combines two record sets (e.g. this device and the account), keeping the most recently updated one. */
export function mergeRecords(
  a: Record<string, HypothesisRecord>,
  b: Record<string, HypothesisRecord>,
): Record<string, HypothesisRecord> {
  const out: Record<string, HypothesisRecord> = { ...a }
  for (const [id, r] of Object.entries(b)) {
    const l = out[id]
    if (!l || r.updatedAt > l.updatedAt) out[id] = r
  }
  return out
}

function cleanDraft(d: HypothesisDraft): HypothesisDraft {
  return {
    ...d,
    plan: d.plan.trim().slice(0, MAX_TEXT),
    prediction: d.prediction.trim().slice(0, MAX_TEXT),
    affected: [...new Set(d.affected)],
  }
}

// ── Sanitising untrusted input (the accounts API) ────────────────────────────

const ID = /^[a-zA-Z0-9_-]{1,40}$/
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const MAX_OUTCOMES = 16

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : '')
const id = (v: unknown) => (typeof v === 'string' && ID.test(v) ? v : null)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const count = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1e6 ? v : 0)
const iso = (v: unknown, fallback: string) => (typeof v === 'string' && ISO.test(v) ? v : fallback)
function oneOf<T extends string>(v: unknown, list: readonly T[]): T | null {
  return typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null
}

/** Rebuilds a record from untrusted JSON, or returns `null` if it is not a usable record. */
export function sanitizeRecord(raw: unknown, experimentId: string, now: Date = new Date()): HypothesisRecord | null {
  if (!isObj(raw) || !isObj(raw.draft)) return null
  const d = raw.draft
  const variable = id(d.variable)
  const outcome = id(d.outcome)
  const change = oneOf(d.change, CHANGES)
  const expected = oneOf(d.expected, DIRECTIONS)
  if (!variable || !outcome || !change || !expected) return null
  const affected = Array.isArray(d.affected) ? [...new Set(d.affected.map(id).filter((x): x is string => !!x))].slice(0, MAX_OUTCOMES) : []
  const at = now.toISOString()
  const createdAt = iso(raw.createdAt, at)
  return {
    experimentId,
    draft: { variable, change, plan: text(d.plan), outcome, expected, prediction: text(d.prediction), affected },
    baseline: sanitizeSettings(raw.baseline),
    createdAt,
    updatedAt: iso(raw.updatedAt, createdAt),
    tested: count(raw.tested),
    confirmed: Math.min(count(raw.confirmed), count(raw.tested)),
    result: sanitizeResult(raw.result, at),
  }
}

function sanitizeResult(raw: unknown, at: string): HypothesisResult | null {
  if (!isObj(raw)) return null
  const variable = id(raw.variable)
  const from = num(raw.from)
  const to = num(raw.to)
  const source = oneOf(raw.source, ['run', 'model'] as const)
  const verdict = oneOf(raw.verdict, VERDICTS)
  const selfAssessment = oneOf(raw.selfAssessment, SELF_ASSESSMENTS)
  if (!variable || from === null || to === null || !source || !verdict || !selfAssessment || !Array.isArray(raw.outcomes)) return null
  const outcomes: OutcomeChange[] = []
  for (const o of raw.outcomes.slice(0, MAX_OUTCOMES)) {
    if (!isObj(o)) continue
    const oid = id(o.id)
    const direction = oneOf(o.direction, DIRECTIONS)
    if (oid && direction) outcomes.push({ id: oid, from: num(o.from), to: num(o.to), direction })
  }
  const affectedTotal = Math.min(count(raw.affectedTotal), outcomes.length)
  return {
    variable,
    from,
    to,
    source,
    confounded: Array.isArray(raw.confounded) ? raw.confounded.map(id).filter((x): x is string => !!x).slice(0, MAX_OUTCOMES) : [],
    outcomes,
    predictionCorrect: raw.predictionCorrect === true,
    affectedCorrect: Math.min(count(raw.affectedCorrect), affectedTotal),
    affectedTotal,
    verdict,
    selfAssessment,
    reflection: text(raw.reflection),
    comparedAt: iso(raw.comparedAt, at),
  }
}
