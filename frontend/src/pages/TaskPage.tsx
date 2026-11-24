import { type KeyboardEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import { itemsApi } from '../api'
import { ApiError } from '../api/client'
import type { AttemptResult, Item } from '../api/types'
import { AttemptResultView } from '../chat/AttemptResultView'
import { chatStorage } from '../chat/storage'
import { SchemaView } from '../chat/TaskParts'
import { Alert, Button, Card } from '../components/ui'
import { errorText } from '../i18n/errors'
import type { ChatLocationState } from './ChatPage'

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
              <h1 className="font-display tracking-tight text-lg font-semibold">{t('pages.task')}</h1>
              <span className="text-xs text-muted">
                {t('task.difficulty', { level: current.difficulty })}
              </span>
            </div>
            <p className="mt-3 text-lg leading-relaxed">{current.prompt}</p>
          </div>
          <SchemaView schema={current.schema} />
        </Card>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 overflow-hidden rounded-[20px] border border-border bg-surface shadow-card">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-danger/60" />
              <span aria-hidden="true" className="size-2.5 rounded-full bg-warning/60" />
              <span aria-hidden="true" className="size-2.5 rounded-full bg-success/60" />
              <label htmlFor="sql-answer" className="ml-2 text-sm font-medium">
                {t('task.yourQuery')}
              </label>
            </div>
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
              className="mx-4 resize-y rounded-xl border border-border bg-surface-muted p-3 font-mono text-sm leading-relaxed transition-shadow outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
            />
            <div className="flex flex-col gap-3 px-4 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => void check()} loading={checking} disabled={!answer.trim()}>
                  {t('task.check')}
                </Button>
                <span className="text-xs text-muted">{t('task.shortcut')}</span>
              </div>
              {error && <Alert>{error}</Alert>}
            </div>
          </div>

          {result && (
            <AttemptResultView
              result={result}
              loadingNext={loadingNext}
              onNext={() => void nextTask()}
              onHint={askHint}
            />
          )}
        </div>
      </div>
    </div>
  )
}
