import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { chatApi, coursesApi } from '../api'
import type { Course } from '../api/types'
import { chatStorage } from '../chat/storage'
import { Alert, Button, Card, Loading } from '../components/ui'
import { errorText } from '../i18n/errors'

// Entry point of the chat: continue the last session or start one for a course.
export function ChatStartPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const lastSessionId = chatStorage.lastSessionId()

  useEffect(() => {
    let cancelled = false
    coursesApi
      .list()
      .then((list) => {
        if (!cancelled) setCourses(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorText(t, err))
      })
    return () => {
      cancelled = true
    }
  }, [t, reloadKey])

  async function start(course: Course) {
    setStarting(course.id)
    setError(null)
    try {
      const session = await chatApi.createSession(course.id)
      chatStorage.saveSession(session.id, { courseId: course.id })
      navigate(`/chat/${session.id}`)
    } catch (err) {
      setError(errorText(t, err))
      setStarting(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('chat.startTitle')}</h1>
        <p className="mt-1 text-muted">{t('chat.startText')}</p>
      </div>

      {lastSessionId !== null && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <span>{t('chat.continueText')}</span>
          <Button variant="secondary" onClick={() => navigate(`/chat/${lastSessionId}`)}>
            {t('chat.continue')}
          </Button>
        </Card>
      )}

      {error && (
        <Alert>
          {error}{' '}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => {
              setError(null)
              setCourses(null)
              setReloadKey((key) => key + 1)
            }}
          >
            {t('common.retry')}
          </button>
        </Alert>
      )}

      {courses === null && !error && <Loading label={t('common.loading')} />}

      {courses?.length === 0 && <Alert tone="info">{t('chat.noCourses')}</Alert>}

      {courses?.map((course) => (
        <Card key={course.id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{course.title}</h2>
            <p className="text-sm text-muted">
              {t('chat.courseLanguage', { language: t(`languages.${course.language}`) })}
            </p>
          </div>
          <Button loading={starting === course.id} onClick={() => void start(course)}>
            {t('chat.newSession')}
          </Button>
        </Card>
      ))}
    </div>
  )
}
