import { type KeyboardEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import { itemsApi } from '../api'
import { ApiError } from '../api/client'
import type { AttemptResult, Item } from '../api/types'
import { chatStorage } from '../chat/storage'
import { ResultTable, SchemaView } from '../chat/TaskParts'
import { Alert, Button, Card } from '../components/ui'
import { errorText } from '../i18n/errors'
import type { ChatLocationState } from './ChatPage'

const FEEDBACK_TONE = { correct: 'success', wrong_result: 'warning', sql_error: 'error' } as const

export function TaskPage() {
  const { sessionId } = useParams()
  return <TaskSession key={sessionId} sessionId={Number(sessionId)} />
}

function TaskSession({ sessionId }: { sessionId: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [item, setItem] = useState<Item | null>(
    () => (location.state as { item?: Item } | null)?.item ?? chatStorage.task(sessionId),
  )
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [loadingNext, setLoadingNext] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!item) {
    return (
      <Card className="mx-auto w-full max-w-md text-center">
        <p>{t('task.noTask')}</p>
        <Link
          to={`/chat/${sessionId}`}
          className="mt-4 inline-block font-medium text-primary hover:underline"
        >
          {t('task.backToChat')}
        </Link>
      </Card>
    )
  }
  const current = item

  async function check() {
    if (!answer.trim() || checking) return
    setChecking(true)
    setError(null)
    try {
      setResult(await itemsApi.attempt(sessionId, current.id, answer))
    } catch (err) {
      setError(errorText(t, err))
    } finally {
      setChecking(false)
    }
  }

  async function nextTask() {
    setLoadingNext(true)
    setError(null)
    try {
      const next = await itemsApi.next(sessionId, current.topic_id)
      chatStorage.saveTask(sessionId, next)
      setItem(next)
      setAnswer('')
      setResult(null)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? t('task.noItems') : errorText(t, err))
    } finally {
      setLoadingNext(false)
    }
  }

  function askHint() {
    const state: ChatLocationState = { hintTopicId: current.topic_id }
    navigate(`/chat/${sessionId}`, { state })
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      void check()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to={`/chat/${sessionId}`} className="text-sm font-medium text-primary hover:underline">
        ← {t('task.backToChat')}
      </Link>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-semibold">{t('pages.task')}</h1>
              <span className="text-xs text-muted">
                {t('task.difficulty', { level: current.difficulty })}
              </span>
            </div>
            <p className="mt-3 text-base leading-relaxed">{current.prompt}</p>
          </div>
          <SchemaView schema={current.schema} />
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <label htmlFor="sql-answer" className="text-sm font-medium">
              {t('task.yourQuery')}
            </label>
            <textarea
              id="sql-answer"
              rows={7}
              value={answer}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="SELECT …"
              className="resize-y rounded-lg border border-border bg-surface-muted p-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void check()} loading={checking} disabled={!answer.trim()}>
                {t('task.check')}
              </Button>
              <span className="text-xs text-muted">{t('task.shortcut')}</span>
            </div>
            {error && <Alert>{error}</Alert>}
          </Card>

          {result && (
            <Card className="flex flex-col gap-3">
              <Alert tone={FEEDBACK_TONE[result.feedback_code]}>
                {t(`feedback.${result.feedback_code}`)}
              </Alert>
              {result.error && (
                <pre className="overflow-x-auto rounded-lg bg-danger-soft p-3 font-mono text-sm whitespace-pre-wrap text-danger">
                  {result.error}
                </pre>
              )}
              {result.columns.length > 0 && (
                <ResultTable columns={result.columns} rows={result.rows} />
              )}
              <div className="flex flex-wrap gap-2">
                {result.correct ? (
                  <Button onClick={() => void nextTask()} loading={loadingNext}>
                    {t('task.next')}
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={askHint}>
                      {t('task.askHint')}
                    </Button>
                    <Button variant="ghost" onClick={() => void nextTask()} loading={loadingNext}>
                      {t('task.skip')}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
