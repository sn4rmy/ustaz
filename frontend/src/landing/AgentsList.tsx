import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { gsap, useGSAP } from '../motion/scroll'
import { DURATION, EASE, MEDIA } from '../motion/tokens'

const STEPS = ['orchestrator', 'teacher', 'examiner', 'mentor'] as const

// 02 on phones: the same story as a vertical list, without pinning. A line on the left
// grows with the scroll and each step slides in when it reaches the screen.
export function AgentsList({ titles }: { titles: Record<string, string> }) {
  const { t } = useTranslation()
  const root = useRef<HTMLOListElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia(root.current ?? undefined)
      mm.add(MEDIA.mobile, () => {
        gsap.from('.agents-list-line', {
          scaleY: 0,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top 75%', end: 'bottom 60%', scrub: true },
        })
        for (const item of gsap.utils.toArray<HTMLElement>('.agents-list-item')) {
          gsap.from(item, {
            opacity: 0,
            x: 24,
            duration: DURATION.base,
            ease: EASE.out,
            scrollTrigger: { trigger: item, start: 'top 85%', toggleActions: 'play none none reverse' },
          })
        }
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <ol ref={root} className="relative flex flex-col gap-4 pl-6 md:hidden">
      <span
        aria-hidden="true"
        className="agents-list-line absolute top-2 bottom-2 left-1.5 w-0.5 origin-top rounded-full bg-primary/40"
      />
      <li className="agents-list-item rounded-2xl border border-border bg-bg p-4">
        <p className="text-sm font-semibold">{titles.question}</p>
        <p className="mt-1 text-sm text-muted italic">{t('landing.agents.questionText')}</p>
      </li>
      {STEPS.map((step) => (
        <li key={step} className="agents-list-item rounded-2xl border border-border bg-bg p-4">
          <p className="text-sm font-semibold">
            {titles[step]}{' '}
            <span className="font-normal text-muted">· {t(`landing.agents.roles.${step}`)}</span>
          </p>
          <p className="mt-1 text-sm text-muted">{t(`landing.agents.steps.${step}`)}</p>
        </li>
      ))}
    </ol>
  )
}
