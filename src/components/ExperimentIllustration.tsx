import type { IllustrationId, Subject } from '../data/experiments'
import { clsx } from 'clsx'
import { SUBJECT_STYLE } from './ui/subjectStyle'

/**
 * Line-art previews for experiment cards. They depict the actual apparatus
 * each simulation uses, drawn with currentColor so they follow the theme.
 */
const art: Record<IllustrationId, React.ReactNode> = {
  pendulum: (
    <>
      <line x1="40" y1="22" x2="120" y2="22" strokeWidth="3" />
      <path d="M80 22 L112 86" strokeWidth="1.6" />
      <path d="M80 22 L80 92" strokeWidth="1" strokeDasharray="3 4" opacity=".45" />
      <path d="M80 70 A48 48 0 0 1 101 65" opacity=".5" strokeWidth="1.2" />
      <circle cx="114" cy="90" r="9" fill="currentColor" fillOpacity=".18" strokeWidth="2" />
      <path d="M48 96 A70 70 0 0 0 112 96" strokeDasharray="2 5" opacity=".4" />
    </>
  ),
  circuit: (
    <>
      <rect x="34" y="28" width="92" height="64" rx="4" strokeWidth="2" />
      <rect x="26" y="48" width="16" height="24" rx="2" fill="currentColor" fillOpacity=".12" strokeWidth="2" />
      <path d="M30 44 v4 M38 44 v4" strokeWidth="2" />
      <path d="M66 28 l4 -6 l6 12 l6 -12 l6 12 l6 -12 l4 6" strokeWidth="2" fill="var(--surface)" />
      <circle cx="126" cy="60" r="10" fill="var(--surface)" strokeWidth="2" />
      <text x="126" y="64" fontSize="10" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="600">A</text>
      <path d="M72 92 l14 -10" strokeWidth="2" />
      <circle cx="72" cy="92" r="2" fill="currentColor" />
    </>
  ),
  titration: (
    <>
      <rect x="74" y="8" width="12" height="62" rx="2" strokeWidth="1.8" />
      <rect x="76" y="24" width="8" height="44" fill="currentColor" fillOpacity=".15" stroke="none" />
      <path d="M74 70 h12 M80 70 v8" strokeWidth="2" />
      <path d="M68 74 h24" strokeWidth="2.5" />
      <circle cx="80" cy="84" r="2" fill="currentColor" />
      <path d="M72 92 v6 l-20 18 h56 l-20 -18 v-6" strokeWidth="2" />
      <path d="M58 110 l-4 4 h52 l-4 -4 z" fill="currentColor" fillOpacity=".25" stroke="none" />
      <path d="M100 30 v-2 M100 40 v-2 M100 50 v-2 M100 60 v-2" opacity=".4" />
    </>
  ),
  projectile: (
    <>
      <path d="M24 100 h112" strokeWidth="2" />
      <path d="M30 98 Q 80 0 130 98" strokeDasharray="4 5" strokeWidth="1.6" />
      <circle cx="80" cy="50" r="6" fill="currentColor" fillOpacity=".2" strokeWidth="2" />
      <path d="M30 98 l14 -16" strokeWidth="3" />
    </>
  ),
  forces: (
    <>
      <path d="M20 96 h120" strokeWidth="2" />
      <rect x="60" y="62" width="40" height="34" rx="3" fill="currentColor" fillOpacity=".12" strokeWidth="2" />
      <path d="M100 79 h30 m-6 -5 l6 5 l-6 5" strokeWidth="2" />
      <path d="M60 79 h-22 m6 -5 l-6 5 l6 5" strokeWidth="1.5" opacity=".6" />
    </>
  ),
  energy: (
    <>
      <path d="M20 40 Q 60 120 80 96 T 140 50" strokeWidth="2" />
      <circle cx="34" cy="52" r="7" fill="currentColor" fillOpacity=".2" strokeWidth="2" />
      <path d="M20 104 h120" opacity=".3" />
    </>
  ),
  spring: (
    <>
      <path d="M40 18 h80" strokeWidth="3" />
      <path d="M80 18 v8 l-12 5 l24 8 l-24 8 l24 8 l-24 8 l12 5 v6" strokeWidth="1.8" />
      <rect x="64" y="72" width="32" height="26" rx="3" fill="currentColor" fillOpacity=".15" strokeWidth="2" />
    </>
  ),
  induction: (
    <>
      <path d="M50 40 a10 20 0 1 0 0 40 M62 40 a10 20 0 1 0 0 40 M74 40 a10 20 0 1 0 0 40 M86 40 a10 20 0 1 0 0 40" strokeWidth="1.8" />
      <rect x="104" y="52" width="36" height="16" rx="2" fill="currentColor" fillOpacity=".15" strokeWidth="2" />
      <path d="M100 60 h-8" strokeDasharray="2 3" />
    </>
  ),
  optics: (
    <>
      <path d="M20 70 h120" opacity=".35" />
      <rect x="20" y="70" width="120" height="40" fill="currentColor" fillOpacity=".1" stroke="none" />
      <path d="M36 20 L80 70 L104 110" strokeWidth="2" />
      <path d="M80 70 L124 20" strokeWidth="1.4" opacity=".55" />
    </>
  ),
  heat: (
    <>
      <rect x="30" y="54" width="100" height="14" rx="4" strokeWidth="2" />
      <path d="M36 80 q4 8 0 16 M50 80 q4 8 0 16 M64 80 q4 8 0 16" strokeWidth="1.6" opacity=".7" />
      <path d="M118 40 q-4 -8 0 -16" opacity=".5" strokeWidth="1.6" />
    </>
  ),
  wave: (
    <>
      <path d="M16 60 q12 -30 24 0 t24 0 t24 0 t24 0 t24 0 t24 0" strokeWidth="2" />
      <path d="M16 60 h128" opacity=".3" strokeDasharray="3 4" />
    </>
  ),
  flask: (
    <>
      <path d="M70 18 v30 l-26 52 h72 l-26 -52 v-30" strokeWidth="2" />
      <path d="M54 84 h52 l8 16 h-68 z" fill="currentColor" fillOpacity=".2" stroke="none" />
      <path d="M64 18 h32" strokeWidth="2" />
    </>
  ),
  thermo: (
    <>
      <rect x="72" y="14" width="16" height="74" rx="8" strokeWidth="2" />
      <circle cx="80" cy="96" r="12" fill="currentColor" fillOpacity=".2" strokeWidth="2" />
      <path d="M80 92 v-50" strokeWidth="4" />
    </>
  ),
  clock: (
    <>
      <circle cx="80" cy="62" r="36" strokeWidth="2" />
      <path d="M80 62 v-22 M80 62 l16 10" strokeWidth="2.4" />
    </>
  ),
  beaker: (
    <>
      <path d="M52 22 v76 a6 6 0 0 0 6 6 h44 a6 6 0 0 0 6 -6 v-76" strokeWidth="2" />
      <rect x="54" y="62" width="52" height="40" fill="currentColor" fillOpacity=".18" stroke="none" />
      <circle cx="70" cy="80" r="2" fill="currentColor" /><circle cx="88" cy="90" r="2.5" fill="currentColor" />
    </>
  ),
  dna: (
    <>
      <path d="M80.0 14 L86.5 16 L92.5 18 L97.5 20 L101.3 22 L103.5 24 L103.9 26 L102.6 28 L99.6 30 L95.1 32 L89.6 34 L83.3 36 L76.7 38 L70.4 40 L64.9 42 L60.4 44 L57.4 46 L56.1 48 L56.5 50 L58.7 52 L62.5 54 L67.5 56 L73.5 58 L80.0 60 L86.5 62 L92.5 64 L97.5 66 L101.3 68 L103.5 70 L103.9 72 L102.6 74 L99.6 76 L95.1 78 L89.6 80 L83.3 82 L76.7 84 L70.4 86 L64.9 88 L60.4 90 L57.4 92 L56.1 94 L56.5 96 L58.7 98 L62.5 100 L67.5 102 L73.5 104 L80.0 106 L86.5 108 L92.5 110" strokeWidth="2.5" />
      <path d="M80.0 14 L73.5 16 L67.5 18 L62.5 20 L58.7 22 L56.5 24 L56.1 26 L57.4 28 L60.4 30 L64.9 32 L70.4 34 L76.7 36 L83.3 38 L89.6 40 L95.1 42 L99.6 44 L102.6 46 L103.9 48 L103.5 50 L101.3 52 L97.5 54 L92.5 56 L86.5 58 L80.0 60 L73.5 62 L67.5 64 L62.5 66 L58.7 68 L56.5 70 L56.1 72 L57.4 74 L60.4 76 L64.9 78 L70.4 80 L76.7 82 L83.3 84 L89.6 86 L95.1 88 L99.6 90 L102.6 92 L103.9 94 L103.5 96 L101.3 98 L97.5 100 L92.5 102 L86.5 104 L80.0 106 L73.5 108 L67.5 110" strokeWidth="2.5" strokeOpacity=".7" />
      <path d="M97.5 20 H62.5 M102.6 28 H57.4 M58.7 45 H101.3 M57.4 51 H102.6 M97.5 66 H62.5 M102.6 74 H57.4 M58.7 91 H101.3 M57.4 97 H102.6" strokeWidth="1.5" strokeOpacity=".6" />
    </>
  ),
  equilibrium: (
    <>
      <path d="M40 52 h70 m-8 -6 l8 6" strokeWidth="2" />
      <path d="M120 70 h-70 m8 6 l-8 -6" strokeWidth="2" />
    </>
  ),
}

export function ExperimentIllustration({
  id,
  subject,
  className,
}: {
  id: IllustrationId
  subject: Subject
  className?: string
}) {
  return (
    <div
      className={clsx(
        'relative flex items-center justify-center overflow-hidden',
        SUBJECT_STYLE[subject].chip,
        className,
      )}
      aria-hidden
    >
      <div className="hero-grid absolute inset-0 opacity-60" />
      <svg viewBox="0 0 160 120" className="relative h-full max-h-36 w-auto" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {art[id]}
      </svg>
    </div>
  )
}
