import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth } from '../auth/context'
import type { FromState } from '../auth/routes'
import { isEmail } from '../auth/validation'
import { Alert, Button, Card, Field } from '../components/ui'
import { errorText } from '../i18n/errors'

export function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const errors = {
      email: isEmail(email) ? undefined : t('auth.validation.email'),
      password: password ? undefined : t('auth.validation.required'),
    }
    setFieldErrors(errors)
    if (errors.email || errors.password) return

    setSubmitting(true)
    setError(null)
    try {
      await login(email, password)
      const from = (location.state as FromState | null)?.from
      navigate(from && from !== '/login' ? from : '/chat', { replace: true })
    } catch (err) {
      setError(errorText(t, err))
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold">{t('auth.loginTitle')}</h1>
      <p className="mt-1 text-sm text-muted">{t('app.tagline')}</p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Field
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          autoFocus
        />
        <Field
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Button type="submit" loading={submitting} className="mt-2 w-full">
          {t('auth.loginButton')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          {t('auth.toRegister')}
        </Link>
      </p>
    </Card>
  )
}
