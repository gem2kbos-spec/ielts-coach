import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { login as apiLogin, register as apiRegister, getMe, type AuthUser } from '@/lib/api'
import { getToken, setToken, clearToken, setupAuthFetch, onUnauthorized } from '@/lib/auth'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setupAuthFetch()
    if (!getToken()) {
      setLoading(false)
      return
    }
    getMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // token过期/失效会在任意一次API调用时被全局fetch拦截器发现(401)，
    // 这里统一收口：清空登录态+整页跳回登录页(不用react-router的navigate，
    // 避免在一个不确定是哪个组件触发的401当下去动路由状态，整页跳转最不容易出意外)。
    return onUnauthorized(() => {
      window.location.href = '/login'
    })
  }, [])

  const login = async (email: string, password: string) => {
    const { token, user } = await apiLogin(email, password)
    setToken(token)
    setUser(user)
  }

  const register = async (email: string, password: string) => {
    const { token, user } = await apiRegister(email, password)
    setToken(token)
    setUser(user)
  }

  const logout = () => {
    clearToken()
    setUser(null)
    window.location.href = '/login'
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth必须在AuthProvider内部使用')
  return ctx
}
