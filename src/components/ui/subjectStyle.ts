import { Atom, Dna, FlaskConical, type LucideIcon } from 'lucide-react'
import type { Subject } from '../../data/experiments'

/**
 * Per-subject Tailwind classes and icon. Kept as full literal class names so
 * Tailwind's scanner picks them up; add a row here when a subject is added.
 */
export const SUBJECT_STYLE: Record<
  Subject,
  {
    icon: LucideIcon
    /** Soft background with the subject's ink colour (badges, icon tiles). */
    chip: string
    /** Active filter chip. */
    chipActive: string
    ink: string
    text: string
    soft: string
    hoverBorder: string
    /** Hero glow behind the subject page header. */
    glow: string
  }
> = {
  physics: {
    icon: Atom,
    chip: 'bg-physics-soft text-physics-ink',
    chipActive: 'border-physics bg-physics-soft text-physics-ink',
    ink: 'text-physics-ink',
    text: 'text-physics',
    soft: 'bg-physics-soft',
    hoverBorder: 'hover:border-physics/50',
    glow: 'bg-[radial-gradient(60%_90%_at_85%_0%,color-mix(in_srgb,var(--physics)_18%,transparent),transparent_70%)]',
  },
  chemistry: {
    icon: FlaskConical,
    chip: 'bg-chemistry-soft text-chemistry-ink',
    chipActive: 'border-chemistry bg-chemistry-soft text-chemistry-ink',
    ink: 'text-chemistry-ink',
    text: 'text-chemistry',
    soft: 'bg-chemistry-soft',
    hoverBorder: 'hover:border-chemistry/50',
    glow: 'bg-[radial-gradient(60%_90%_at_85%_0%,color-mix(in_srgb,var(--chemistry)_18%,transparent),transparent_70%)]',
  },
  biology: {
    icon: Dna,
    chip: 'bg-biology-soft text-biology-ink',
    chipActive: 'border-biology bg-biology-soft text-biology-ink',
    ink: 'text-biology-ink',
    text: 'text-biology',
    soft: 'bg-biology-soft',
    hoverBorder: 'hover:border-biology/50',
    glow: 'bg-[radial-gradient(60%_90%_at_85%_0%,color-mix(in_srgb,var(--biology)_18%,transparent),transparent_70%)]',
  },
}
