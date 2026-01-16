import type { MetadataRoute } from 'next'
import type { Country } from './tglApi'
import { fetchJson } from './tglApi'
import { getSiteBaseUrl, isIndexableTopic } from './seo'
import { CACHE_POLICY } from './cache-policy'

type TopicItem = {
  topic_id: string
  last_seen_at: string
  last_source_published_at: string | null
  summary?: string | null
  importance_score?: number | null
  source_count?: number | null
  high_arousal?: boolean | null
  distress_score?: number | null
}

type DailyItem = {
  dateLocal: string
  updatedAt: string | null
}

type ColumnItem = {
  column_id: string
  published_at: string | null
  updated_at: string
}

type QuoteItem = {
  quote_id: string
  updated_at: string
}

type QuoteThemeItem = {
  theme: string
  theme_name?: string | null
  count?: number | null
  display_order?: number | null
}

const CATEGORIES = ['heartwarming', 'science_earth', 'politics', 'health', 'technology', 'arts', 'business', 'sports'] as const

function getLastModForTopic(t: TopicItem): Date {
  return t.last_source_published_at ? new Date(t.last_source_published_at) : new Date(t.last_seen_at)
}

export async function generateCountrySitemap(country: Country): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl()
  const now = new Date()
  const isJp = country === 'jp'

  // lastmod をできる範囲で正しく
  const homeLastMod = await (async () => {
    try {
      const r = await fetchJson<{ updatedAt?: string }>(`/v1/${country}/home?limit=1`, { next: { revalidate: CACHE_POLICY.meta } })
      return r?.updatedAt ? new Date(r.updatedAt) : null
    } catch {
      return null
    }
  })()

  const latestMeta = await (async () => {
    try {
      const r = await fetchJson<{ topics: TopicItem[] }>(`/v1/${country}/latest?limit=1`, { next: { revalidate: CACHE_POLICY.meta } })
      const first = r?.topics?.[0] || null
      return first ? getLastModForTopic(first) : null
    } catch {
      return null
    }
  })()

  const dailyIndexLastMod = await (async () => {
    try {
      const today = new Date()
      const year = today.getFullYear()
      const month = today.getMonth() + 1
      const r = await fetchJson<{ days: DailyItem[] }>(`/v1/${country}/daily?year=${year}&month=${month}`, { next: { revalidate: CACHE_POLICY.meta } })
      const xs = (r.days || []).map((d) => (d.updatedAt ? new Date(d.updatedAt) : null)).filter(Boolean) as Date[]
      if (!xs.length) return null
      return xs.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b))
    } catch {
      return null
    }
  })()

  const fixed: MetadataRoute.Sitemap = []

  // 国別トップ（末尾スラッシュを削除）
  // 優先国: CA/US=1.0（最優先）、UK=0.95、JP=0.9（最低限）
  const countryPriority = country === 'ca' || country === 'us' ? 1.0 : country === 'uk' ? 0.95 : 0.9
  fixed.push({
    url: `${base}/${country}`.replace(/\/$/, ''),
    lastModified: homeLastMod || now,
    changeFrequency: 'hourly',
    priority: countryPriority,
  })

  // 主要固定ページ（国配下、末尾スラッシュを削除）
  fixed.push(
    {
      url: `${base}/${country}/about`.replace(/\/$/, ''),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${base}/${country}/news`.replace(/\/$/, ''),
      lastModified: latestMeta || homeLastMod || now,
      changeFrequency: 'hourly',
      // ニュースカテゴリ（評価の受け皿）
      priority: 0.85,
    },
    {
      url: `${base}/${country}/latest`.replace(/\/$/, ''),
      lastModified: latestMeta || homeLastMod || now,
      changeFrequency: 'hourly',
      // 最新一覧は補助的（news/categoryのほうを集約点にする）
      priority: 0.6,
    },
    {
      url: `${base}/${country}/daily`.replace(/\/$/, ''),
      lastModified: dailyIndexLastMod || now,
      changeFrequency: 'daily',
      // 朝刊（入口）
      priority: 0.9,
    },
    {
      url: `${base}/${country}/columns`.replace(/\/$/, ''),
      lastModified: now,
      changeFrequency: 'weekly',
      // コラム一覧（少数だが思想の核）
      // 優先国: CA/US=0.85、UK=0.8、JP=0.7
      priority: country === 'ca' || country === 'us' ? 0.85 : country === 'uk' ? 0.8 : 0.7,
    },
    {
      url: `${base}/${country}/quotes`.replace(/\/$/, ''),
      lastModified: now,
      changeFrequency: 'weekly',
      // 名言一覧（検索入口として強化）
      priority: 0.8,
    },
    {
      url: `${base}/${country}/quotes/authors`.replace(/\/$/, ''),
      lastModified: now,
      changeFrequency: 'weekly',
      // 名言著者一覧（人物名検索のハブ）
      priority: 0.7,
    }
  )

  // 利用規約・プライバシー（国別、末尾スラッシュを削除）
  fixed.push({
    url: `${base}/${country}/legal`.replace(/\/$/, ''),
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.3,
  })

  for (const cat of CATEGORIES) {
    // JPは試験運用：Heartwarming以外のカテゴリトップは noindex 対象なので sitemap から外す
    if (isJp && cat !== 'heartwarming') continue
    fixed.push({
      url: `${base}/${country}/category/${cat}`.replace(/\/$/, ''),
      lastModified: latestMeta || homeLastMod || now,
      changeFrequency: 'daily',
      // ニュースカテゴリ（評価の受け皿）
      priority: 0.85,
    })
  }

  // 名言テーマ棚（上位9テーマ）
  const themeEntries: MetadataRoute.Sitemap = []
  try {
    const themesResponse = await fetchJson<{ themes: QuoteThemeItem[] }>(`/v1/${country}/quotes/themes`, {
      next: { revalidate: CACHE_POLICY.meta },
    })
    const themes = (themesResponse.themes || [])
      .filter((x) => (x.count || 0) > 0)
      .sort((a, b) => {
        const ao = a.display_order ?? 9999
        const bo = b.display_order ?? 9999
        if (ao !== bo) return ao - bo
        return (b.count || 0) - (a.count || 0)
      })
      .slice(0, 9)
    for (const th of themes) {
      const key = String(th.theme || '').trim()
      if (!key) continue
      themeEntries.push({
        url: `${base}/${country}/quotes/theme/${encodeURIComponent(key)}`.replace(/\/$/, ''),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.4,
      })
    }
  } catch (e) {
    console.error(`Failed to fetch quote themes for sitemap (${country}):`, e)
  }

  // トピック詳細（国別）
  const topicEntries: MetadataRoute.Sitemap = []
  try {
    const topicsResponse = await fetchJson<{ topics: TopicItem[]; meta: any }>(`/v1/${country}/latest?limit=5000`, {
      next: { revalidate: CACHE_POLICY.meta },
    })
    // JPは試験運用：トピック詳細は noindex 対象なので sitemap から外す
    if (!isJp) {
      for (const t of (topicsResponse.topics || []).slice(0, 5000)) {
        if (
          !isIndexableTopic({
            summary: t.summary ?? null,
            importance_score: t.importance_score ?? null,
            source_count: t.source_count ?? null,
            high_arousal: t.high_arousal ?? null,
            distress_score: t.distress_score ?? null,
          })
        ) {
          continue
        }
        topicEntries.push({
          url: `${base}/${country}/news/n/${t.topic_id}`.replace(/\/$/, ''),
          lastModified: getLastModForTopic(t),
          changeFrequency: 'daily',
          // ニュース詳細（量産枠）: 0.3〜0.4 に明確に下げる
          priority: 0.35,
        })
      }
    }
  } catch (e) {
    console.error(`Failed to fetch topics for sitemap (${country}):`, e)
  }

  // コラム詳細（公開分、上限1000）
  const columnEntries: MetadataRoute.Sitemap = []
  try {
    const columnsResponse = await fetchJson<{ columns: ColumnItem[]; meta: any }>(`/v1/${country}/columns?limit=1000`, {
      next: { revalidate: CACHE_POLICY.meta },
    })
    for (const c of columnsResponse.columns || []) {
      const lastModified = c.published_at ? new Date(c.published_at) : new Date(c.updated_at)
      columnEntries.push({
        url: `${base}/${country}/columns/${c.column_id}`.replace(/\/$/, ''),
        lastModified,
        changeFrequency: 'weekly',
        // コラム詳細（少数精鋭）
        priority: isJp ? 0.75 : 0.9,
      })
    }
  } catch (e) {
    console.error(`Failed to fetch columns for sitemap (${country}):`, e)
  }

  // 名言詳細（上限1000）
  const quoteEntries: MetadataRoute.Sitemap = []
  try {
    const quotesResponse = await fetchJson<{ quotes: QuoteItem[]; meta: any }>(`/v1/${country}/quotes?limit=1000`, {
      next: { revalidate: CACHE_POLICY.meta },
    })
    const authors = new Set<string>()
    for (const q of quotesResponse.quotes || []) {
      const author = String((q as any)?.author_name || '').trim()
      if (author) authors.add(author)
      // JPは試験運用：名言詳細は noindex 対象なので sitemap から外す
      if (!isJp) {
        quoteEntries.push({
          url: `${base}/${country}/quotes/${q.quote_id}`.replace(/\/$/, ''),
          lastModified: new Date(q.updated_at),
          changeFrequency: 'monthly',
          // 名言詳細（主役ではない）
          priority: 0.4,
        })
      }
    }

    // 名言著者の名言（まとめ役）
    // JPは最低限の狙いのため除外（CA/US/UKを優先）
    if (!isJp) {
    for (const author of Array.from(authors)) {
      quoteEntries.push({
          url: `${base}/${country}/quotes/author/${encodeURIComponent(author)}`.replace(/\/$/, ''),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
      }
    }
  } catch (e) {
    console.error(`Failed to fetch quotes for sitemap (${country}):`, e)
  }

  // 朝刊（日付詳細、過去30日）
  // JPは最低限の狙いのため除外（CA/US/UKを優先）
  const dailyEntries: MetadataRoute.Sitemap = []
  if (!isJp) {
  try {
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const r = await fetchJson<{ days: DailyItem[]; meta: any }>(`/v1/${country}/daily?year=${year}&month=${month}`, {
      next: { revalidate: CACHE_POLICY.meta },
    })
    for (const day of r.days || []) {
      const dayDate = new Date(day.dateLocal)
      if (dayDate < thirtyDaysAgo) continue
      dailyEntries.push({
          url: `${base}/${country}/daily/${day.dateLocal}`.replace(/\/$/, ''),
        lastModified: day.updatedAt ? new Date(day.updatedAt) : dayDate,
        changeFrequency: 'daily',
        // 朝刊（日付詳細）: 毎日の入口
        priority: 0.9,
      })
    }
  } catch (e) {
    console.error(`Failed to fetch daily for sitemap (${country}):`, e)
    }
  }

  return [...fixed, ...themeEntries, ...topicEntries, ...columnEntries, ...quoteEntries, ...dailyEntries]
}


