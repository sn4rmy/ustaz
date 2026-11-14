import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Card } from '../components/ui'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Card className="mx-auto mt-8 w-full max-w-md text-center">
      <h1 className="text-xl font-semibold">{t('pages.notFound')}</h1>
      <p className="mt-2 text-sm text-muted">{t('pages.notFoundText')}</p>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
        {t('pages.toHome')}
      </Link>
    </Card>
  )
}
