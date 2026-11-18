import { ApiError } from '../api/client'
import type {
  AccessToken,
  AttemptResult,
  CheckoutResponse,
  Course,
  Item,
  Language,
  LoginRequest,
  Message,
  PlanInfo,
  RegisterRequest,
  SendMessageRequest,
  StudySession,
  Subscription,
  Topic,
  TokenPair,
  User,
  UserUpdate,
} from '../api/types'
import i18n from '../i18n'
import { COURSE, EXPLANATIONS, HINT, ITEMS, MATERIALS, NO_TOPIC, SCHEMA, TOPICS } from './course'
import { delay, type MockUser, nextId, save, state, today } from './store'

// Fake backend: same answers and error codes as described in docs/api.md.

const FREE_DAILY_LIMIT = 20

function currentLanguage(): Language {
  const lang = i18n.language
  return lang === 'kk' || lang === 'en' ? lang : 'ru'
}

// ---------- auth and users ----------

function toUser(user: MockUser): User {
  const { id, email, name, language, role } = user
  return { id, email, name, language, role, plan: state.plan }
}

function issueTokens(user: MockUser): TokenPair {
  return {
    access_token: `mock-access-${user.id}`,
    refresh_token: `mock-refresh-${user.id}`,
    token_type: 'bearer',
  }
}

function userFromToken(token: string | null, prefix: string): MockUser | undefined {
  if (!token?.startsWith(prefix)) return undefined
  const id = Number(token.slice(prefix.length))
  return state.users.find((user) => user.id === id)
}

function requireUser(token: string | null): MockUser {
  if (!token) throw new ApiError(401, 'not_authenticated')
  const user = userFromToken(token, 'mock-access-')
  if (!user) throw new ApiError(401, 'invalid_token')
  return user
}

export const mockAuth = {
  register(data: RegisterRequest): Promise<User> {
    const email = data.email.trim().toLowerCase()
    if (state.users.some((user) => user.email === email)) {
      return Promise.reject(new ApiError(409, 'email_taken'))
    }
    const user: MockUser = { ...data, email, name: data.name.trim(), id: nextId(), role: 'student' }
    state.users.push(user)
    save()
    return delay(toUser(user))
  },

  login(data: LoginRequest): Promise<TokenPair> {
    const email = data.email.trim().toLowerCase()
    const user = state.users.find((u) => u.email === email && u.password === data.password)
    if (!user) return Promise.reject(new ApiError(401, 'invalid_credentials'))
    return delay(issueTokens(user))
  },

  refresh(refreshToken: string): Promise<AccessToken> {
    const user = userFromToken(refreshToken, 'mock-refresh-')
    if (!user) return Promise.reject(new ApiError(401, 'invalid_token'))
    return delay({ access_token: issueTokens(user).access_token, token_type: 'bearer' })
  },

  me(token: string | null): Promise<User> {
    try {
      return delay(toUser(requireUser(token)), 150)
    } catch (error) {
      return Promise.reject(error)
    }
  },

  updateMe(token: string | null, data: UserUpdate): Promise<User> {
    try {
      const user = requireUser(token)
      if (data.name !== undefined) user.name = data.name.trim()
      if (data.language !== undefined) user.language = data.language
      save()
      return delay(toUser(user), 150)
    } catch (error) {
      return Promise.reject(error)
    }
  },
}

// ---------- courses ----------

export const mockCourses = {
  list: (): Promise<Course[]> => delay([COURSE]),
  topics(courseId: number): Promise<Topic[]> {
    if (courseId !== COURSE.id) return Promise.reject(new ApiError(404, 'course_not_found'))
    return delay(TOPICS)
  },
}

// ---------- chat ----------

function findSession(sessionId: number) {
  const session = state.sessions.find((s) => s.id === sessionId)
  if (!session) throw new ApiError(404, 'session_not_found')
  return session
}

function countMessage(): void {
  if (state.usage.date !== today()) state.usage = { date: today(), count: 0 }
  if (state.plan === 'free' && state.usage.count >= FREE_DAILY_LIMIT) {
    throw new ApiError(429, 'daily_limit_reached')
  }
  state.usage.count += 1
}

function teacherReply(data: SendMessageRequest): Pick<Message, 'content' | 'citations'> {
  const lang = currentLanguage()
  const topicId = data.topic_id
  if (topicId === undefined || !EXPLANATIONS[topicId]) {
    return { content: NO_TOPIC[lang], citations: [] }
  }
  const material = MATERIALS[topicId]
  const citations = [
    { material_id: material.id, material_title: material.title, chunk_id: material.chunkId },
  ]
  const content = data.action === 'hint' ? HINT[lang] : EXPLANATIONS[topicId][lang]
  return { content, citations }
}

