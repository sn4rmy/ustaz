import { useTranslation } from 'react-i18next'

import type { Language } from '../api/types'
import { LANGUAGES } from '../i18n'

interface Props {
  onChange?: (language: Language) => void
}

export function LanguageSwitcher({ onChange }: Props) {
  const { t, i18n } = useTranslation()

  function select(language: Language) {
    void i18n.changeLanguage(language)
    onChange?.(language)
  }

  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className="inline-flex rounded-lg border border-border bg-surface p-0.5"
    >
      {LANGUAGES.map((language) => {
        const active = i18n.language === language
        return (
          <button
            key={language}
            type="button"
            aria-pressed={active}
            onClick={() => select(language)}
            className={`min-h-8 rounded-md px-2.5 text-xs font-semibold uppercase transition-colors ${
              active ? 'bg-primary text-primary-fg' : 'text-muted hover:text-text'
            }`}
          >
            {language}
          </button>
        )
      })}
    </div>
  )
}
