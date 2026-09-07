import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, apiErrorMessage, UNAUTHORIZED_EVENT } from '../lib/api'
import { clearToken, getToken, setToken } from '../lib/token'

interface AuthContextValue {
  isAuthenticated: boolean
  isLoggingIn: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
  }, [])

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout)
  }, [logout])

  const login = useCallback(async (username: string, password: string) => {
    setIsLoggingIn(true)
    try {
      const { access_token } = await api.login({ username, password })
      setToken(access_token)
      setTokenState(access_token)
    } catch (error) {
      throw new Error(apiErrorMessage(error, 'Login failed. Check your credentials.'))
    } finally {
      setIsLoggingIn(false)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: Boolean(token), isLoggingIn, login, logout }),
    [token, isLoggingIn, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
