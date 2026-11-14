import type { Language, Message, Plan, Role } from '../api/types'

// State of the fake backend. Kept in localStorage, so a page reload doesn't log you out.

export interface MockUser {
  id: number
  email: string
  password: string
  name: string
  language: Language
  role: Role
}

export interface MockSession {
  id: number
  user_id: number
  course_id: number
  created_at: string
}

export interface MockState {
  lastId: number
  users: MockUser[]
  sessions: MockSession[]
  messages: Record<number, Message[]>
  // Index of the next item to give out, per topic.
  itemCursor: Record<number, number>
  plan: Plan
  periodEnd: string | null
  usage: { date: string; count: number }
}

const KEY = 'ustaz_mock_state'

function initialState(): MockState {
  return {
    lastId: 100,
    users: [],
    sessions: [],
    messages: {},
    itemCursor: {},
    plan: 'free',
    periodEnd: null,
    usage: { date: today(), count: 0 },
  }
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function load(): MockState {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return { ...initialState(), ...(JSON.parse(saved) as Partial<MockState>) }
  } catch {
    // Broken or unavailable storage: start from scratch.
  }
  return initialState()
}

export const state: MockState = load()

export function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Without storage the test data lives until reload.
  }
}

export function nextId(): number {
  state.lastId += 1
  return state.lastId
}

// Imitates network latency so loading states are visible.
export function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
