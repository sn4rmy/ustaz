import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router'

import { Loading } from '../components/ui'
import { useAuth } from './context'

export interface FromState {
  from?: string
}

// Pages behind this route need a signed-in user; others are sent to /login.
export function RequireAuth() {
  const { status } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()

  if (status === 'loading') return <Loading label={t('common.loading')} />
  if (status === 'anonymous') {
    const from = location.pathname + location.search
    return <Navigate to="/login" replace state={{ from } satisfies FromState} />
  }
  return <Outlet />
}

// Login and registration make no sense for a signed-in user.
export function GuestOnly() {
  const { status } = useAuth()
  const { t } = useTranslation()

  if (status === 'loading') return <Loading label={t('common.loading')} />
  if (status === 'authenticated') return <Navigate to="/chat" replace />
  return <Outlet />
}
