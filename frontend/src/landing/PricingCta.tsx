import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { billingApi } from '../api'
import { isMocked } from '../api/config'
import type { Plan, PlanInfo } from '../api/types'
import { useAuth } from '../auth/context'
import { formatPrice } from '../billing/format'
import { ButtonLink } from '../components/ui'
import { gsap, useGSAP } from '../motion/gsap'
import { DURATION, EASE, MEDIA } from '../motion/tokens'
import { SectionLabel } from './SectionLabel'

const PLAN_CODES: Plan[] = ['free', 'premium']

// 06. Short pricing and the final call to action. Cards and the call slide in on view.
export function PricingCta() {
  const { t } = useTranslation()
  const { status } = useAuth()
  const root = useRef<HTMLElement>(null)
  const plans = usePlans()

  useGSAP(
    () => {
      const mm = gsap.matchMedia(root.current ?? undefined)
      mm.add(MEDIA.motion, () => {
        for (const element of gsap.utils.toArray<HTMLElement>('.pricing-reveal')) {
          gsap.from(element, {
            opacity: 0,
            y: 40,
            duration: DURATION.slow,
            ease: EASE.out,
            scrollTrigger: { trigger: element, start: 'top 85%', toggleActions: 'play none none none' },
          })
        }
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  const signedIn = status === 'authenticated'

  return (
    <section ref={root}>
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <SectionLabel number="06" text={t('landing.pricing.label')} />
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">
          {t('landing.pricing.title')}
        </h2>
        <p className="mt-4 max-w-2xl text-muted">{t('landing.pricing.text')}</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {PLAN_CODES.map((code) => (
            <PlanSummary key={code} code={code} plan={plans?.find((p) => p.code === code)} />
          ))}
        </div>

        <div className="pricing-reveal mt-16 rounded-[28px] bg-primary px-6 py-12 text-center text-primary-fg sm:px-12 sm:py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            {t('landing.cta.title')}
          </h2>
          <p className="mt-4 opacity-90">{t('landing.cta.text')}</p>
          <ButtonLink
            to={signedIn ? '/chat' : '/register'}
            variant="secondary"
            className="mt-8 border-transparent px-8 text-base"
          >
            {signedIn ? t('landing.nav.openChat') : t('landing.cta.start')} →
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

// GET /api/billing/plans needs a signed-in user, so a guest on the real backend gets
// the cards without price and limit. With mocked billing the mock answers for everyone.
function usePlans(): PlanInfo[] | null {
  const { status } = useAuth()
  const [plans, setPlans] = useState<PlanInfo[] | null>(null)

  useEffect(() => {
    if (status !== 'authenticated' && !isMocked('billing')) return
    let cancelled = false
    billingApi
      .plans()
      .then((list) => {
        if (!cancelled) setPlans(list)
      })
      .catch(() => {
        // Not critical: the cards still show the plan names and features.
      })
    return () => {
      cancelled = true
    }
  }, [status])

  return plans
}

function PlanSummary({ code, plan }: { code: Plan; plan: PlanInfo | undefined }) {
  const { t, i18n } = useTranslation()
  const features = t(`pricing.features.${code}`, { returnObjects: true }) as string[]
  return (
    <div
      className={`pricing-reveal flex flex-col gap-3 rounded-[20px] border bg-surface p-6 shadow-card ${
        code === 'premium' ? 'border-primary' : 'border-border'
      }`}
    >
      <h3 className="text-lg font-semibold">{t(`plans.${code}`)}</h3>
      {plan && (
        <p>
          <span className="font-display text-3xl font-bold">
            {plan.price ? formatPrice(plan.price, i18n.language) : t('pricing.free')}
          </span>
          {plan.price && (
            <span className="text-muted">
              {' '}
              / {t(`pricing.interval.${plan.price.interval}`, plan.price.interval)}
            </span>
          )}
        </p>
      )}
      {plan && (
        <p className="text-sm font-medium">
          {plan.daily_message_limit === null
            ? t('pricing.unlimited')
            : t('pricing.limit', { count: plan.daily_message_limit })}
        </p>
      )}
      <ul className="flex flex-col gap-2 text-sm">
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
    </div>
  )
}
