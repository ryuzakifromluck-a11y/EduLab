import { clsx } from 'clsx'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap'
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong dark:text-[#0a0e17] shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  subtle: 'bg-surface-2 text-ink hover:bg-surface-3',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', extra?: string) {
  return clsx(base, variants[variant], sizes[size], extra)
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ComponentPropsWithRef<'button'> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />
}

export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />
}

export function IconButton({
  label,
  className,
  active,
  children,
  ...props
}: ComponentPropsWithRef<'button'> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={clsx(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ className, children, as: As = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' | 'aside' }) {
  return <As className={clsx('rounded-2xl border border-line bg-surface shadow-card', className)}>{children}</As>
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', className)}>
      {children}
    </span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  id,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  id?: string
}) {
  return (
    <div className={clsx('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && <p className="mb-2 text-sm font-semibold tracking-wide text-brand uppercase">{eyebrow}</p>}
      <h2 id={id} className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
      {description && <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>}
    </div>
  )
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}
