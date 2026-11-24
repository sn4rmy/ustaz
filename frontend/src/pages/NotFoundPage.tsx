import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Card } from '../components/ui'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Card className="mx-auto mt-8 w-full max-w-md text-center">
      <p aria-hidden="true" className="font-display text-7xl font-bold tracking-tight text-primary/30">
        404
      </p>
      <h1 className="mt-2 font-display text-xl font-semibold tracking-tight">{t('pages.notFound')}</h1>
      <p className="mt-2 text-sm text-muted">{t('pages.notFoundText')}</p>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
        {t('pages.toHome')}
      </Link>
    </Card>
  )
}
