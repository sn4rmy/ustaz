import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { EXPLANATIONS, ITEMS } from '../mocks/course'
import { gsap, useGSAP } from '../motion/scroll'
import { MEDIA } from '../motion/tokens'
import { SectionLabel } from './SectionLabel'

// The JOIN example from the course notes and the result of the matching task (#41).
const QUERY = /```sql\n([\s\S]*?)\n```/.exec(EXPLANATIONS[4].en)?.[1] ?? ''
const TASK = ITEMS.find((item) => item.id === 41)

// Builds the scene: the query types itself, "runs", rows slide in, a check mark draws.
// The same steps are scrubbed by the scroll on desktop and simply played on phones.
function buildTimeline(scrollTrigger: ScrollTrigger.Vars): gsap.core.Timeline {
  gsap.set('.sandbox-check', { strokeDasharray: 1, strokeDashoffset: 1 })
  return gsap
    .timeline({ scrollTrigger, defaults: { ease: 'none' } })
    .addLabel('type')
    .from('.sandbox-char', { opacity: 0, duration: 0.01, stagger: 0.03 })
    .addLabel('run')
    .from('.sandbox-run', { opacity: 0, duration: 0.2 })
    .from('.sandbox-progress', { scaleX: 0, duration: 0.8, ease: 'power1.inOut' })
    .addLabel('rows')
    .from('.sandbox-row', { opacity: 0, y: 14, duration: 0.25, stagger: 0.18, ease: 'power2.out' })
    .addLabel('check')
    .from('.sandbox-verdict', { opacity: 0, duration: 0.2 })
    .to('.sandbox-check', { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, '<')
}

// 03. Pinned on desktop for two screens of scrolling; on phones it plays once in view.
export function SandboxScene() {
  const { t } = useTranslation()
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia(root.current ?? undefined)
      mm.add(MEDIA.desktop, () => {
        buildTimeline({
          trigger: root.current,
          start: 'top top',
          end: '+=200%',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        })
      })
      mm.add(MEDIA.mobile, () => {
        buildTimeline({ trigger: '.sandbox-editor', start: 'top 75%', toggleActions: 'play none none none' })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  if (!TASK) return null

  return (
    <section ref={root} className="relative overflow-x-clip md:flex md:min-h-svh md:items-center">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:pt-20 md:pb-10">
        <div>
          <SectionLabel number="03" text={t('landing.sandbox.label')} />
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            {t('landing.sandbox.title')}
          </h2>
          <p className="mt-4 text-muted">{t('landing.sandbox.text')}</p>
          <p className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm">
            {t('landing.sandbox.task')}
          </p>
        </div>

        <div className="sandbox-editor overflow-hidden rounded-[20px] border border-border bg-surface shadow-pop">
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-danger/60" />
            <span className="size-2.5 rounded-full bg-warning/60" />
            <span className="size-2.5 rounded-full bg-success/60" />
            <span className="ml-2 font-mono text-xs text-muted">query.sql</span>
          </div>

          <pre className="min-h-28 bg-surface-muted px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap sm:text-sm">
            <span className="sr-only">{QUERY}</span>
            <span aria-hidden="true">
              {QUERY.split('').map((char, i) => (
                <span key={i} className="sandbox-char">
                  {char}
                </span>
              ))}
            </span>
          </pre>

          <div className="sandbox-run flex items-center gap-3 px-4 pt-3">
            <span className="text-xs font-medium text-muted">{t('landing.sandbox.run')}</span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <span className="sandbox-progress block h-full origin-left rounded-full bg-primary" />
            </span>
          </div>

          <div className="overflow-x-auto overflow-y-hidden px-4 py-3">
            <table className="w-full font-mono text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-muted">
                  {TASK.columns.map((column) => (
                    <th key={column} className="border-b border-border py-1.5 pr-4 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TASK.rows.map((row, i) => (
                  <tr key={i} className="sandbox-row">
                    {row.map((cell, j) => (
                      <td key={j} className="border-b border-border/60 py-1.5 pr-4">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sandbox-verdict flex items-center gap-2 border-t border-border bg-success-soft px-4 py-3 text-sm text-success">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" className="fill-none stroke-current" strokeWidth={2} />
              <path
                d="M7 12.5l3.2 3.2L17 9"
                pathLength={1}
                className="sandbox-check fill-none stroke-current"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-semibold">{t('landing.sandbox.correct')}</span>
            <span className="ml-auto text-xs">
              {t('landing.sandbox.rows', { count: TASK.rows.length })}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
