import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet } from 'react-router'

import { isMocked } from '../api/config'
import { Badge } from './ui'
import { LanguageSwitcher } from './LanguageSwitcher'

const anyMocks = (['auth', 'courses', 'chat', 'items', 'billing'] as const).some(isMocked)

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:text-text'
  }`
}

export function Logo() {
  const { t } = useTranslation()
  return (
    <Link to="/" className="flex items-center gap-2 font-bold text-text">
      <img src="/favicon.svg" alt="" className="size-7" />
      <span className="text-lg">{t('app.name')}</span>
    </Link>
  )
}

export function Layout() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Logo />
          {anyMocks && (
            <Badge className="bg-warning-soft text-warning">{t('common.mockMode')}</Badge>
          )}
          <nav className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
            <NavLink to="/chat" className={navClass}>
              {t('nav.chat')}
            </NavLink>
            <NavLink to="/pricing" className={navClass}>
              {t('nav.pricing')}
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Logo />
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <Outlet />
      </main>
    </div>
  )
}
