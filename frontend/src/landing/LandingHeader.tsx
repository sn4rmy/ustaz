import { useTranslation } from 'react-i18next'

import type { Language } from '../api/types'
import { useAuth } from '../auth/context'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Logo } from '../components/Layout'
import { ButtonLink } from '../components/ui'

export function LandingHeader() {
  const { t } = useTranslation()
  const { user, status, updateProfile } = useAuth()

  function saveLanguage(language: Language) {
    // Same as in the app header: the profile may lag behind the interface.
    if (user && user.language !== language) updateProfile({ language }).catch(() => {})
  }

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
        <Logo />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher onChange={saveLanguage} />
          {status === 'authenticated' && (
            <ButtonLink to="/chat" className="px-2.5 text-xs whitespace-nowrap sm:px-4 sm:text-sm">
              {t('landing.nav.openChat')}
            </ButtonLink>
          )}
          {status === 'anonymous' && (
            <ButtonLink to="/login" variant="secondary" className="px-2.5 text-xs whitespace-nowrap sm:px-4 sm:text-sm">
              {t('landing.nav.login')}
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  )
}
