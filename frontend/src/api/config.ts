export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export type ApiModule = 'auth' | 'courses' | 'chat' | 'items' | 'billing'

const MOCK_SETTING = (import.meta.env.VITE_MOCK_API ?? 'courses,chat,items,billing').trim()
const mockedModules = new Set(
  MOCK_SETTING.split(',')
    .map((name) => name.trim())
    .filter(Boolean),
)

// True when this part of the API answers with test data from src/mocks.
export function isMocked(module: ApiModule): boolean {
  if (MOCK_SETTING === 'none') return false
  return MOCK_SETTING === 'all' || mockedModules.has(module)
}
