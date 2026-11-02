/**
 * Experiment catalog. Physics, Chemistry and Biology are kept as separate lists with
 * their own category sets; translations live in the i18n files under
 * `catalog.<id>` and `categories.<subject>.<category>`.
 */

export type Subject = 'physics' | 'chemistry' | 'biology'
/** Every subject, in navigation order. */
export const SUBJECTS: readonly Subject[] = ['physics', 'chemistry', 'biology']
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type ExperimentStatus = 'available' | 'planned'

export const PHYSICS_CATEGORIES = [
  'mechanics',
  'electricity',
  'waves',
  'optics',
  'thermodynamics',
  'heatAndThermodynamics',
  'propertiesOfMatter',
  'modernPhysics',
] as const
export const CHEMISTRY_CATEGORIES = [
  'acidsBases',
  'reactions',
  'solutions',
  'thermochemistry',
  'kinetics',
  'organicChemistry',
  'analyticalChemistry',
  'inorganicChemistry',
] as const
export const BIOLOGY_CATEGORIES = ['molecularBiology', 'genetics'] as const

export type PhysicsCategory = (typeof PHYSICS_CATEGORIES)[number]
export type ChemistryCategory = (typeof CHEMISTRY_CATEGORIES)[number]
export type BiologyCategory = (typeof BIOLOGY_CATEGORIES)[number]

export const CATEGORIES: Record<Subject, readonly string[]> = {
  physics: PHYSICS_CATEGORIES,
  chemistry: CHEMISTRY_CATEGORIES,
  biology: BIOLOGY_CATEGORIES,
}

export type IllustrationId =
  | 'pendulum'
  | 'circuit'
  | 'titration'
  | 'projectile'
  | 'forces'
  | 'energy'
  | 'spring'
  | 'induction'
  | 'optics'
  | 'heat'
  | 'wave'
  | 'flask'
  | 'thermo'
  | 'clock'
  | 'beaker'
  | 'equilibrium'
  | 'dna'

export interface Experiment {
  id: string
  subject: Subject
  category: string
  difficulty: Difficulty
  /** Estimated duration in minutes. */
  duration: number
  status: ExperimentStatus
  featured?: boolean
  /** Lower comes first in the recommended order. */
  order: number
  illustration: IllustrationId
  /** Opens the hypothesis stage (predict → test → compare) on the experiment page. Needs a spec in `data/hypotheses.ts`. */
  hasHypothesis?: boolean
}

