import type { Item } from '../api/types'

// What the browser remembers about the chat: the last session, the selected topic and the
// open task. The course of a session comes from GET /api/sessions/{id}.

const SESSIONS_KEY = 'ustaz_sessions'
const LAST_SESSION_KEY = 'ustaz_last_session'
const TASK_KEY = (sessionId: number) => `ustaz_task_${sessionId}`

interface SessionInfo {
  topicId?: number
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Without storage the chat still works, it just forgets the topic on reload.
  }
}

function allSessions(): Record<string, SessionInfo> {
  return readJson<Record<string, SessionInfo>>(SESSIONS_KEY) ?? {}
}

export const chatStorage = {
  session(sessionId: number): SessionInfo | null {
    return allSessions()[sessionId] ?? null
  },

  saveSession(sessionId: number, info: SessionInfo): void {
    writeJson(SESSIONS_KEY, { ...allSessions(), [sessionId]: info })
    writeJson(LAST_SESSION_KEY, sessionId)
  },

  lastSessionId(): number | null {
    const id = readJson<number>(LAST_SESSION_KEY)
    return typeof id === 'number' ? id : null
  },

  task(sessionId: number): Item | null {
    return readJson<Item>(TASK_KEY(sessionId))
  },

  saveTask(sessionId: number, item: Item): void {
    writeJson(TASK_KEY(sessionId), item)
  },
}
