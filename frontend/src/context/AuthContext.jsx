import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api, { getToken, setToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore the session on load if a token is stored.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    api
      .get('/api/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const authenticate = useCallback((token, nextUser) => {
    setToken(token)
    setUser(nextUser)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/api/auth/login', { email, password })
      authenticate(data.token, data.user)
      return data.user
    },
    [authenticate]
  )

  const register = useCallback(
    async (payload) => {
      const { data } = await api.post('/api/auth/register', payload)
      authenticate(data.token, data.user)
      return data.user
    },
    [authenticate]
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  // Merge fresh fields into the current user (e.g. after a profile edit).
  const updateUser = useCallback((patch) => {
    setUser((u) => (u ? { ...u, ...patch } : u))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
