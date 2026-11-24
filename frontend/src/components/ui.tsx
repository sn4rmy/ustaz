import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import { useId } from 'react'
import { Link, type LinkProps } from 'react-router'

// Base elements from docs/design.md. Pages build on these instead of raw Tailwind classes.

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg shadow-card hover:bg-primary-hover hover:shadow-pop',
  secondary: 'border border-border bg-surface text-text hover:border-text/30 hover:bg-surface-muted',
  ghost: 'text-muted hover:bg-surface-muted hover:text-text',
}

function buttonClass(variant: ButtonVariant, className: string): string {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-[background-color,border-color,box-shadow,color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClass(variant, className)}
      {...props}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  )
}

// A link that looks like a button, for navigation such as "Sign in" or "Start".
export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: LinkProps & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />
}

// The same for a plain link, e.g. to an anchor on the page.
export function ButtonAnchor({
  variant = 'primary',
  className = '',
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant }) {
  return <a className={buttonClass(variant, className)} {...props} />
}

export function Spinner({ small = false }: { small?: boolean }) {
  const size = small ? 'size-4 border-2' : 'size-6 border-[3px]'
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-current border-r-transparent ${size}`}
    />
  )
}

export function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-muted">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

type AlertTone = 'error' | 'info' | 'success' | 'warning'

const ALERT_TONES: Record<AlertTone, string> = {
  error: 'border-danger/25 bg-danger-soft text-danger',
  info: 'border-primary/25 bg-primary-soft text-primary',
  success: 'border-success/25 bg-success-soft text-success',
  warning: 'border-warning/25 bg-warning-soft text-warning',
}

export function Alert({ tone = 'error', children }: { tone?: AlertTone; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${ALERT_TONES[tone]}`}
    >
      {children}
    </div>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-[20px] border border-border bg-surface p-5 shadow-card sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Field({ label, error, className = '', ...props }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="min-h-11 rounded-xl border border-border bg-surface px-3.5 py-2 text-base transition-shadow outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 aria-invalid:border-danger"
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
}

export function SelectField({ label, className = '', children, ...props }: SelectFieldProps) {
  const id = useId()
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        className="min-h-11 rounded-xl border border-border bg-surface px-3.5 py-2 text-base transition-shadow outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

export function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  )
}
