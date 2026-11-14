import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import { chatApi, coursesApi, itemsApi } from '../api'
import { ApiError } from '../api/client'
import type { Message, MessageAction, SendMessageRequest, Topic } from '../api/types'
import { MessageBubble } from '../chat/MessageBubble'
import { chatStorage } from '../chat/storage'
import { Alert, Button, Loading, SelectField, Spinner } from '../components/ui'
import { errorText } from '../i18n/errors'

export interface ChatLocationState {
  // Set by the task page: ask the Teacher for a hint on this topic right away.
  hintTopicId?: number
}

let pendingId = -1

// key resets all state when the user switches to another session.
export function ChatPage() {
  const { sessionId } = useParams()
  return <ChatSession key={sessionId} sessionId={Number(sessionId)} />
}

function ChatSession({ sessionId }: { sessionId: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const stored = chatStorage.session(sessionId)

  const [topics, setTopics] = useState<Topic[]>([])
  const [topicId, setTopicId] = useState<number | undefined>(stored?.topicId)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingTask, setLoadingTask] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const hintHandled = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // A session opened from another browser has no saved course: take the first one.
        const courseId = stored?.courseId ?? (await coursesApi.list())[0]?.id
        const [history, courseTopics] = await Promise.all([
          chatApi.messages(sessionId),
          courseId === undefined ? Promise.resolve([]) : coursesApi.topics(courseId),
        ])
        if (cancelled) return
        if (courseId !== undefined && !stored) chatStorage.saveSession(sessionId, { courseId })
        setMessages(history)
        setTopics([...courseTopics].sort((a, b) => a.position - b.position))
      } catch (err) {
        if (!cancelled) {
          setMessages([])
          setError(errorText(t, err))
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // stored is read once per session; re-running on every render would reload the chat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, t])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  function selectTopic(id: number | undefined) {
    setTopicId(id)
    if (stored) chatStorage.saveSession(sessionId, { ...stored, topicId: id })
  }

  async function send(content: string, action?: MessageAction, topic = topicId) {
    const text = content.trim()
    if (!text || sending) return
    const data: SendMessageRequest = { content: text }
    if (topic !== undefined) data.topic_id = topic
    if (action) data.action = action

    const pending: Message = {
      id: pendingId--,
      role: 'user',
      agent: null,
      content: text,
      citations: [],
      ai_generated: false,
      created_at: new Date().toISOString(),
    }
    setMessages((list) => [...(list ?? []), pending])
    setSending(true)
    setError(null)
    try {
      const answer = await chatApi.send(sessionId, data)
      setMessages((list) => [...(list ?? []), answer])
    } catch (err) {
      setMessages((list) => (list ?? []).filter((m) => m.id !== pending.id))
      if (err instanceof ApiError && err.detail === 'daily_limit_reached') setLimitReached(true)
      else setError(errorText(t, err))
      if (!action) setInput(text)
    } finally {
      setSending(false)
    }
  }

  // Coming back from a task with "ask for a hint".
  useEffect(() => {
    const hintTopicId = (location.state as ChatLocationState | null)?.hintTopicId
    if (hintTopicId === undefined || messages === null || hintHandled.current) return
    hintHandled.current = true
    navigate(location.pathname, { replace: true, state: null })
    selectTopic(hintTopicId)
    void send(t('chat.hintPrompt'), 'hint', hintTopicId)
    // Runs once when the history has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  async function openTask() {
    if (topicId === undefined) return
    setLoadingTask(true)
    setError(null)
    try {
      const item = await itemsApi.next(sessionId, topicId)
      chatStorage.saveTask(sessionId, item)
      navigate(`/chat/${sessionId}/task`, { state: { item } })
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? t('task.noItems') : errorText(t, err))
      setLoadingTask(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const text = input
    setInput('')
    void send(text)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit(event)
    }
  }

  const topicTitle = topics.find((topic) => topic.id === topicId)?.title

  return (
    <div className="flex flex-1 flex-col gap-4 lg:flex-row">
      <aside className="lg:w-64 lg:shrink-0">
        <div className="lg:hidden">
          <SelectField
            label={t('chat.topic')}
            value={topicId ?? ''}
            onChange={(e) => selectTopic(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">{t('chat.anyTopic')}</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.position}. {topic.title}
              </option>
            ))}
          </SelectField>
        </div>
        <nav className="hidden lg:block" aria-label={t('chat.topics')}>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
            {t('chat.topics')}
          </p>
          <ul className="flex flex-col gap-1">
            {topics.map((topic) => (
              <li key={topic.id}>
                <button
                  type="button"
                  onClick={() => selectTopic(topic.id === topicId ? undefined : topic.id)}
                  aria-pressed={topic.id === topicId}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    topic.id === topicId
                      ? 'bg-primary-soft font-medium text-primary'
                      : 'text-text hover:bg-surface-muted'
                  }`}
                >
                  <span className="text-muted">{topic.position}.</span> {topic.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <section className="flex min-h-[60vh] flex-1 flex-col rounded-xl border border-border bg-surface">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages === null && <Loading label={t('common.loading')} />}
          {messages?.length === 0 && (
            <div className="py-10 text-center text-muted">
              <p className="font-medium text-text">{t('chat.emptyTitle')}</p>
              <p className="mt-1 text-sm">{t('chat.emptyText')}</p>
            </div>
          )}
          {messages?.map((message) => <MessageBubble key={message.id} message={message} />)}
          {sending && (
            <div role="status" className="flex items-center gap-2 text-sm text-muted">
              <Spinner small /> {t('chat.thinking')}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="space-y-3 border-t border-border p-3">
          {limitReached && (
            <Alert tone="warning">
              {t('errors.daily_limit_reached')}{' '}
              <Link to="/pricing" className="font-semibold underline">
                {t('chat.upgrade')}
              </Link>
            </Alert>
          )}
          {error && <Alert>{error}</Alert>}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={topicId === undefined || sending}
              onClick={() =>
                void send(t('chat.explainPrompt', { topic: topicTitle ?? '' }), 'explain')
              }
            >
              {t('chat.actions.explain')}
            </Button>
            <Button
              variant="secondary"
              disabled={topicId === undefined || sending}
              onClick={() => void send(t('chat.hintPrompt'), 'hint')}
            >
              {t('chat.actions.hint')}
            </Button>
            <Button
              variant="secondary"
              disabled={topicId === undefined}
              loading={loadingTask}
              onClick={() => void openTask()}
            >
              {t('chat.actions.task')}
            </Button>
            {topicId === undefined && (
              <span className="self-center text-xs text-muted">{t('chat.pickTopic')}</span>
            )}
          </div>

          <form className="flex items-end gap-2" onSubmit={submit}>
            <label htmlFor="chat-input" className="sr-only">
              {t('chat.inputLabel')}
            </label>
            <textarea
              id="chat-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('chat.placeholder')}
              className="max-h-40 min-h-12 flex-1 resize-y rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
            <Button type="submit" disabled={!input.trim() || sending}>
              {t('chat.send')}
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
