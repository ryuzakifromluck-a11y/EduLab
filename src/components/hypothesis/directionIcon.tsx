import { ArrowDown, ArrowUp, Equal } from 'lucide-react'
import type { Direction } from '../../lib/hypothesis'

export const directionIcon = (d: Direction, className = 'h-4 w-4') =>
  d === 'increase' ? <ArrowUp className={className} aria-hidden /> : d === 'decrease' ? <ArrowDown className={className} aria-hidden /> : <Equal className={className} aria-hidden />
