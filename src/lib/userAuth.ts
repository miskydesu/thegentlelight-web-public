import { getApiBaseUrl } from './tglApi'

const LS_KEY = 'tgl_user_token'
const COOKIE_KEY = 'tgl_user_token_v1'
const LOGIN_PRESENCE_COOKIE_KEY = 'tgl_user_logged_in_v1'

export type UserSession = {
  user: { user_id: string; email: string | null; role: string; google_sub: string | null; email_verified_at?: string | null }
  settings: {
    gentle_mode: boolean | null
    gentle_allow_important_news?: boolean
    default_country?: 'us' | 'ca' | 'uk' | 'jp' | null
    default_lang?: 'en' | 'ja' | null
    default_soft?: string | null
    keyword_excludes?: string[]
    updated_at?: string
  } | null
}

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  const parts = document.cookie.split(';').map((x) => x.trim())
  for (const p of parts) {
    const idx = p.indexOf('=')
    if (idx <= 0) continue
    const k = p.slice(0, idx)
    const v = p.slice(idx + 1)
    if (k === name) return v
  }
  return null
}

function setCookieValue(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`
}

function deleteCookie(name: string) {
  setCookieValue(name, '', 0)
}

function setRememberMeToken(token: string | null, remember: boolean) {
  if (!remember) {
    deleteCookie(COOKIE_KEY)
    return
  }
  if (!token) {
    deleteCookie(COOKIE_KEY)
    return
  }
  // 30 days
  setCookieValue(COOKIE_KEY, encodeURIComponent(token), 60 * 60 * 24 * 30)
}

export function getUserToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const ls = window.localStorage.getItem(LS_KEY)
    if (ls) return ls
    // fallback: remember-me cookie
    const c = getCookieValue(COOKIE_KEY)
    if (!c) return null
    const token = decodeURIComponent(c)
    if (!token) return null
    // restore to localStorage for consistency
    window.localStorage.setItem(LS_KEY, token)
    return token
  } catch {
    return null
  }
}

export function setUserToken(token: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (!token) {
      window.localStorage.removeItem(LS_KEY)
      deleteCookie(COOKIE_KEY)
      deleteCookie(LOGIN_PRESENCE_COOKIE_KEY)
    } else {
      window.localStorage.setItem(LS_KEY, token)
      // Cookieは「自動ログイン」選択時のみ保存する（login()から制御）
      // サーバー側でも「ログイン状態」を判定できるよう、存在フラグだけは常にCookieへ（値は持たない）
      // 30 days
      setCookieValue(LOGIN_PRESENCE_COOKIE_KEY, '1', 60 * 60 * 24 * 30)
    }
  } catch {
    // ignore
  }
}

export async function userFetchJson<T>(path: string, init?: (RequestInit & { timeoutMs?: number })): Promise<T> {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const token = getUserToken()
  const headers: Record<string, string> = { accept: 'application/json', ...(init?.headers as any) }
  if (token) headers.authorization = `Bearer ${token}`
  if (init?.body && !headers['content-type']) headers['content-type'] = 'application/json'
  const controller = new AbortController()
  const timeoutMs = typeof init?.timeoutMs === 'number' && Number.isFinite(init.timeoutMs) ? Math.max(1000, Math.trunc(init.timeoutMs)) : 12000
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(url, { ...init, headers, signal: controller.signal })
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('APIに接続できません（タイムアウト）')
    }
    throw new Error('APIに接続できません')
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    const ct = res.headers.get('content-type') || ''
    let msg = ''
    if (ct.includes('application/json')) {
      try {
        const j = (await res.json()) as any
        msg = String(j?.message || j?.error || '').trim()
      } catch {
        msg = ''
      }
    } else {
      msg = (await res.text().catch(() => '')).trim()
    }
    // 呼び出し側で401判定できるように status を持たせる
    const err: any = new Error(msg || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return (await res.json()) as T
}

export async function signup(email: string, password: string) {
  const r = await userFetchJson<{ token: string; user: any }>('/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setUserToken(r.token)
  return r
}

export async function login(email: string, password: string, opts?: { remember?: boolean }) {
  const r = await userFetchJson<{ token: string; user: any }>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setUserToken(r.token)
  setRememberMeToken(r.token, Boolean(opts?.remember))
  return r
}

export async function loginWithGoogleIdToken(idToken: string, opts?: { remember?: boolean }) {
  const r = await userFetchJson<{ token: string; user: any }>('/v1/auth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  })
  setUserToken(r.token)
  setRememberMeToken(r.token, Boolean(opts?.remember))
  return r
}

export async function signupWithGoogleIdToken(idToken: string, opts?: { remember?: boolean }) {
  const r = await userFetchJson<{ token: string; user: any }>('/v1/auth/google/signup', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  })
  setUserToken(r.token)
  setRememberMeToken(r.token, Boolean(opts?.remember))
  return r
}

export async function getSession(): Promise<UserSession> {
  const s = await userFetchJson<UserSession>('/v1/auth/session')
  // ログインユーザーの設定（default_country）があれば、ゲストcookie/LSにも反映して「版の迷子」を減らす
  try {
    const dc = (s as any)?.settings?.default_country
    if (dc === 'us' || dc === 'ca' || dc === 'uk' || dc === 'jp') {
      const { setCountryPreference } = await import('@/lib/client/set-country-preference')
      setCountryPreference(dc)
    }
  } catch {
    // ignore
  }
  return s
}

export async function updateGentleMode(gentle_mode: boolean | null) {
  return userFetchJson<{ settings: { gentle_mode: boolean | null } }>('/v1/me/settings', {
    method: 'PATCH',
    body: JSON.stringify({ gentle_mode }),
  })
}

export async function updateGentleAllowImportantNews(gentle_allow_important_news: boolean) {
  return userFetchJson<{ settings: { gentle_allow_important_news: boolean } }>('/v1/me/settings', {
    method: 'PATCH',
    body: JSON.stringify({ gentle_allow_important_news }),
  })
}

export async function updateDefaultCountry(default_country: 'us' | 'ca' | 'uk' | 'jp' | null) {
  const lang = default_country === 'jp' ? 'ja' : default_country ? 'en' : null
  return userFetchJson<{ settings: { default_country: string | null; default_lang: string | null } }>('/v1/me/settings', {
    method: 'PATCH',
    body: JSON.stringify({ default_country, default_lang: lang }),
  })
}

export async function changePassword(current_password: string, new_password: string) {
  return userFetchJson<{ status: 'ok' }>('/v1/auth/password/change', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  })
}

export async function forgotPassword(email: string) {
  return userFetchJson<{ status: 'ok'; dev_reset_token?: string }>('/v1/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(email: string, token: string, new_password: string) {
  return userFetchJson<{ status: 'ok' }>('/v1/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ email, token, new_password }),
  })
}

export async function listServerSavedKeys() {
  return userFetchJson<{ keys: string[] }>('/v1/me/saved-topics')
}

export async function importServerSavedKeys(keys: string[]) {
  return userFetchJson<{ keys: string[] }>('/v1/me/saved-topics/import', {
    method: 'POST',
    body: JSON.stringify({ keys }),
  })
}

export async function saveTopicToServer(topicId: string) {
  return userFetchJson<{ status: 'ok' }>(`/v1/me/saved-topics/${encodeURIComponent(topicId)}`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function removeTopicFromServer(topicId: string) {
  return userFetchJson<{ status: 'ok' }>(`/v1/me/saved-topics/${encodeURIComponent(topicId)}`, {
    method: 'DELETE',
  })
}

export async function requestEmailVerify() {
  return userFetchJson<{
    status: 'ok'
    dev_verify_token?: string
    dev_verify_url?: string | null
    mail?: { status: 'sent' } | { status: 'skipped'; reason: string } | null
    mail_error?: string | null
  }>('/v1/me/email/verify-request', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function verifyEmail(token: string) {
  return userFetchJson<{ status: 'ok' }>('/v1/auth/email/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function requestEmailChange(new_email: string) {
  return userFetchJson<{
    status: 'ok'
    dev_change_token?: string
    dev_change_url?: string | null
    mail?: { status: 'sent' } | { status: 'skipped'; reason: string } | null
    mail_error?: string | null
  }>('/v1/me/email/change-request', {
    method: 'POST',
    body: JSON.stringify({ new_email }),
  })
}

export async function confirmEmailChange(token: string) {
  return userFetchJson<{ status: 'ok'; email: string }>('/v1/me/email/change-confirm', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}


