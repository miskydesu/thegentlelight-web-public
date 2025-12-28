import { getApiBaseUrl, type Country } from './tglApi'

const TOKEN_KEY = 'tgl_admin_token'

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
}

export async function adminFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`

  const token = getAdminToken()
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...(init?.headers as any),
  }
  if (token) headers.authorization = `Bearer ${token}`
  if (!headers['content-type'] && init?.body) headers['content-type'] = 'application/json'

  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`Admin API ${res.status} ${res.statusText}: ${url}${body ? `\n${body}` : ''}`)
    ;(err as any).status = res.status
    throw err
  }
  return (await res.json()) as T
}

export async function adminLogin(email: string, password: string): Promise<{ token: string; user: any }> {
  return adminFetchJson('/admin/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export type AdminTopicRow = {
  topic_id: string
  topic_key?: string | null
  status: string
  country: Country
  category: string
  event_type: string | null
  title: string
  importance_score: number
  source_count: number
  last_seen_at: string
  last_source_published_at: string | null
  high_arousal: boolean
  summary: string | null
  summary_updated_at: string | null
  override?: any
}

export async function adminListTopics(country: Country, q: string, status: string, category: string) {
  const sp = new URLSearchParams()
  if (q) sp.set('q', q)
  if (status) sp.set('status', status)
  if (category) sp.set('category', category)
  sp.set('limit', '50')
  sp.set('cursor', '0')
  sp.set('view', 'calm')
  return adminFetchJson<{ topics: AdminTopicRow[]; meta: any }>(`/admin/v1/${country}/topics?${sp.toString()}`)
}

export async function adminGetTopic(country: Country, topicId: string) {
  const include = encodeURIComponent('sources,overrides,alias')
  return adminFetchJson<any>(`/admin/v1/${country}/topics/${encodeURIComponent(topicId)}?include=${include}&view=calm`)
}

export async function adminPatchTopic(country: Country, topicId: string, body: any) {
  return adminFetchJson<any>(`/admin/v1/${country}/topics/${encodeURIComponent(topicId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminMergeTopics(country: Country, body: { fromTopicId: string; toTopicId: string; moveSources: boolean; reason?: string }) {
  return adminFetchJson<any>(`/admin/v1/${country}/topics/merge`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminSplitTopics(country: Country, body: any) {
  return adminFetchJson<any>(`/admin/v1/${country}/topics/split`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}


