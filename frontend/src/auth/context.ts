import { createContext, useContext } from 'react'

import type { RegisterRequest, User, UserUpdate } from '../api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<User>
  register: (data: RegisterRequest) => Promise<User>
  logout: () => void
  updateProfile: (data: UserUpdate) => Promise<User>
  // Re-reads the user, e.g. after the plan has changed.
  reloadUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
