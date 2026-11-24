import { useTranslation } from 'react-i18next'

const AGENTS = ['teacher', 'examiner', 'mentor'] as const

// Left half of the login and registration screens on wide displays: what Ustaz is.
export function AuthPromo() {
  const { t } = useTranslation()
  return (
    <div className="hidden rounded-[28px] bg-primary p-10 text-primary-fg lg:flex lg:min-h-[30rem] lg:flex-col">
      <p className="font-mono text-xs tracking-[0.18em] uppercase opacity-80">
        {t('landing.hero.label')}
      </p>
      <p className="mt-6 font-display text-4xl leading-tight font-bold tracking-tight text-balance xl:text-5xl">
        {t('landing.hero.title')}
      </p>
      <p className="mt-4 max-w-md opacity-90">{t('app.tagline')}</p>
      <ul className="mt-auto flex flex-wrap gap-2 pt-10">
        {AGENTS.map((agent) => (
          <li
            key={agent}
            className="rounded-full border border-primary-fg/30 px-4 py-2 text-sm font-medium"
          >
            {t(`chat.agents.${agent}`)}
            <span className="opacity-75"> · {t(`landing.agents.roles.${agent}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
