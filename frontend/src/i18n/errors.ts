import type { TFunction } from 'i18next'

import { ApiError } from '../api/client'

// Error codes from docs/api.md that have their own text in locales/*.json.
const KNOWN_CODES = new Set([
  'network_error',
  'not_authenticated',
  'invalid_token',
  'invalid_credentials',
  'email_taken',
  'admin_required',
  'daily_limit_reached',
  'validation_error',
])

export function errorText(t: TFunction, error: unknown): string {
  if (error instanceof ApiError) {
    if (KNOWN_CODES.has(error.detail)) return t(`errors.${error.detail}`)
    if (error.status === 422) return t('errors.validation_error')
    if (error.status === 404) return t('errors.not_found')
  }
  return t('errors.unknown')
}
