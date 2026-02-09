export type Country = 'us' | 'uk' | 'ca' | 'jp'

export const COUNTRIES: Array<{ code: Country; label: string }> = [
  { code: 'us', label: 'US' },
  { code: 'uk', label: 'UK' },
  { code: 'ca', label: 'CA' },
  { code: 'jp', label: 'JP' },
]

export function isCountry(s: string): s is Country {
  return s === 'us' || s === 'uk' || s === 'ca' || s === 'jp'
}

export function getApiBaseUrl(): string {
  const env = typeof process !== 'undefined' ? (process.env as any) : (undefined as any)
  // 環境変数: NEXT_PUBLIC_API_BASE_URL（prod/stg/devで設定）
  const v = env?.NEXT_PUBLIC_API_BASE_URL
  if (v) return v

  // サーバーサイド用（公開しない環境変数でも設定できるように）
  const s = env?.API_BASE_URL || env?.TGL_API_BASE_URL
  if (s) return s

  // フォールバック（ローカル開発）
  // クライアント側のみ: ホスト名から推測（互換性のため）
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:8080'
    if (hostname === 'stg.thegentlelight.org') return 'https://api-stg.thegentlelight.org'
    if (hostname === 'thegentlelight.org' || hostname === 'www.thegentlelight.org') return 'https://api.thegentlelight.org'
  }
  return 'http://localhost:8080'
}

export type ApiMeta = { is_partial?: boolean; next_cursor?: number; gentle?: boolean }

export type QuoteSummary = {
  quote_id: string
  author_name: string | null
  source_text: string | null
  quote_text: string | null
  note: string | null
  tags: string[]
  created_at: string | null
  updated_at: string | null
}

export type QuoteAuthorSummary = {
  author_id: string
  canonical_key: string
  type: string | null
  image_key: string | null
  display_name: string | null
  one_liner: string | null
  aliases: string[]
}

export type QuoteAuthorDetail = {
  author_id: string
  canonical_key: string
  type: string | null
  image_key: string | null
  links: any | null
  display_name: string | null
  one_liner: string | null
  detail_md: string | null
  seo_title: string | null
  seo_description: string | null
}

export type QuoteAuthorsResponse = {
  authors: QuoteAuthorSummary[]
  meta: ApiMeta
}

export type QuoteAuthorsFromQuotesResponse = {
  authors: Array<{ name: string; canonical_key?: string | null; author_id?: string | null; count: number; has_detail: boolean }>
  meta: ApiMeta
}

export type QuoteAuthorResolveResponse = {
  author: QuoteAuthorDetail
  aliases: string[]
}

export type QuoteAuthorQuotesResponse = {
  author: QuoteAuthorDetail
  quotes: QuoteSummary[]
  meta: ApiMeta
}

export async function fetchJson<T>(path: string, init?: RequestInit & { next?: { revalidate?: number } }): Promise<T> {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: { accept: 'application/json', ...(init?.headers || {}) },
    })
  } catch (e: any) {
    const penv = typeof process !== 'undefined' ? (process.env as any) : undefined
    const env = penv?.NEXT_PUBLIC_API_BASE_URL ? 'NEXT_PUBLIC_API_BASE_URL=SET' : 'NEXT_PUBLIC_API_BASE_URL=EMPTY'
    const env2 = penv?.API_BASE_URL ? 'API_BASE_URL=SET' : penv?.TGL_API_BASE_URL ? 'TGL_API_BASE_URL=SET' : 'API_BASE_URL/TGL_API_BASE_URL=EMPTY'
    throw new Error(`API fetch failed: ${url}\n(${env}, ${env2})\n${e?.message || String(e)}`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status} ${res.statusText}: ${url}${body ? `\n${body}` : ''}`)
  }
  return (await res.json()) as T
}

// ---- minimal response shapes (MVP) ----
export type TopicSummary = {
  topic_id: string
  country: Country
  category: string
  title: string
  importance_score: number
  source_count: number
  source_domain?: string | null
  source_name?: string | null
  last_seen_at?: string | null
  last_source_published_at: string | null
  high_arousal: boolean
  distress_score?: number | null
  summary: string | null
  summary_updated_at: string | null
}

export type HomeResponse = {
  hero_topics: TopicSummary[]
  // Country-top explicit buckets (aligned with daily briefing):
  gentle_topics?: TopicSummary[]
  heartwarming_topics?: TopicSummary[]
  important_topics?: TopicSummary[]
  daily_latest: any | null
  updatedAt: string
  meta?: ApiMeta
}

export type TopicsResponse = {
  topics: TopicSummary[]
  meta: ApiMeta
}

export type HeartwarmingTodayPick = TopicSummary & {
  pick_type?: string
  pick_label?: string
}

export type HeartwarmingTodayThreeResponse = {
  picks: HeartwarmingTodayPick[]
  meta: ApiMeta
}

export type TopicDetailResponse = {
  topic: TopicSummary & {
    keywords?: string[]
    summaries?: { soft: string | null }
    entities?: any
    content?: string | null
    gentle_message?: string | null
  }
  meta?: ApiMeta
}

export type TopicSourcesResponse = {
  sources: Array<{
    source_id: string
    url: string
    url_canonical: string | null
    title: string
    published_at: string | null
    source_name: string | null
    source_domain: string | null
    provider_id: string | null
  }>
  meta?: ApiMeta
}

export type DailyListResponse = {
  days: Array<{ dateLocal: string; topicCount: number; updatedAt: string | null; status: string }>
  meta: ApiMeta
}

export type DailyDetailResponse = {
  daily: {
    daily_id: string | null
    country: Country
    dateLocal: string
    status: 'ready' | 'pending' | 'failed' | 'missing' | string
    topic_count: number
    generated_at: string | null
    summary: string | null
  }
  messages?: Array<{ rank: number; message: string }>
  topics: Array<TopicSummary & { rank: number }>
  heartwarming_topics?: Array<TopicSummary & { source_domain?: string | null; source_name?: string | null }>
  important_topics?: Array<TopicSummary & { source_domain?: string | null; source_name?: string | null }>
  other_topics?: Array<TopicSummary & { source_domain?: string | null; source_name?: string | null }>
  meta: ApiMeta
}

export type LatestResponse = {
  topics: TopicSummary[]
  meta: ApiMeta
}

export type TodayResponse = {
  date: string
  daily: {
    daily_id: string
    country: Country
    date_local: string
    status: 'ready' | 'pending' | 'failed'
    topic_count: number
    generated_at: string | null
    summary: string | null
  } | null
  messages?: Array<{ rank: number; message: string }>
  topics: Array<TopicSummary & { rank: number }>
  heartwarming_topics?: Array<TopicSummary & { source_domain?: string | null; source_name?: string | null }>
  important_topics?: Array<TopicSummary & { source_domain?: string | null; source_name?: string | null }>
  other_topics?: Array<TopicSummary & { source_domain?: string | null; source_name?: string | null }>
  meta: ApiMeta
}


