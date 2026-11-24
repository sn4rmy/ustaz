import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { AttemptResult } from '../api/types'
import { Alert, Button, Card } from '../components/ui'
import { gsap, useGSAP } from '../motion/gsap'
import { DURATION, EASE, MEDIA } from '../motion/tokens'
import { ResultTable } from './TaskParts'

const FEEDBACK_TONE = { correct: 'success', wrong_result: 'warning', sql_error: 'error' } as const

interface Props {
  result: AttemptResult
  loadingNext: boolean
  onNext: () => void
  onHint: () => void
}

// The check result. Each new result: the card fades in, the rows of the table appear
// one by one, and for a correct answer the check mark is drawn.
export function AttemptResultView({ result, loadingNext, onNext, onHint }: Props) {
  const { t } = useTranslation()
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MEDIA.motion, () => {
        const tl = gsap.timeline({ defaults: { ease: EASE.out } })
        tl.from(root.current, { opacity: 0, y: 12, duration: DURATION.fast })
        if (result.correct) {
          gsap.set('.result-check', { strokeDasharray: 1, strokeDashoffset: 1 })
          tl.to('.result-check', { strokeDashoffset: 0, duration: DURATION.base })
        }
        // The whole wave takes at most 0.6 s, even for 50 rows.
        tl.from(
          'tbody tr',
          { opacity: 0, y: 8, duration: DURATION.fast, stagger: { amount: Math.min(0.6, result.rows.length * 0.08) } },
          '<',
        )
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [result], revertOnUpdate: true },
  )

  return (
    <div ref={root}>
      <Card className="flex flex-col gap-3">
        <Alert tone={FEEDBACK_TONE[result.feedback_code]}>
          <span className="flex items-center gap-2">
            {result.correct && (
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10" className="fill-none stroke-current" strokeWidth={2} />
                <path
                  d="M7 12.5l3.2 3.2L17 9"
                  pathLength={1}
                  className="result-check fill-none stroke-current"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {t(`feedback.${result.feedback_code}`)}
          </span>
        </Alert>
        {result.error && (
          <pre className="overflow-x-auto rounded-xl bg-danger-soft p-3 font-mono text-sm whitespace-pre-wrap text-danger">
            {result.error}
          </pre>
        )}
        {result.columns.length > 0 && <ResultTable columns={result.columns} rows={result.rows} />}
        <div className="flex flex-wrap gap-2">
          {result.correct ? (
            <Button onClick={onNext} loading={loadingNext}>
              {t('task.next')}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onHint}>
                {t('task.askHint')}
              </Button>
              <Button variant="ghost" onClick={onNext} loading={loadingNext}>
                {t('task.skip')}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
