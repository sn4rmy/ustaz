import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { authApi, usersApi } from '../api'
import { configureAuth } from '../api/client'
import { tokens } from '../api/tokens'
import type { RegisterRequest, User, UserUpdate } from '../api/types'
import { type AuthContextValue, type AuthStatus, AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(tokens.access() ? 'loading' : 'anonymous')

  const applyUser = useCallback(
    (next: User) => {
      setUser(next)
      setStatus('authenticated')
      // The language saved in the profile wins over the one in this browser.
      if (i18n.language !== next.language) void i18n.changeLanguage(next.language)
    },
    [i18n],
  )

  const logout = useCallback(() => {
    tokens.clear()
    setUser(null)
    setStatus('anonymous')
  }, [])

  useEffect(() => {
    configureAuth({
      refresh: async (refreshToken) => (await authApi.refresh(refreshToken)).access_token,
      onSessionExpired: () => {
        setUser(null)
        setStatus('anonymous')
      },
    })
    return () => configureAuth(null)
  }, [])

  // Restores the session after a page reload.
  useEffect(() => {
    if (!tokens.access()) return
    let cancelled = false
    usersApi
      .me()
      .then((me) => {
        if (!cancelled) applyUser(me)
      })
      .catch(() => {
        if (!cancelled) logout()
      })
    return () => {
      cancelled = true
    }
  }, [applyUser, logout])

  const login = useCallback(
    async (email: string, password: string) => {
      tokens.save(await authApi.login({ email, password }))
      const me = await usersApi.me()
      applyUser(me)
      return me
    },
    [applyUser],
  )

  const register = useCallback(
    async (data: RegisterRequest) => {
      await authApi.register(data)
      return login(data.email, data.password)
    },
    [login],
  )

  const updateProfile = useCallback(
    async (data: UserUpdate) => {
      const updated = await usersApi.update(data)
      setUser(updated)
      return updated
    },
    [],
  )

  const reloadUser = useCallback(async () => {
    setUser(await usersApi.me())
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, updateProfile, reloadUser }),
    [user, status, login, register, logout, updateProfile, reloadUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
