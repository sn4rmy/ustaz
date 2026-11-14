import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { billingApi } from '../api'
import type { Plan, PlanInfo, Price, Subscription } from '../api/types'
import { useAuth } from '../auth/context'
import { openPaddleCheckout } from '../billing/paddle'
import { PlanBadge } from '../components/Layout'
import { Alert, Button, Card, Loading } from '../components/ui'
import { isLanguage } from '../i18n'
import { errorText } from '../i18n/errors'

// After payment the webhook updates the plan with a delay, so the page polls for it.
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 30000

type Notice = { tone: 'success' | 'info' | 'error'; text: string } | null

export function PricingPage() {
  const { t, i18n } = useTranslation()
  const { user, reloadUser } = useAuth()
  const [plans, setPlans] = useState<PlanInfo[] | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const pollTimer = useRef<number | null>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([billingApi.plans(), billingApi.subscription()])
      .then(([planList, current]) => {
        if (cancelled) return
        setPlans(planList)
        setSubscription(current)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorText(t, err))
      })
    return () => {
      cancelled = true
    }
  }, [t, reloadKey])

  function retryLoad() {
    setLoadError(null)
    setReloadKey((key) => key + 1)
  }

  const stopPolling = useCallback(() => {
    if (pollTimer.current !== null) window.clearTimeout(pollTimer.current)
    pollTimer.current = null
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  const becamePremium = useCallback(
    (current: Subscription) => {
      setSubscription(current)
      setPaying(false)
      setNotice({ tone: 'success', text: t('pricing.success') })
      void reloadUser().catch(() => {})
    },
    [reloadUser, t],
  )

  const pollSubscription = useCallback(() => {
    const startedAt = Date.now()
    const tick = async () => {
      try {
        const current = await billingApi.subscription()
        if (current.plan === 'premium') {
          becamePremium(current)
          return
        }
      } catch {
        // A temporary error: try again on the next tick.
      }
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setPaying(false)
        setNotice({ tone: 'info', text: t('pricing.pending') })
        return
      }
      pollTimer.current = window.setTimeout(() => void tick(), POLL_INTERVAL_MS)
    }
    void tick()
  }, [becamePremium, t])

  async function upgrade() {
    if (!user) return
    setPaying(true)
    setNotice(null)
    try {
      const checkout = await billingApi.checkout()
      if (checkout.provider === 'mock') {
        becamePremium(await billingApi.completeMock())
        return
      }
      await openPaddleCheckout(
        {
          environment: checkout.environment,
          clientToken: checkout.client_token,
          priceId: checkout.price_id,
          email: user.email,
          customData: checkout.custom_data,
          language: isLanguage(i18n.language) ? i18n.language : 'ru',
        },
        (event) => {
          if (event === 'completed') {
            setNotice({ tone: 'info', text: t('pricing.processing') })
            pollSubscription()
          } else if (event === 'error') {
            setNotice({ tone: 'error', text: t('pricing.paymentError') })
          } else if (pollTimer.current === null) {
            // Closed without paying.
            setPaying(false)
          }
        },
      )
    } catch (err) {
      setPaying(false)
      const text =
        err instanceof Error && err.message === 'paddle_unavailable'
          ? t('pricing.paddleUnavailable')
          : errorText(t, err)
      setNotice({ tone: 'error', text })
    }
  }

  if (loadError) {
    return (
      <Alert>
        {loadError}{' '}
        <button type="button" className="font-medium underline" onClick={retryLoad}>
          {t('common.retry')}
        </button>
      </Alert>
    )
  }
  if (!plans || !subscription) return <Loading label={t('common.loading')} />

  const currentPlan: Plan = subscription.plan

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('pricing.title')}</h1>
        <p className="mt-1 text-muted">{t('pricing.subtitle')}</p>
      </div>

      <CurrentPlan subscription={subscription} />

      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard
            key={plan.code}
            plan={plan}
            current={plan.code === currentPlan}
            action={
              plan.code === 'premium' && currentPlan === 'free' ? (
                <Button className="w-full" loading={paying} onClick={() => void upgrade()}>
                  {t('pricing.upgrade')}
                </Button>
              ) : null
            }
          />
        ))}
      </div>

      <p className="text-xs text-muted">{t('pricing.note')}</p>
    </div>
  )
}

function formatPrice(price: Price, language: string): string {
  const amount = Number(price.amount)
  try {
    return new Intl.NumberFormat(language, { style: 'currency', currency: price.currency }).format(
      amount,
    )
  } catch {
    return `${price.amount} ${price.currency}`
  }
}

function PlanCard({
  plan,
  current,
  action,
}: {
  plan: PlanInfo
  current: boolean
  action: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const features = t(`pricing.features.${plan.code}`, { returnObjects: true }) as string[]
  return (
    <Card className={`flex flex-col gap-4 ${current ? 'ring-2 ring-primary' : ''}`}>
      <h2 className="text-lg font-semibold">{t(`plans.${plan.code}`)}</h2>
      <p>
        {plan.price ? (
          <>
            <span className="text-3xl font-bold">{formatPrice(plan.price, i18n.language)}</span>{' '}
            <span className="text-muted">
              / {t(`pricing.interval.${plan.price.interval}`, plan.price.interval)}
            </span>
          </>
        ) : (
          <span className="text-3xl font-bold">{t('pricing.free')}</span>
        )}
      </p>
      <p className="text-sm font-medium">
        {plan.daily_message_limit === null
          ? t('pricing.unlimited')
          : t('pricing.limit', { count: plan.daily_message_limit })}
      </p>
      <ul className="flex flex-1 flex-col gap-2 text-sm">
        {Array.isArray(features) &&
          features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span aria-hidden="true" className="text-success">
                ✓
              </span>
              {feature}
            </li>
          ))}
      </ul>
      {current ? (
        <p className="rounded-lg bg-surface-muted py-2 text-center text-sm font-medium text-muted">
          {t('pricing.currentPlan')}
        </p>
      ) : (
        action
      )}
    </Card>
  )
}

function CurrentPlan({ subscription }: { subscription: Subscription }) {
  const { t, i18n } = useTranslation()
  const limit = subscription.daily_message_limit
  const used = subscription.messages_used_today
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const periodEnd = subscription.current_period_end
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
        new Date(subscription.current_period_end),
      )
    : null

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{t('pricing.yourPlan')}</span>
        <PlanBadge plan={subscription.plan} />
        {periodEnd && (
          <span className="text-sm text-muted">{t('pricing.periodEnd', { date: periodEnd })}</span>
        )}
      </div>
      {limit === null ? (
        <p className="text-sm">{t('pricing.usedUnlimited', { used })}</p>
      ) : (
        <div>
          <div className="flex justify-between text-sm">
            <span>{t('pricing.usedToday')}</span>
            <span className="font-medium">
              {used} / {limit}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={used}
            aria-label={t('pricing.usedToday')}
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className={`h-full rounded-full ${percent >= 100 ? 'bg-danger' : 'bg-primary'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
