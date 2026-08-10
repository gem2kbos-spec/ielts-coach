const TOKEN_KEY = 'g2band_token'
const UNAUTHORIZED_EVENT = 'auth:unauthorized'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// 整个app的fetch调用都是裸的 fetch('/api/...')，散落在 lib/api.ts 和各个组件里，
// 逐个加Authorization header改动面太大。在app启动时整体包一层window.fetch，
// 给所有同源/api请求自动带上token，401时统一清token+广播事件——比改几十个调用点更不容易漏改。
let patched = false

export function setupAuthFetch() {
  if (patched) return
  patched = true
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const isApi = url.startsWith('/api/')
    const isPublicAuthRoute = url.startsWith('/api/auth/login') || url.startsWith('/api/auth/register')

    let finalInit = init
    if (isApi && !isPublicAuthRoute) {
      const token = getToken()
      if (token) {
        const headers = new Headers(init?.headers || (typeof input === 'string' || input instanceof URL ? undefined : input.headers))
        headers.set('Authorization', `Bearer ${token}`)
        finalInit = {
          ...init,
          headers,
        }
      }
    }

    const res = await originalFetch(input, finalInit)

    if (isApi && !isPublicAuthRoute && res.status === 401) {
      clearToken()
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }
    return res
  }
}

export function onUnauthorized(handler: () => void) {
  window.addEventListener(UNAUTHORIZED_EVENT, handler)
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler)
}
