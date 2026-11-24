import { useTranslation } from 'react-i18next'

const GITHUB_URL = 'https://github.com/sn4rmy/ustaz'

const TEAM = [
  { name: 'Dinmukhamet Arkhabekov', role: 'lead' },
  { name: 'Zhaskanat Zhabykbai', role: 'frontend' },
  { name: 'Abylaikhan Bazarbay', role: 'devops' },
]

export function LandingFooter() {
  const { t } = useTranslation()
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1fr_auto_auto] md:gap-16">
        <div className="max-w-sm">
          <p className="font-display text-2xl font-semibold tracking-tight">{t('app.name')}</p>
          <p className="mt-2 text-sm text-muted">{t('landing.footer.about')}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t('landing.footer.team')}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {TEAM.map((member) => (
              <li key={member.name}>
                <span className="font-medium">{member.name}</span>
                <span className="text-muted"> — {t(`landing.footer.roles.${member.role}`)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('landing.footer.github')} ↗
          </a>
        </div>
      </div>
    </footer>
  )
}
