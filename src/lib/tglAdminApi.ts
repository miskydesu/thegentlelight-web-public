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

  try {
    const res = await fetch(url, { ...init, headers })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const err = new Error(`Admin API ${res.status} ${res.statusText}: ${url}${body ? `\n${body}` : ''}`)
      ;(err as any).status = res.status
      throw err
    }
    return (await res.json()) as T
  } catch (err: any) {
    // ネットワークエラー（接続拒否など）の場合
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`APIサーバーに接続できません。APIサーバーが起動しているか確認してください。\nURL: ${url}\n\nエラー: ${err.message}`)
    }
    // その他のエラーはそのまま再スロー
    throw err
  }
}

export async function adminUploadImage(file: File): Promise<{ url: string; key: string }> {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const url = `${base}/admin/v1/images/upload`
  const token = getAdminToken()

  const fd = new FormData()
  fd.append('image', file)

  const headers: Record<string, string> = { accept: 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`

  const res = await fetch(url, { method: 'POST', body: fd, headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Admin API ${res.status} ${res.statusText}: ${url}${body ? `\n${body}` : ''}`)
  }
  const json = (await res.json()) as any
  if (!json?.url || !json?.key) throw new Error('upload response is invalid')
  return { url: String(json.url), key: String(json.key) }
}

export async function adminUploadTempImage(file: File, sessionId: string): Promise<{ url: string; key: string; session_id: string }> {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const url = `${base}/admin/v1/images/upload-temp?session_id=${encodeURIComponent(sessionId)}`
  const token = getAdminToken()

  const fd = new FormData()
  fd.append('image', file)

  const headers: Record<string, string> = { accept: 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`

  const res = await fetch(url, { method: 'POST', body: fd, headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Admin API ${res.status} ${res.statusText}: ${url}${body ? `\n${body}` : ''}`)
  }
  const json = (await res.json()) as any
  if (!json?.url || !json?.key) throw new Error('upload response is invalid')
  return { url: String(json.url), key: String(json.key), session_id: String(json.session_id || sessionId) }
}

export async function adminUploadColumnCover(columnId: string, file: File): Promise<{ url: string; key: string }> {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const url = `${base}/admin/v1/columns/${encodeURIComponent(columnId)}/cover`
  const token = getAdminToken()

  const fd = new FormData()
  fd.append('image', file)

  const headers: Record<string, string> = { accept: 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`

  const res = await fetch(url, { method: 'POST', body: fd, headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Admin API ${res.status} ${res.statusText}: ${url}${body ? `\n${body}` : ''}`)
  }
  const json = (await res.json()) as any
  if (!json?.url || !json?.key) throw new Error('upload response is invalid')
  return { url: String(json.url), key: String(json.key) }
}

export async function adminDeleteColumnCover(columnId: string): Promise<{ key: string }> {
  return adminFetchJson<{ status: string; key: string }>(`/admin/v1/columns/${encodeURIComponent(columnId)}/cover`, {
    method: 'DELETE',
  })
}

export type AdminColumnsUnusedImagesScanResult = {
  status: 'ok'
  prefix: string
  excludePrefix: string
  scanned: number
  candidates: number
  used: number
  unused: number
  unused_objects: Array<{ key: string; url: string; size: number | null; lastModified: string | null }>
}

export async function adminScanUnusedColumnImages(limit = 2000) {
  return adminFetchJson<AdminColumnsUnusedImagesScanResult>('/admin/v1/tools/columns/images/scan', {
    method: 'POST',
    body: JSON.stringify({ limit }),
  })
}

export async function adminDeleteColumnImages(keys: string[]) {
  return adminFetchJson<{ status: 'ok'; deleted: number; failed: number; deleted_keys: string[]; failed_items: Array<{ key: string; error: string }> }>(
    '/admin/v1/tools/columns/images/delete',
    {
      method: 'POST',
      body: JSON.stringify({ keys }),
    }
  )
}

