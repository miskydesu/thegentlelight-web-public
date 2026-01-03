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
  topic_importance_tier?: string | null
  topic_confidence_tier?: string | null
  gentle_light_score?: number | null
  heartwarming_score?: number | null
  distress_score?: number | null
  ai_status?: string | null
  ai_error?: string | null
  ai_ready_at?: string | null
  source_count: number
  last_seen_at: string
  last_source_published_at: string | null
  high_arousal: boolean
  summary: string | null
  summary_updated_at: string | null
  override?: any
}

export async function adminListTopics(
  country: Country | 'all',
  q: string,
  category: string,
  aiStatus?: string,
  aiError?: string,
  orderBy?: 'updated_at' | 'created_at' | 'gentle_light_score' | 'heartwarming_score',
  limit?: number,
  cursor?: number,
  importanceTier?: string[],
  confidenceTier?: string[],
  glScoreMin?: number,
  heartScoreMin?: number
) {
  const sp = new URLSearchParams()
  if (q) sp.set('q', q)
  if (category) sp.set('category', category)
  if (aiStatus) sp.set('aiStatus', aiStatus)
  if (aiError) sp.set('aiError', aiError)
  if (orderBy) sp.set('orderBy', orderBy)
  if (limit !== undefined) sp.set('limit', String(limit))
  if (cursor !== undefined) sp.set('cursor', String(cursor))
  if (importanceTier && importanceTier.length > 0) {
    importanceTier.forEach((tier) => sp.append('importanceTier', tier))
  }
  if (confidenceTier && confidenceTier.length > 0) {
    confidenceTier.forEach((tier) => sp.append('confidenceTier', tier))
  }
  if (glScoreMin !== undefined && glScoreMin > 0) {
    sp.set('glScoreMin', String(glScoreMin))
  }
  if (heartScoreMin !== undefined && heartScoreMin > 0) {
    sp.set('heartScoreMin', String(heartScoreMin))
  }
  return adminFetchJson<{ topics: AdminTopicRow[]; meta: { total_count: number; limit: number; cursor: number; has_more: boolean } }>(
    `/admin/v1/${country}/topics?${sp.toString()}`
  )
}

export async function adminGetTopic(country: Country, topicId: string) {
  const include = encodeURIComponent('sources,overrides,alias')
  return adminFetchJson<any>(`/admin/v1/${country}/topics/${encodeURIComponent(topicId)}?include=${include}`)
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

export async function adminGetTopicOverride(country: Country, topicId: string) {
  return adminFetchJson<any>(`/admin/v1/${country}/topics/${encodeURIComponent(topicId)}/override`)
}

export async function adminUpdateTopicOverride(country: Country, topicId: string, body: any) {
  return adminFetchJson<any>(`/admin/v1/${country}/topics/${encodeURIComponent(topicId)}/override`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function adminRegenerateTopicSummary(country: Country, topicId: string) {
  // DEPRECATED: summarize単体は廃止（基本セットに統合）
  // 互換のため残すが、内部的には basicセットの再実行を推奨。
  return adminRunTopicAI(country, topicId, { force: true })
}

export async function adminRunTopicAI(country: Country, topicId: string, opts?: { force?: boolean }) {
  return adminFetchJson<any>(`/admin/v1/${country}/topics/${encodeURIComponent(topicId)}/ai/run`, {
    method: 'POST',
    body: JSON.stringify({ force: Boolean(opts?.force) }),
  })
}

export type EventRegistryCheckLocation = 'ALL' | 'JP' | 'US'
export type EventRegistryKeywordSearchMode = 'phrase' | 'exact' | 'simple'

export type EventRegistryCheckResponse = {
  status: 'ok'
  result: {
    request: {
      request_hash: string
      request_url_masked: string
      http_status: number
      elapsed_ms: number
    }
    effective: {
      keyword: string
      keywordSearchMode: EventRegistryKeywordSearchMode
      excludePresetApplied: boolean
      excludePresetQuery: string
    }
    totalResults: number
    pages: number
    count: number
    articles: Array<{
      uri?: string
      lang?: string
      date?: string
      dateTime?: string
      dateTimePub?: string
      url?: string
      title?: string
      body?: string
      source?: { title?: string }
      image?: string
      eventUri?: string
    }>
  }
}

export async function adminEventRegistryCheck(body: {
  keyword: string
  location: EventRegistryCheckLocation
  keywordSearchMode: EventRegistryKeywordSearchMode
  excludePreset: boolean
  useCategory: boolean
  categoryUri?: string
}) {
  return adminFetchJson<EventRegistryCheckResponse>('/admin/v1/tools/eventregistry/check', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export type AdminAiRunRow = {
  run_id: string
  country: Country | null
  mode: string
  requested_by: string | null
  limit: number | null
  force: boolean
  lang: 'en' | 'ja' | null
  status: string
  started_at: string | null
  finished_at: string | null
  topics_processed: number
  topics_succeeded: number
  topics_failed: number
  auto_marked_ready: number
  llm_requests: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  model: string | null
  error_message: string | null
  meta: any
}

export async function adminListAiRuns(opts?: { country?: Country; limit?: number }) {
  const sp = new URLSearchParams()
  if (opts?.country) sp.set('country', opts.country)
  if (typeof opts?.limit === 'number') sp.set('limit', String(opts.limit))
  return adminFetchJson<{ runs: AdminAiRunRow[] }>(`/admin/v1/ai/runs?${sp.toString()}`)
}

// Columns API
export async function adminListColumns(lang?: string, q?: string, status?: string, tag?: string) {
  const sp = new URLSearchParams()
  if (lang) sp.set('lang', lang)
  if (q) sp.set('q', q)
  if (status) sp.set('status', status)
  if (tag) sp.set('tag', tag)
  sp.set('limit', '50')
  sp.set('cursor', '0')
  return adminFetchJson<{ columns: any[]; meta: any }>(`/admin/v1/columns?${sp.toString()}`)
}

export async function adminGetColumn(columnId: string, lang?: string) {
  const sp = new URLSearchParams()
  if (lang) sp.set('lang', lang)
  return adminFetchJson<any>(`/admin/v1/columns/${encodeURIComponent(columnId)}?${sp.toString()}`)
}

export async function adminCreateColumn(body: any) {
  return adminFetchJson<any>('/admin/v1/columns', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminUpdateColumn(columnId: string, body: any) {
  return adminFetchJson<any>(`/admin/v1/columns/${encodeURIComponent(columnId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

// Quotes API
export async function adminListQuotes(lang?: string, q?: string, isPublished?: boolean, tag?: string) {
  const sp = new URLSearchParams()
  if (lang) sp.set('lang', lang)
  if (q) sp.set('q', q)
  if (typeof isPublished === 'boolean') sp.set('is_published', String(isPublished))
  if (tag) sp.set('tag', tag)
  sp.set('limit', '50')
  sp.set('cursor', '0')
  return adminFetchJson<{ quotes: any[]; meta: any }>(`/admin/v1/quotes?${sp.toString()}`)
}

export async function adminGetQuote(quoteId: string, lang?: string) {
  const sp = new URLSearchParams()
  if (lang) sp.set('lang', lang)
  return adminFetchJson<any>(`/admin/v1/quotes/${encodeURIComponent(quoteId)}?${sp.toString()}`)
}

export async function adminCreateQuote(body: any) {
  return adminFetchJson<any>('/admin/v1/quotes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminUpdateQuote(quoteId: string, body: any) {
  return adminFetchJson<any>(`/admin/v1/quotes/${encodeURIComponent(quoteId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}


