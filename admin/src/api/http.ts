// 管理后台 HTTP 基础：accessToken 存 localStorage，401 自动退出并跳转登录。
const API_BASE = (() => {
  const m = document.querySelector('meta[name="api-base"]')
  const fromMeta = m ? (m.getAttribute('content') || '') : ''
  const fromEnv = (import.meta as any).env?.VITE_API_BASE || ''
  const base = (fromEnv || fromMeta || '').replace(/\/+$/, '')
  return base.replace(/\/+$/, '')
})()

const TOKEN_KEY = 'admin_token'

export function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t)
}
export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
export function hasToken(): boolean {
  return !!getToken()
}

function buildUrl(path: string): string {
  const base = API_BASE || ''
  return base + '/' + path.replace(/^\/+/, '')
}

export async function apiFetch<T = any>(
  path: string,
  opts: { method?: string; body?: any } = {},
): Promise<T> {
  const method = opts.method || 'GET'
  const headers: Record<string, string> = {}
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const t = getToken()
  if (t) headers['Authorization'] = 'Bearer ' + t

  const init: RequestInit = { method, headers }
  if (opts.body !== undefined && opts.body !== null) {
    init.body = opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body)
  }

  const res = await fetch(buildUrl(path), init)
  if (res.status === 401) {
    clearToken()
    if (location.pathname !== '/login') location.href = '/login'
    throw new Error('登录已过期，请重新登录')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || 'HTTP ' + res.status)
  return data as T
}
