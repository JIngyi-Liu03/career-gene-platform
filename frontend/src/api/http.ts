// HTTP 基础 + 鉴权：Access/Refresh Token 管理（JWT，无后端明文 token）。
// - token 存于 localStorage，刷新页面后仍在；
// - 每次请求自动带 Authorization: Bearer <accessToken>；
// - 遇到 401 自动用 refreshToken 换新 accessToken 并重试一次；刷新失败则清空登录态。

const metaBase = (typeof document !== 'undefined')
  ? (() => {
      const m = document.querySelector('meta[name="api-base"]')
      return m ? (m.getAttribute('content') || '') : ''
    })()
  : ''

const envBase = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE) || ''

export const WORKER_URL = (envBase
  ? String(envBase).replace(/\/+$/, '')
  : (/^https?:\/\//i.test(metaBase) ? metaBase.replace(/\/+$/, '') : '')) || ''

const TOKEN_KEY = 'cg_tokens'

interface Tokens { accessToken: string; refreshToken: string }

function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const t = JSON.parse(raw)
    if (t && t.accessToken && t.refreshToken) return t
  } catch {}
  return null
}

let tokens: Tokens | null = loadTokens()

export function setTokens(access: string, refresh: string): void {
  tokens = { accessToken: access, refreshToken: refresh }
  try { localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens)) } catch {}
}
export function getAccessToken(): string { return tokens?.accessToken || '' }
export function getRefreshToken(): string { return tokens?.refreshToken || '' }
export function clearTokens(): void {
  tokens = null
  try { localStorage.removeItem(TOKEN_KEY) } catch {}
}
export function hasTokens(): boolean { return !!tokens }

function buildUrl(path: string): string {
  const base = WORKER_URL || ''
  return base + '/' + path.replace(/^\/+/, '')
}

let refreshing: Promise<boolean> | null = null
async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const rt = getRefreshToken()
    if (!rt) return false
    try {
      const res = await fetch(buildUrl('auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })
      if (!res.ok) return false
      const d = await res.json()
      if (d && d.accessToken && d.refreshToken) {
        setTokens(d.accessToken, d.refreshToken)
        return true
      }
    } catch {}
    return false
  })()
  const ok = await refreshing
  refreshing = null
  if (!ok) clearTokens()
  return ok
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  auth?: boolean // 是否带 token（默认 true）
  raw?: boolean // 返回原始 Response（用于非 JSON，如 PDF）
}

export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const method = opts.method || 'GET'
  const auth = opts.auth !== false
  const headers: Record<string, string> = {}
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  if (auth) {
    const t = getAccessToken()
    if (t) headers['Authorization'] = 'Bearer ' + t
  }
  const init: RequestInit = { method, headers }
  if (opts.body !== undefined && opts.body !== null) {
    init.body = opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body)
  }

  let res = await fetch(buildUrl(path), init)
  if (res.status === 401 && auth) {
    const ok = await tryRefresh()
    if (ok) {
      const t = getAccessToken()
      if (t) (init.headers as Record<string, string>)['Authorization'] = 'Bearer ' + t
      res = await fetch(buildUrl(path), init)
    }
  }

  if (opts.raw) return res as unknown as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.message || data?.error || ('HTTP ' + res.status)
    throw new Error(msg)
  }
  return data as T
}

// 报告 PDF 地址（新标签页打开，token 走 query 由后端识别）。
export function getReportUrl(): string {
  const t = getAccessToken()
  const u = buildUrl('report') + '?inline=1'
  return t ? u + '&token=' + encodeURIComponent(t) : u
}