export const mockChat = {
  createSession(courseId: number): Promise<StudySession> {
    const session = {
      id: nextId(),
      user_id: 0,
      course_id: courseId,
      created_at: new Date().toISOString(),
    }
    state.sessions.push(session)
    state.messages[session.id] = []
    save()
    const { id, course_id, created_at } = session
    return delay({ id, course_id, created_at })
  },

  messages(sessionId: number): Promise<Message[]> {
    try {
      findSession(sessionId)
      // A copy: the page keeps its own list in React state.
      return delay([...(state.messages[sessionId] ?? [])])
    } catch (error) {
      return Promise.reject(error)
    }
  },

  send(sessionId: number, data: SendMessageRequest): Promise<Message> {
    try {
      findSession(sessionId)
      countMessage()
    } catch (error) {
      save()
      return Promise.reject(error)
    }
    const now = new Date().toISOString()
    const history = (state.messages[sessionId] ??= [])
    history.push({
      id: nextId(),
      role: 'user',
      agent: null,
      content: data.content,
      citations: [],
      ai_generated: false,
      created_at: now,
    })
    const answer: Message = {
      id: nextId(),
      role: 'assistant',
      agent: 'teacher',
      ai_generated: true,
      created_at: now,
      ...teacherReply(data),
    }
    history.push(answer)
    save()
    return delay({ ...answer }, 900)
  },
}

// ---------- items ----------

const WRITE_STATEMENT = /\b(insert|update|delete|drop|alter|create|replace|truncate|attach|pragma)\b/i

// Lowercase, single spaces, no spaces around punctuation, no trailing semicolon.
function normalize(sql: string): string {
  return sql
    .toLowerCase()
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s*([,()=<>*])\s*/g, '$1')
    .replace(/;\s*$/, '')
    .trim()
}

export const mockItems = {
  next(sessionId: number, topicId: number): Promise<Item> {
    try {
      findSession(sessionId)
    } catch (error) {
      return Promise.reject(error)
    }
    const items = ITEMS.filter((item) => item.topicId === topicId)
    if (items.length === 0) return Promise.reject(new ApiError(404, 'no_items'))
    const cursor = state.itemCursor[topicId] ?? 0
    state.itemCursor[topicId] = cursor + 1
    save()
    const item = items[cursor % items.length]
    return delay({
      id: item.id,
      topic_id: item.topicId,
      type: 'sql_query',
      prompt: item.prompt,
      schema: SCHEMA,
      difficulty: item.difficulty,
    })
  },

  attempt(sessionId: number, itemId: number, answer: string): Promise<AttemptResult> {
    const item = ITEMS.find((i) => i.id === itemId)
    if (!state.sessions.some((s) => s.id === sessionId) || !item) {
      return Promise.reject(new ApiError(404, 'item_not_found'))
    }
    const base = { attempt_id: nextId(), columns: [], rows: [] }
    const sql = answer.trim()
    if (WRITE_STATEMENT.test(sql)) {
      return delay({ ...base, correct: false, score: 0, feedback_code: 'sql_error', error: 'attempt to write a readonly database' }, 500)
    }
    if (!/^(select|with)\b/i.test(sql)) {
      return delay({ ...base, correct: false, score: 0, feedback_code: 'sql_error', error: `near "${sql.split(/\s+/)[0] ?? ''}": syntax error` }, 500)
    }
    if (item.answers.map(normalize).includes(normalize(sql))) {
      return delay({ ...base, correct: true, score: 1, feedback_code: 'correct', columns: item.columns, rows: item.rows, error: null }, 500)
    }
    // The fake backend can't run SQL, so a wrong answer comes back without rows.
    return delay({ ...base, correct: false, score: 0, feedback_code: 'wrong_result', error: null }, 500)
  },
}

// ---------- billing ----------

function subscription(): Subscription {
  const premium = state.plan === 'premium'
  return {
    plan: state.plan,
    status: 'active',
    current_period_end: state.periodEnd,
    messages_used_today: state.usage.date === today() ? state.usage.count : 0,
    daily_message_limit: premium ? null : FREE_DAILY_LIMIT,
  }
}

// With a real auth backend but mocked billing, the plan shown in the header follows the mock.
export function withMockPlan(user: User): User {
  return { ...user, plan: state.plan }
}

export const mockBilling = {
  plans: (): Promise<PlanInfo[]> =>
    delay([
      { code: 'free', daily_message_limit: FREE_DAILY_LIMIT, price: null },
      {
        code: 'premium',
        daily_message_limit: null,
        price: { amount: '4.99', currency: 'USD', interval: 'month' },
      },
    ]),
  subscription: (): Promise<Subscription> => delay(subscription(), 200),
  checkout: (): Promise<CheckoutResponse> => delay({ provider: 'mock' }),
  completeMock(): Promise<Subscription> {
    state.plan = 'premium'
    const end = new Date()
    end.setMonth(end.getMonth() + 1)
    state.periodEnd = end.toISOString()
    save()
    return delay(subscription(), 800)
  },
}
