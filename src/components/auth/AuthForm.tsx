import { AlertCircle, Eye, EyeOff, UserRound } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { validateEmail, validateName, validatePassword, type AuthFieldError } from '../../lib/authValidation'
import { ApiError } from '../../services/api'
import { useAuth } from '../../store/auth'
import { Button, Container } from '../ui/primitives'
import { clsx } from 'clsx'

type Mode = 'login' | 'signup'
type Field = 'name' | 'email' | 'password'

function TextField({
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  autoComplete,
  trailing,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
  autoComplete: string
  trailing?: ReactNode
}) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={clsx(
            'h-11 w-full rounded-xl border bg-surface px-3.5 text-sm text-ink placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
            error ? 'border-danger' : 'border-line focus:border-brand',
            trailing && 'pr-11',
          )}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/**
 * Login and sign-up form. On success the auth store flips to signed-in and the
 * `RequireGuest` guard around the page redirects to `?next=` (or /account).
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { login, register } = useAuth()
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Partial<Record<Field, AuthFieldError>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const signup = mode === 'signup'

  const set = (field: Field) => (v: string) => {
    setValues((s) => ({ ...s, [field]: v }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    const next: Partial<Record<Field, AuthFieldError>> = {
      ...(signup ? { name: validateName(values.name) ?? undefined } : {}),
      email: validateEmail(values.email) ?? undefined,
      password: validatePassword(values.password, signup) ?? undefined,
    }
    setErrors(next)
    setFormError(null)
    if (Object.values(next).some(Boolean)) return
    setSubmitting(true)
    try {
      if (signup) await register(values.name, values.email, values.password)
      else await login(values.email, values.password)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'server'
      setFormError(t(`auth.errors.${code}`, { defaultValue: t('auth.errors.server') }))
      setSubmitting(false)
    }
  }

  const err = (f: Field) => (errors[f] ? t(`auth.errors.${errors[f]}`) : undefined)
  const next = params.get('next')
  const switchTo = `${signup ? '/login' : '/signup'}${next ? `?next=${encodeURIComponent(next)}` : ''}`

  return (
    <Container className="py-14 sm:py-20">
      <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-7 shadow-card sm:p-9">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <UserRound className="h-5.5 w-5.5" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{t(signup ? 'auth.signupTitle' : 'auth.loginTitle')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t(signup ? 'auth.signupText' : 'auth.loginText')}</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {formError && (
            <div role="alert" className="flex gap-2 rounded-xl bg-warn-soft px-3.5 py-3 text-sm text-warn">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {formError}
            </div>
          )}
          {signup && <TextField label={t('auth.name')} value={values.name} onChange={set('name')} error={err('name')} autoComplete="name" />}
          <TextField label={t('auth.email')} type="email" value={values.email} onChange={set('email')} error={err('email')} autoComplete="email" />
          <TextField
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            value={values.password}
            onChange={set('password')}
            error={err('password')}
            hint={signup ? t('auth.passwordHint') : undefined}
            autoComplete={signup ? 'new-password' : 'current-password'}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                aria-pressed={showPassword}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            }
          />
          <Button type="submit" variant="primary" size="lg" className="mt-2 w-full" disabled={submitting}>
            {submitting ? t('auth.submitting') : t(signup ? 'auth.submitSignup' : 'auth.submitLogin')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {t(signup ? 'auth.haveAccount' : 'auth.noAccount')}{' '}
          <Link to={switchTo} className="font-semibold text-brand hover:underline">
            {t(signup ? 'auth.toLogin' : 'auth.toSignup')}
          </Link>
        </p>
      </div>
    </Container>
  )
}
