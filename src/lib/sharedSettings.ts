import type { ProgressSettings } from './progressModel'

/**
 * Applies a roommate's shared parameters to an experiment. Values come from
 * another browser, so each is checked: numbers must be finite and are clamped to
 * the slider's range, choices must be one of the options, and a setter only runs
 * when the value actually changes (some setters restart the simulation).
 */
export type SettingRule =
  | { kind: 'number'; current: number; min: number; max: number; set: (v: number) => void }
  | { kind: 'choice'; current: string | number; options: readonly (string | number)[]; set: (v: never) => void }
  | { kind: 'boolean'; current: boolean; set: (v: boolean) => void }

export const num = (current: number, min: number, max: number, set: (v: number) => void): SettingRule => ({ kind: 'number', current, min, max, set })
export const choice = <T extends string | number>(current: T, options: readonly T[], set: (v: T) => void): SettingRule => ({
  kind: 'choice',
  current,
  options,
  set: set as (v: never) => void,
})
export const bool = (current: boolean, set: (v: boolean) => void): SettingRule => ({ kind: 'boolean', current, set })

export function applySharedSettings(settings: ProgressSettings, rules: Record<string, SettingRule>): string[] {
  const changed: string[] = []
  for (const [key, rule] of Object.entries(rules)) {
    if (!Object.hasOwn(settings, key)) continue
    const v = settings[key]
    if (rule.kind === 'number') {
      if (typeof v !== 'number' || !Number.isFinite(v)) continue
      const x = Math.min(rule.max, Math.max(rule.min, v))
      if (Math.abs(x - rule.current) < 1e-9) continue
      rule.set(x)
    } else if (rule.kind === 'choice') {
      if (!rule.options.includes(v as string | number) || v === rule.current) continue
      rule.set(v as never)
    } else {
      if (typeof v !== 'boolean' || v === rule.current) continue
      rule.set(v)
    }
    changed.push(key)
  }
  return changed
}