export async function adminDeleteColumn(columnId: string) {
  return adminFetchJson<{ status: 'ok' }>(`/admin/v1/columns/${encodeURIComponent(columnId)}`, {
    method: 'DELETE',
  })
}

export type AdminColumnsTmpCleanupResult = {
  status: 'ok'
  prefix: string
  olderThanHours: number
  cutoff: string
  scanned: number
  older: number
  referenced_in_db: number
  delete_candidates: number
  deleted: number
  failed: number
  skipped_referenced: number
  deleted_keys: string[]
  failed_items: Array<{ key: string; error: string }>
}

export type AdminColumnsTmpScanResult = {
  status: 'ok'
  prefix: string
  olderThanHours: number
  cutoff: string
  scanned: number
  older: number
  referenced_in_db: number
  delete_candidates: number
  skipped_referenced: number
  candidate_keys: string[]
}

export async function adminScanColumnTmpImages(olderThanHours = 72, limit = 2000) {
  return adminFetchJson<AdminColumnsTmpScanResult>('/admin/v1/tools/columns/tmp-images/scan', {
    method: 'POST',
    body: JSON.stringify({ olderThanHours, limit }),
  })
}

export async function adminCleanupColumnTmpImages(olderThanHours = 72, limit = 2000) {
  return adminFetchJson<AdminColumnsTmpCleanupResult>('/admin/v1/tools/columns/tmp-images/cleanup', {
    method: 'POST',
    body: JSON.stringify({ olderThanHours, limit }),
  })
}

export type AdminColumnJaToEnInput = {
  title: string
  slug?: string | null
  excerpt?: string | null
  body_md: string
  seo_title?: string | null
  seo_description?: string | null
}

export type AdminColumnJaToEnOutput = {
  title_en: string
  slug_en: string
  excerpt_en: string
  body_md_en: string
  seo_title_en: string
  seo_description_en: string
}

