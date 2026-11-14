// Request and response types, one-to-one with docs/api.md.

export type Language = 'kk' | 'ru' | 'en'
export type Role = 'student' | 'admin'
export type Plan = 'free' | 'premium'

export interface User {
  id: number
  email: string
  name: string
  language: Language
  role: Role
  plan: Plan
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  language: Language
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
}

export interface AccessToken {
  access_token: string
  token_type: 'bearer'
}

export interface UserUpdate {
  name?: string
  language?: Language
}

export interface Course {
  id: number
  title: string
  language: Language
}

export interface Topic {
  id: number
  title: string
  position: number
}

export interface StudySession {
  id: number
  course_id: number
  created_at: string
}

export interface Citation {
  material_id: number
  material_title: string
  chunk_id: number
}

export type MessageRole = 'user' | 'assistant'
export type AgentName = 'teacher' | 'examiner' | 'mentor'
export type MessageAction = 'explain' | 'hint'

export interface Message {
  id: number
  role: MessageRole
  agent: AgentName | null
  content: string
  citations: Citation[]
  ai_generated: boolean
  created_at: string
}

export interface SendMessageRequest {
  content: string
  topic_id?: number
  action?: MessageAction
}

export interface TableSchema {
  table: string
  columns: string[]
}

export interface Item {
  id: number
  topic_id: number
  type: string
  prompt: string
  schema: TableSchema[]
  difficulty: number
}

export type FeedbackCode = 'correct' | 'wrong_result' | 'sql_error'
export type Cell = string | number | boolean | null

export interface AttemptResult {
  attempt_id: number
  correct: boolean
  score: number
  feedback_code: FeedbackCode
  columns: string[]
  rows: Cell[][]
  error: string | null
}

export interface Price {
  amount: string
  currency: string
  interval: string
}

export interface PlanInfo {
  code: Plan
  daily_message_limit: number | null
  price: Price | null
}

export interface Subscription {
  plan: Plan
  status: string
  current_period_end: string | null
  messages_used_today: number
  daily_message_limit: number | null
}

export type CheckoutResponse =
  | {
      provider: 'paddle'
      environment: 'sandbox' | 'production'
      client_token: string
      price_id: string
      custom_data: Record<string, string>
    }
  | { provider: 'mock' }
