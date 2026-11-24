import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '../components/ui'
import { gsap, useGSAP } from '../motion/gsap'
import { MEDIA } from '../motion/tokens'
import { SectionLabel } from './SectionLabel'

// Example values: the real per-topic mastery comes later, from the Mentor.
const MASTERY = [86, 71, 54, 32, 12]

interface TopicText {
  title: string
}

// 05. Not pinned: when the block comes into view, the bars fill and the numbers count up.
// Without animation the final values are simply shown.
export function ProgressScene() {
  const { t } = useTranslation()
  const root = useRef<HTMLElement>(null)
  const topics = t('landing.topics.items', { returnObjects: true }) as TopicText[]

  useGSAP(
    () => {
      const mm = gsap.matchMedia(root.current ?? undefined)
      mm.add(MEDIA.motion, () => {
        const values = gsap.utils.toArray<HTMLElement>('.progress-value')
        const tl = gsap.timeline({
          scrollTrigger: { trigger: '.progress-list', start: 'top 75%', toggleActions: 'play none none none' },
        })
        tl.from('.progress-bar', { scaleX: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12 })
        values.forEach((element, i) => {
          const counter = { value: 0 }
          tl.to(
            counter,
            {
              value: MASTERY[i],
              duration: 1.2,
              ease: 'power3.out',
              onUpdate: () => {
                element.textContent = `${Math.round(counter.value)}%`
              },
            },
            i * 0.12,
          )
        })
        // If the animation is reverted halfway, put the real numbers back.
        return () => {
          values.forEach((element, i) => {
            element.textContent = `${MASTERY[i]}%`
          })
        }
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="border-y border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:py-28">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <SectionLabel number="05" text={t('landing.progress.label')} />
            <Badge className="bg-warning-soft text-warning">{t('landing.progress.soon')}</Badge>
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            {t('landing.progress.title')}
          </h2>
          <p className="mt-4 text-muted">{t('landing.progress.text')}</p>
        </div>

        <div className="rounded-[20px] border border-border bg-bg p-5 sm:p-6">
          <p className="font-mono text-xs text-muted uppercase">{t('landing.progress.example')}</p>
          <ul className="progress-list mt-4 space-y-4">
            {Array.isArray(topics) &&
              topics.map((topic, i) => (
                <li key={topic.title}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium">{topic.title}</span>
                    <span className="progress-value font-mono text-muted tabular-nums">
                      {MASTERY[i]}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="progress-bar h-full origin-left rounded-full bg-primary"
                      style={{ width: `${MASTERY[i]}%` }}
                    />
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
