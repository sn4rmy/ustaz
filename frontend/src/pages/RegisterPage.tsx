import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'

import type { Language } from '../api/types'
import { useAuth } from '../auth/context'
import { Alert, Button, Card, Field, SelectField } from '../components/ui'
import { isLanguage, LANGUAGES } from '../i18n'
import { errorText } from '../i18n/errors'
import {
  isEmail,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  passwordBytes,
} from '../auth/validation'

interface Form {
  name: string
  email: string
  password: string
  confirm: string
}

type FormErrors = Partial<Record<keyof Form, string>>

export function RegisterPage() {
  const { t, i18n } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>({ name: '', email: '', password: '', confirm: '' })
  const [language, setLanguage] = useState<Language>(
    isLanguage(i18n.language) ? i18n.language : 'ru',
  )
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof Form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function validate(): FormErrors {
    const errors: FormErrors = {}
    const name = form.name.trim()
    if (!name) errors.name = t('auth.validation.required')
    else if (name.length > NAME_MAX_LENGTH) {
      errors.name = t('auth.validation.nameTooLong', { max: NAME_MAX_LENGTH })
    }
    if (!isEmail(form.email)) errors.email = t('auth.validation.email')
    if (form.password.length < PASSWORD_MIN_LENGTH) {
      errors.password = t('auth.validation.passwordShort', { min: PASSWORD_MIN_LENGTH })
    } else if (passwordBytes(form.password) > PASSWORD_MAX_BYTES) {
      errors.password = t('auth.validation.passwordLong')
    }
    if (form.confirm !== form.password) errors.confirm = t('auth.validation.passwordMismatch')
    return errors
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    setError(null)
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        language,
      })
      navigate('/chat', { replace: true })
    } catch (err) {
      setError(errorText(t, err))
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold">{t('auth.registerTitle')}</h1>
      <p className="mt-1 text-sm text-muted">{t('app.tagline')}</p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Field
          label={t('auth.name')}
          autoComplete="name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          error={fieldErrors.name}
          autoFocus
        />
        <Field
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          error={fieldErrors.email}
        />
        <Field
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          error={fieldErrors.password}
        />
        <Field
          label={t('auth.confirmPassword')}
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(e) => update('confirm', e.target.value)}
          error={fieldErrors.confirm}
        />
        <SelectField
          label={t('auth.language')}
          value={language}
          onChange={(e) => {
            const value = e.target.value
            if (isLanguage(value)) setLanguage(value)
          }}
        >
          {LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {t(`languages.${code}`)}
            </option>
          ))}
        </SelectField>
        <Button type="submit" loading={submitting} className="mt-2 w-full">
          {t('auth.registerButton')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t('auth.toLogin')}
        </Link>
      </p>
    </Card>
  )
}
