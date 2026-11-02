import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { PageLoader } from '../components/PageLoader'
import { findExperiment, type Subject } from '../data/experiments'
import NotFoundPage from './NotFoundPage'
import { ButtonLink, Container } from '../components/ui/primitives'
import { analytics } from '../services/analytics'

/** Each simulation (and three.js) is code-split and loaded on demand. */
const SIMULATIONS: Record<string, LazyExoticComponent<ComponentType>> = {
  'physics/pendulum': lazy(() => import('../experiments/pendulum/PendulumExperiment')),
  'physics/ohms-law': lazy(() => import('../experiments/ohm/OhmExperiment')),
  'physics/projectile-motion': lazy(() => import('../experiments/projectile/ProjectileExperiment')),
  'physics/newtons-laws': lazy(() => import('../experiments/newtonsLaws/NewtonsLawsExperiment')),
  'physics/energy-conservation': lazy(() => import('../experiments/energyConservation/EnergyConservationExperiment')),
  'physics/simple-harmonic-motion': lazy(() => import('../experiments/harmonicMotion/HarmonicMotionExperiment')),
  'physics/hookes-law': lazy(() => import('../experiments/hookesLaw/HookesLawExperiment')),
  'physics/electromagnetic-induction': lazy(() => import('../experiments/induction/InductionExperiment')),
  'physics/refraction-reflection': lazy(() => import('../experiments/optics/OpticsExperiment')),
  'physics/heat-transfer': lazy(() => import('../experiments/heatTransfer/HeatTransferExperiment')),
  'physics/zeeman-effect': lazy(() => import('../experiments/zeeman-effect/ZeemanEffectExperiment')),
  'physics/density-measurement': lazy(() => import('../experiments/density-measurement/DensityMeasurementExperiment')),
  'physics/joules-experiment': lazy(() => import('../experiments/joules-experiment/JoulesExperimentExperiment')),
  'physics/ballistic-pendulum': lazy(() => import('../experiments/ballistic-pendulum/BallisticPendulumExperiment')),
  'physics/rc-circuit-charging': lazy(() => import('../experiments/rc-circuit-charging/RcCircuitChargingExperiment')),
  'physics/rc-circuit-discharging': lazy(() => import('../experiments/rc-circuit-discharging/RcCircuitDischargingExperiment')),
  'physics/archimedes-principle': lazy(() => import('../experiments/archimedes-principle/ArchimedesPrincipleExperiment')),
  'chemistry/titration': lazy(() => import('../experiments/titration/TitrationExperiment')),
  'chemistry/exo-endo': lazy(() => import('../experiments/exoEndo/ExoEndoExperiment')),
  'chemistry/solubility': lazy(() => import('../experiments/solubility/SolubilityExperiment')),
  'chemistry/ph-indicators': lazy(() => import('../experiments/phIndicators/PhIndicatorsExperiment')),
  'chemistry/dilution': lazy(() => import('../experiments/dilution/DilutionExperiment')),
  'chemistry/chemical-equilibrium': lazy(() => import('../experiments/equilibrium/EquilibriumExperiment')),
  'chemistry/reaction-rate': lazy(() => import('../experiments/reactionRate/ReactionRateExperiment')),
  'chemistry/diels-alder-reaction': lazy(() => import('../experiments/diels-alder-reaction/DielsAlderReactionExperiment')),
  'chemistry/synthesis-of-aspirin': lazy(() => import('../experiments/synthesis-of-aspirin/SynthesisOfAspirinExperiment')),
  'chemistry/weak-base-strong-acid-titration': lazy(() => import('../experiments/weak-base-strong-acid-titration/WeakBaseStrongAcidTitrationExperiment')),
  'chemistry/flame-test': lazy(() => import('../experiments/flame-test/FlameTestExperiment')),
  'chemistry/gc-ms-analysis': lazy(() => import('../experiments/gc-ms-analysis/GcMsAnalysisExperiment')),
  'chemistry/sodium-water': lazy(() => import('../experiments/sodium-water/SodiumWaterExperiment')),
  'chemistry/electrolysis-water': lazy(() => import('../experiments/electrolysis-water/ElectrolysisExperiment')),
  'biology/dna-extraction': lazy(() => import('../experiments/dna-extraction/DnaExtractionExperiment')),
  'biology/pcr': lazy(() => import('../experiments/pcr/PcrExperiment')),
  'biology/gel-electrophoresis': lazy(() => import('../experiments/gel-electrophoresis/GelElectrophoresisExperiment')),
}

export default function ExperimentRoute({ subject }: { subject: Subject }) {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const experiment = findExperiment(subject, id)
  const Sim = experiment ? SIMULATIONS[`${subject}/${id}`] : undefined
  // One session per opened simulation; planned and unknown pages are not counted.
  useEffect(() => {
    if (Sim) analytics.trackExperimentVisit?.(subject, id)
  }, [Sim, subject, id])
  if (!experiment) return <NotFoundPage />
  if (!Sim) {
    return (
      <Container className="py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t(`catalog.${id}.title`)}</h1>
        <p className="mt-3 text-muted">{t('library.inDevelopmentLong')}</p>
        <ButtonLink to={`/${subject}`} variant="primary" className="mt-8">
          {t('library.backTo', { subject: t(`nav.${subject}`) })}
        </ButtonLink>
      </Container>
    )
  }
  return (
    <Suspense fallback={<PageLoader label={t('common.loadingExperiment')} />}>
      <Sim />
    </Suspense>
  )
}
