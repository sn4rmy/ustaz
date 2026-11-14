import {
  mockAuth,
  mockBilling,
  mockChat,
  mockCourses,
  mockItems,
  withMockPlan,
} from '../mocks/handlers'
import { request } from './client'
import { isMocked } from './config'
import { tokens } from './tokens'
import type {
  AccessToken,
  AttemptResult,
  CheckoutResponse,
  Course,
  Item,
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
} from './types'

// One function per endpoint of docs/api.md. VITE_MOCK_API decides which ones use test data.

export const authApi = {
  register: (data: RegisterRequest): Promise<User> =>
    isMocked('auth')
      ? mockAuth.register(data)
      : request('/api/auth/register', { method: 'POST', body: data, auth: false }),

  login: (data: LoginRequest): Promise<TokenPair> =>
    isMocked('auth')
      ? mockAuth.login(data)
      : request('/api/auth/login', { method: 'POST', body: data, auth: false }),

  refresh: (refreshToken: string): Promise<AccessToken> =>
    isMocked('auth')
      ? mockAuth.refresh(refreshToken)
      : request('/api/auth/refresh', {
          method: 'POST',
          body: { refresh_token: refreshToken },
          auth: false,
        }),
}

// The plan comes from billing, so with mocked billing it is taken from the test data.
const planFromBilling = (user: User): User =>
  isMocked('billing') && !isMocked('auth') ? withMockPlan(user) : user

export const usersApi = {
  me: (): Promise<User> =>
    isMocked('auth')
      ? mockAuth.me(tokens.access())
      : request<User>('/api/users/me').then(planFromBilling),

  update: (data: UserUpdate): Promise<User> =>
    isMocked('auth')
      ? mockAuth.updateMe(tokens.access(), data)
      : request<User>('/api/users/me', { method: 'PATCH', body: data }).then(planFromBilling),
}

export const coursesApi = {
  list: (): Promise<Course[]> => (isMocked('courses') ? mockCourses.list() : request('/api/courses')),

  topics: (courseId: number): Promise<Topic[]> =>
    isMocked('courses')
      ? mockCourses.topics(courseId)
      : request(`/api/courses/${courseId}/topics`),
}

export const chatApi = {
  createSession: (courseId: number): Promise<StudySession> =>
    isMocked('chat')
      ? mockChat.createSession(courseId)
      : request('/api/sessions', { method: 'POST', body: { course_id: courseId } }),

  messages: (sessionId: number): Promise<Message[]> =>
    isMocked('chat')
      ? mockChat.messages(sessionId)
      : request(`/api/sessions/${sessionId}/messages`),

  send: (sessionId: number, data: SendMessageRequest): Promise<Message> =>
    isMocked('chat')
      ? mockChat.send(sessionId, data)
      : request(`/api/sessions/${sessionId}/messages`, { method: 'POST', body: data }),
}

export const itemsApi = {
  next: (sessionId: number, topicId: number): Promise<Item> =>
    isMocked('items')
      ? mockItems.next(sessionId, topicId)
      : request(`/api/sessions/${sessionId}/items/next`, {
          method: 'POST',
          body: { topic_id: topicId },
        }),

  attempt: (sessionId: number, itemId: number, answer: string): Promise<AttemptResult> =>
    isMocked('items')
      ? mockItems.attempt(sessionId, itemId, answer)
      : request(`/api/sessions/${sessionId}/attempts`, {
          method: 'POST',
          body: { item_id: itemId, answer },
        }),
}

export const billingApi = {
  plans: (): Promise<PlanInfo[]> =>
    isMocked('billing') ? mockBilling.plans() : request('/api/billing/plans'),

  subscription: (): Promise<Subscription> =>
    isMocked('billing') ? mockBilling.subscription() : request('/api/billing/subscription'),

  checkout: (): Promise<CheckoutResponse> =>
    isMocked('billing')
      ? mockBilling.checkout()
      : request('/api/billing/checkout', { method: 'POST' }),

  completeMock: (): Promise<Subscription> =>
    isMocked('billing')
      ? mockBilling.completeMock()
      : request('/api/billing/mock/complete', { method: 'POST' }),
}