export const EXPERIMENTS: Experiment[] = [
  // Physics — available
  { id: 'pendulum', subject: 'physics', category: 'mechanics', difficulty: 'beginner', duration: 15, status: 'available', featured: true, order: 1, illustration: 'pendulum', hasHypothesis: true },
  { id: 'ohms-law', subject: 'physics', category: 'electricity', difficulty: 'beginner', duration: 15, status: 'available', featured: true, order: 2, illustration: 'circuit', hasHypothesis: true },
  // Physics — mechanics, waves, electromagnetism, heat
  { id: 'projectile-motion', subject: 'physics', category: 'mechanics', difficulty: 'intermediate', duration: 20, status: 'available', order: 10, illustration: 'projectile', hasHypothesis: true },
  { id: 'newtons-laws', subject: 'physics', category: 'mechanics', difficulty: 'beginner', duration: 20, status: 'available', order: 11, illustration: 'forces', hasHypothesis: true },
  { id: 'energy-conservation', subject: 'physics', category: 'mechanics', difficulty: 'intermediate', duration: 25, status: 'available', order: 12, illustration: 'energy', hasHypothesis: true },
  { id: 'simple-harmonic-motion', subject: 'physics', category: 'waves', difficulty: 'intermediate', duration: 20, status: 'available', order: 13, illustration: 'wave', hasHypothesis: true },
  { id: 'hookes-law', subject: 'physics', category: 'mechanics', difficulty: 'beginner', duration: 15, status: 'available', order: 14, illustration: 'spring', hasHypothesis: true },
  { id: 'electromagnetic-induction', subject: 'physics', category: 'electricity', difficulty: 'advanced', duration: 30, status: 'available', order: 15, illustration: 'induction', hasHypothesis: true },
  { id: 'refraction-reflection', subject: 'physics', category: 'optics', difficulty: 'intermediate', duration: 20, status: 'available', order: 16, illustration: 'optics', hasHypothesis: true },
  { id: 'heat-transfer', subject: 'physics', category: 'thermodynamics', difficulty: 'intermediate', duration: 25, status: 'available', order: 17, illustration: 'heat', hasHypothesis: true },
  // Physics — modern physics, properties of matter, heat, mechanics, electricity
  { id: 'zeeman-effect', subject: 'physics', category: 'modernPhysics', difficulty: 'advanced', duration: 30, status: 'available', order: 18, illustration: 'optics', hasHypothesis: true },
  { id: 'density-measurement', subject: 'physics', category: 'propertiesOfMatter', difficulty: 'beginner', duration: 15, status: 'available', order: 19, illustration: 'beaker', hasHypothesis: true },
  { id: 'joules-experiment', subject: 'physics', category: 'heatAndThermodynamics', difficulty: 'intermediate', duration: 25, status: 'available', order: 20, illustration: 'heat', hasHypothesis: true },
  { id: 'ballistic-pendulum', subject: 'physics', category: 'mechanics', difficulty: 'intermediate', duration: 20, status: 'available', order: 21, illustration: 'pendulum', hasHypothesis: true },
  { id: 'rc-circuit-charging', subject: 'physics', category: 'electricity', difficulty: 'beginner', duration: 15, status: 'available', order: 22, illustration: 'circuit', hasHypothesis: true },
  { id: 'rc-circuit-discharging', subject: 'physics', category: 'electricity', difficulty: 'beginner', duration: 15, status: 'available', order: 23, illustration: 'circuit', hasHypothesis: true },
  { id: 'archimedes-principle', subject: 'physics', category: 'propertiesOfMatter', difficulty: 'beginner', duration: 15, status: 'available', order: 24, illustration: 'beaker', hasHypothesis: true },
  // Chemistry — available
  { id: 'titration', subject: 'chemistry', category: 'acidsBases', difficulty: 'intermediate', duration: 25, status: 'available', featured: true, order: 1, illustration: 'titration', hasHypothesis: true },
  // Chemistry — thermochemistry, solutions, equilibrium
  { id: 'exo-endo', subject: 'chemistry', category: 'thermochemistry', difficulty: 'beginner', duration: 20, status: 'available', order: 10, illustration: 'thermo', hasHypothesis: true },
  { id: 'reaction-rate', subject: 'chemistry', category: 'kinetics', difficulty: 'intermediate', duration: 25, status: 'available', order: 11, illustration: 'clock', hasHypothesis: true },
  { id: 'solubility', subject: 'chemistry', category: 'solutions', difficulty: 'beginner', duration: 15, status: 'available', order: 12, illustration: 'beaker', hasHypothesis: true },
  { id: 'ph-indicators', subject: 'chemistry', category: 'acidsBases', difficulty: 'beginner', duration: 15, status: 'available', order: 13, illustration: 'flask', hasHypothesis: true },
  { id: 'dilution', subject: 'chemistry', category: 'solutions', difficulty: 'beginner', duration: 15, status: 'available', order: 14, illustration: 'beaker', hasHypothesis: true },
  { id: 'chemical-equilibrium', subject: 'chemistry', category: 'reactions', difficulty: 'advanced', duration: 30, status: 'available', order: 15, illustration: 'equilibrium', hasHypothesis: true },
  // Chemistry — organic, analytical and inorganic (PraxiLabs-inspired set)
  { id: 'diels-alder-reaction', subject: 'chemistry', category: 'organicChemistry', difficulty: 'advanced', duration: 30, status: 'available', order: 16, illustration: 'flask', hasHypothesis: true },
  { id: 'synthesis-of-aspirin', subject: 'chemistry', category: 'organicChemistry', difficulty: 'intermediate', duration: 30, status: 'available', order: 17, illustration: 'flask', hasHypothesis: true },
  { id: 'weak-base-strong-acid-titration', subject: 'chemistry', category: 'analyticalChemistry', difficulty: 'intermediate', duration: 25, status: 'available', order: 18, illustration: 'titration', hasHypothesis: true },
  { id: 'flame-test', subject: 'chemistry', category: 'inorganicChemistry', difficulty: 'beginner', duration: 10, status: 'available', order: 19, illustration: 'flask', hasHypothesis: true },
  { id: 'gc-ms-analysis', subject: 'chemistry', category: 'analyticalChemistry', difficulty: 'advanced', duration: 30, status: 'available', order: 20, illustration: 'flask', hasHypothesis: true },
  // Biology — molecular biology and genetics
  { id: 'dna-extraction', subject: 'biology', category: 'molecularBiology', difficulty: 'beginner', duration: 20, status: 'available', featured: true, order: 1, illustration: 'flask', hasHypothesis: true },
  { id: 'pcr', subject: 'biology', category: 'genetics', difficulty: 'intermediate', duration: 25, status: 'available', order: 2, illustration: 'flask', hasHypothesis: true },
  { id: 'gel-electrophoresis', subject: 'biology', category: 'molecularBiology', difficulty: 'intermediate', duration: 20, status: 'available', order: 3, illustration: 'flask', hasHypothesis: true },
]

export const experimentsBySubject = (subject: Subject) => EXPERIMENTS.filter((e) => e.subject === subject)
export const availableExperiments = (subject?: Subject) =>
  EXPERIMENTS.filter((e) => e.status === 'available' && (!subject || e.subject === subject))
export const findExperiment = (subject: string, id: string) =>
  EXPERIMENTS.find((e) => e.subject === subject && e.id === id)
export const experimentPath = (e: Pick<Experiment, 'subject' | 'id'>) => `/${e.subject}/${e.id}`

export const DIFFICULTY_RANK: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 }
