import { clsx } from 'clsx'
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

export function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  format = (v) => String(v),
  hint,
  accent = 'var(--brand)',
  disabled,
  large,
}: {
  label: ReactNode
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
  format?: (v: number) => string
  hint?: ReactNode
  accent?: string
  disabled?: boolean
  large?: boolean
}) {
  const id = useId()
  const labelId = `${id}-label`
  const fill = ((value - min) / (max - min)) * 100
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  return (
    <div className={clsx('flex flex-col', large ? 'gap-2' : 'gap-1')}>
      <div className="flex items-baseline justify-between gap-3">
        <label id={labelId} htmlFor={id} className={clsx('font-medium text-ink', large ? 'text-lg' : 'text-sm')}>
          {label}
        </label>
        <span className="flex items-baseline gap-1">
          <input
            type="number"
            inputMode="decimal"
            aria-labelledby={labelId}
            className={clsx(
              'tabular w-20 rounded-md border border-transparent bg-transparent px-1 text-right font-semibold text-ink hover:border-line focus:border-brand',
              large ? 'text-xl' : 'text-sm',
            )}
            value={+value.toFixed(6)}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (Number.isFinite(v)) onChange(clamp(v))
            }}
          />
          {unit && <span className={clsx('text-muted', large ? 'text-base' : 'text-xs')}>{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="slider"
        style={{ ['--fill' as string]: `${fill}%`, ['--track' as string]: accent }}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={`${format(value)}${unit ? ' ' + unit : ''}`}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: ReactNode
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  size = 'md',
}: {
  label: string
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  size?: 'md' | 'lg'
}) {
  const group = useRef<HTMLDivElement>(null)
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  // Radio-group keyboard pattern: one tab stop, arrow keys / Home / End move and select.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? index === last ? 0 : index + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? index === 0 ? last : index - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1
    if (next < 0) return
    e.preventDefault()
    e.stopPropagation()
    onChange(options[next].value)
    group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }
  return (
    <div ref={group} role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="inline-flex flex-wrap rounded-lg bg-surface-2 p-1">
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={i === index ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={clsx(
            'tabular rounded-md font-medium transition-colors',
            size === 'lg' ? 'px-4 py-2 text-base' : 'px-2.5 py-1 text-xs',
            o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
  description?: ReactNode
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-brand' : 'bg-surface-3',
        )}
      >
        <span
          className={clsx(
            'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

export interface Measurement {
  id: string
  label: ReactNode
  value: string
  unit?: string
  sub?: ReactNode
  tone?: 'default' | 'accent' | 'warn'
}

export function MeasurementGrid({ items, large }: { items: Measurement[]; large?: boolean }) {
  return (
    <dl
      className={clsx(
        'grid gap-3',
        large ? 'grid-cols-2 xl:grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
      )}
      aria-live="off"
    >
      {items.map((m) => (
        <div
          key={m.id}
          className={clsx(
            'rounded-xl border px-4 py-3',
            m.tone === 'accent' ? 'border-brand/30 bg-brand-soft' : m.tone === 'warn' ? 'border-warn/30 bg-warn-soft' : 'border-line bg-surface',
          )}
        >
          <dt className={clsx('font-medium text-muted', large ? 'text-base' : 'text-xs')}>{m.label}</dt>
          <dd className="mt-1 flex items-baseline gap-1">
            <span className={clsx('tabular font-semibold tracking-tight text-ink', large ? 'text-4xl' : 'text-xl')}>
              {m.value}
            </span>
            {m.unit && <span className={clsx('text-muted', large ? 'text-lg' : 'text-sm')}>{m.unit}</span>}
          </dd>
          {m.sub && <dd className={clsx('mt-0.5 text-muted', large ? 'text-sm' : 'text-xs')}>{m.sub}</dd>}
        </div>
      ))}
    </dl>
  )
}

export function Panel({
  title,
  icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={clsx('flex flex-col rounded-2xl border border-line bg-surface shadow-card', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          {icon && <span className="text-muted" aria-hidden>{icon}</span>}
          {title}
        </h2>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </header>
      <div className={clsx('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
