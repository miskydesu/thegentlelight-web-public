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
  // Client/server 両方で使う想定：NEXT_PUBLIC_ を採用
  const v = process.env.NEXT_PUBLIC_API_BASE_URL
  if (v) return v

  // 互換フォールバック（基本は env を推奨）
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:8080'
    if (hostname === 'stg.thegentlelight.org') return 'https://api-stg.thegentlelight.org'
    if (hostname === 'thegentlelight.org' || hostname === 'www.thegentlelight.org') return 'https://api.thegentlelight.org'
  }
  return 'http://localhost:8080'
}

export type ApiMeta = { is_partial?: boolean; next_cursor?: number }

export async function fetchJson<T>(path: string, init?: RequestInit & { next?: { revalidate?: number } }): Promise<T> {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    headers: { accept: 'application/json', ...(init?.headers || {}) },
  })
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
  last_source_published_at: string | null
  high_arousal: boolean
  summary: string | null
  summary_updated_at: string | null
}

export type HomeResponse = {
  hero_topics: TopicSummary[]
  daily_latest: any | null
  updatedAt: string
  meta?: ApiMeta
}

export type TopicsResponse = {
  topics: TopicSummary[]
  meta: ApiMeta
}

export type TopicDetailResponse = {
  topic: TopicSummary & {
    summaries?: { soft: string | null; calm: string | null; near: string | null }
    entities?: any
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
  days: Array<{ dateLocal: string; topicCount: number; updatedAt: string; status: string }>
  meta: ApiMeta
}

export type DailyDetailResponse = {
  daily: { daily_id: string; country: Country; date_local: string; generated_at: string | null; topic_count: number }
  topics: Array<TopicSummary & { rank: number }>
  meta: ApiMeta
}


