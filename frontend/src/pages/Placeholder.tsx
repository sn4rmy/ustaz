import { useTranslation } from 'react-i18next'

import { Card } from '../components/ui'

// Temporary page body until the screen itself is implemented.
export function Placeholder({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <Card className="w-full max-w-md">
      <h1 className="text-xl font-semibold">{t(titleKey)}</h1>
      <p className="mt-2 text-sm text-muted">{t('app.tagline')}</p>
    </Card>
  )
}