export async function adminColumnsJaToEn(ja: AdminColumnJaToEnInput) {
  return adminFetchJson<{ generated: AdminColumnJaToEnOutput }>('/admin/v1/tools/columns/ja-to-en', {
    method: 'POST',
    body: JSON.stringify({ ja }),
  })
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

// (removed) Event Registry 取得チェックツールは廃止

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
export async function adminListColumns(lang?: string, q?: string, status?: string, tag?: string, limit = 50, cursor = 0) {
  const sp = new URLSearchParams()
  if (lang) sp.set('lang', lang)
  if (q) sp.set('q', q)
  if (status) sp.set('status', status)
  if (tag) sp.set('tag', tag)
  sp.set('limit', String(limit))
  sp.set('cursor', String(cursor))
  return adminFetchJson<{ columns: any[]; meta: any }>(`/admin/v1/columns?${sp.toString()}`)
}

// Column Names API
export type AdminColumnName = {
  column_name_id: string
  slug: string
  name_en: string
  name_jp: string
  description_en: string | null
  description_jp: string | null
  cover_image_key: string | null
  cover_image_url: string | null
  display_order: number | null
  created_at: string
  updated_at: string
  count: number
}

export async function adminListColumnNames(q?: string) {
  const sp = new URLSearchParams()
  if (q) sp.set('q', q)
  return adminFetchJson<{ column_names: AdminColumnName[]; meta: { total: number } }>(`/admin/v1/column-names?${sp.toString()}`)
}

export async function adminCreateColumnName(body: {
  slug: string
  name_en: string
  name_jp: string
  description_en?: string | null
  description_jp?: string | null
  display_order?: number | null
}) {
  return adminFetchJson<{ column_name: AdminColumnName }>('/admin/v1/column-names', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminUpdateColumnName(columnNameId: string, body: {
  slug?: string
  name_en?: string
  name_jp?: string
  description_en?: string | null
  description_jp?: string | null
  display_order?: number | null
}) {
  return adminFetchJson<{ column_name: AdminColumnName }>(`/admin/v1/column-names/${encodeURIComponent(columnNameId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminDeleteColumnName(columnNameId: string) {
  return adminFetchJson<{ status: 'ok' }>(`/admin/v1/column-names/${encodeURIComponent(columnNameId)}`, {
    method: 'DELETE',
  })
}

export async function adminUploadColumnNameCover(columnNameId: string, file: File): Promise<{ url: string; key: string }> {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const url = `${base}/admin/v1/column-names/${encodeURIComponent(columnNameId)}/cover`
  const token = getAdminToken()

  const fd = new FormData()
  fd.append('image', file)

  const headers: Record<string, string> = { accept: 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`

  const res = await fetch(url, { method: 'POST', body: fd, headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Admin API ${res.status} ${res.statusText}: ${url}${body ? `\n${body}` : ''}`)
  }
  const json = (await res.json()) as any
  if (!json?.url || !json?.key) throw new Error('upload response is invalid')
  return { url: String(json.url), key: String(json.key) }
}

export async function adminDeleteColumnNameCover(columnNameId: string): Promise<{ key: string | null }> {
  return adminFetchJson<{ status: string; key: string | null }>(`/admin/v1/column-names/${encodeURIComponent(columnNameId)}/cover`, {
    method: 'DELETE',
  })
}

// Writers API
export type AdminWriter = {
  writer_id: string
  writer_name_en: string
  writer_name_jp: string
  created_at: string
  updated_at: string
  count_column_names: number
  count_columns: number
}

export async function adminListWriters(q?: string) {
  const sp = new URLSearchParams()
  if (q) sp.set('q', q)
  return adminFetchJson<{ writers: AdminWriter[]; meta: { total: number } }>(`/admin/v1/writers?${sp.toString()}`)
}

export async function adminCreateWriter(body: { writer_name_en: string; writer_name_jp: string }) {
  return adminFetchJson<{ writer: AdminWriter }>('/admin/v1/writers', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminUpdateWriter(writerId: string, body: { writer_name_en?: string; writer_name_jp?: string }) {
  return adminFetchJson<{ writer: AdminWriter }>(`/admin/v1/writers/${encodeURIComponent(writerId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminDeleteWriter(writerId: string) {
  return adminFetchJson<{ status: 'ok' }>(`/admin/v1/writers/${encodeURIComponent(writerId)}`, {
    method: 'DELETE',
  })
}

export async function adminGetColumnNameWriters(columnNameId: string) {
  return adminFetchJson<{
    writer_ids: string[]
    writers: Array<{ writer_id: string; writer_name_en: string; writer_name_jp: string; display_order: number | null }>
  }>(`/admin/v1/column-names/${encodeURIComponent(columnNameId)}/writers`)
}

export async function adminSetColumnNameWriters(columnNameId: string, writerIds: string[]) {
  return adminFetchJson<{ status: 'ok' }>(`/admin/v1/column-names/${encodeURIComponent(columnNameId)}/writers`, {
    method: 'PUT',
    body: JSON.stringify({ writer_ids: writerIds }),
  })
}

export async function adminGetColumnWriters(columnId: string) {
  return adminFetchJson<{
    writer_ids: string[]
    writers: Array<{ writer_id: string; writer_name_en: string; writer_name_jp: string; display_order: number | null }>
  }>(`/admin/v1/columns/${encodeURIComponent(columnId)}/writers`)
}

export async function adminSetColumnWriters(columnId: string, writerIds: string[]) {
  return adminFetchJson<{ status: 'ok' }>(`/admin/v1/columns/${encodeURIComponent(columnId)}/writers`, {
    method: 'PUT',
    body: JSON.stringify({ writer_ids: writerIds }),
  })
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
export async function adminListQuotes(lang?: string | null, q?: string, isPublished?: boolean, tag?: string, limit = 50, cursor = 0) {
  const sp = new URLSearchParams()
  if (lang) sp.set('lang', lang)
  else sp.set('lang', 'all') // デフォルトはすべて
  if (q) sp.set('q', q)
  if (typeof isPublished === 'boolean') sp.set('is_published', String(isPublished))
  if (tag) sp.set('tag', tag)
  sp.set('limit', String(limit))
  sp.set('cursor', String(cursor))
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

export async function adminDeleteQuote(quoteId: string) {
  return adminFetchJson<{ success: boolean }>(`/admin/v1/quotes/${encodeURIComponent(quoteId)}`, {
    method: 'DELETE',
  })
}

export async function adminCheckDuplicateQuote(quoteTextJa?: string, quoteTextEn?: string) {
  const sp = new URLSearchParams()
  if (quoteTextJa) sp.set('quote_text_ja', quoteTextJa)
  if (quoteTextEn) sp.set('quote_text_en', quoteTextEn)
  return adminFetchJson<{
    is_duplicate: boolean
    duplicates: Array<{
      quote_id: string
      author_name: string | null
      localizations: Array<{
        lang: string
        quote_text: string
        author_name: string | null
      }>
    }>
  }>(`/admin/v1/quotes/check-duplicate?${sp.toString()}`)
}

export async function adminCreateQuoteWithGpt(body: {
  tags?: string[]
  is_published?: boolean
  published_at?: string | null
  quote_text_ja: string
  author_name_ja?: string | null
  source_text_ja?: string | null
  author_name?: string | null
}) {
  return adminFetchJson<{
    quote: {
      quote_id: string
      author_name: string | null
      tags: string[]
      is_published: boolean
      created_at: string
      updated_at: string
    }
    generated: any
  }>('/admin/v1/quotes/create-with-gpt', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminCreateQuoteWithGptEn(body: {
  tags?: string[]
  is_published?: boolean
  published_at?: string | null
  quote_text_en: string
  author_name_en?: string | null
  source_text_en?: string | null
  author_name?: string | null
}) {
  return adminFetchJson<{
    quote: {
      quote_id: string
      author_name: string | null
      tags: string[]
      is_published: boolean
      created_at: string
      updated_at: string
    }
    generated: any
  }>('/admin/v1/quotes/create-with-gpt-en', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminGenerateQuoteEn(quoteId: string) {
  return adminFetchJson<{
    quote: {
      quote_id: string
      localizations: {
        ja?: any
        en?: any
      }
    }
  }>(`/admin/v1/quotes/${encodeURIComponent(quoteId)}/generate-en`, {
    method: 'POST',
  })
}

export async function adminListQuoteTags() {
  return adminFetchJson<{
    tags: Array<{
      tag: string
      tag_name_en: string | null
      tag_name_jp: string | null
      description_en: string | null
      description_jp: string | null
      display_order: number | null
      count: number
      created_at: string
      updated_at: string
    }>
    meta: { total_tags: number; total_quotes: number }
  }>('/admin/v1/quotes/tags')
}

export async function adminCreateQuoteTag(body: {
  tag: string
  tag_name_en?: string | null
  tag_name_jp?: string | null
  description_en?: string | null
  description_jp?: string | null
  display_order?: number | null
}) {
  return adminFetchJson<{
    tag: {
      tag: string
      tag_name_en: string | null
      tag_name_jp: string | null
      description_en: string | null
      description_jp: string | null
      display_order: number | null
      created_at: string
      updated_at: string
    }
  }>('/admin/v1/quotes/tags', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminUpdateQuoteTag(tag: string, body: {
  tag_name_en?: string | null
  tag_name_jp?: string | null
  description_en?: string | null
  description_jp?: string | null
  display_order?: number | null
}) {
  return adminFetchJson<{
    tag: {
      tag: string
      tag_name_en: string | null
      tag_name_jp: string | null
      description_en: string | null
      description_jp: string | null
      display_order: number | null
      created_at: string
      updated_at: string
    }
  }>(`/admin/v1/quotes/tags/${encodeURIComponent(tag)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminDeleteQuoteTag(tag: string) {
  return adminFetchJson<{ success: boolean }>(`/admin/v1/quotes/tags/${encodeURIComponent(tag)}`, {
    method: 'DELETE',
  })
}


