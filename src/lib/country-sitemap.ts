import type { MetadataRoute } from 'next'
import type { Country } from './tglApi'
import { fetchJson } from './tglApi'
import { getSiteBaseUrl } from './seo'

type TopicItem = {
  topic_id: string
  last_seen_at: string
  last_source_published_at: string | null
}

type DailyItem = {
  dateLocal: string
  updatedAt: string | null
}

const CATEGORIES = ['heartwarming', 'science_earth', 'politics', 'health', 'technology', 'arts', 'business', 'sports'] as const

function getLastModForTopic(t: TopicItem): Date {
  return t.last_source_published_at ? new Date(t.last_source_published_at) : new Date(t.last_seen_at)
}

export async function generateCountrySitemap(country: Country): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl()
  const now = new Date()

  // lastmod をできる範囲で正しく
  const homeLastMod = await (async () => {
    try {
      const r = await fetchJson<{ updatedAt?: string }>(`/v1/${country}/home?limit=1`, { next: { revalidate: 3600 } })
      return r?.updatedAt ? new Date(r.updatedAt) : null
    } catch {
      return null
    }
  })()

  const latestMeta = await (async () => {
    try {
      const r = await fetchJson<{ topics: TopicItem[] }>(`/v1/${country}/latest?limit=1`, { next: { revalidate: 3600 } })
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
      const r = await fetchJson<{ days: DailyItem[] }>(`/v1/${country}/daily?year=${year}&month=${month}`, { next: { revalidate: 3600 } })
      const xs = (r.days || []).map((d) => (d.updatedAt ? new Date(d.updatedAt) : null)).filter(Boolean) as Date[]
      if (!xs.length) return null
      return xs.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b))
    } catch {
      return null
    }
  })()

  const fixed: MetadataRoute.Sitemap = []

  // 国別トップ
  fixed.push({
    url: `${base}/${country}`,
    lastModified: homeLastMod || now,
    changeFrequency: 'hourly',
    priority: 1.0,
  })

  // 主要固定ページ（国配下）
  fixed.push(
    {
      url: `${base}/${country}/news`,
      lastModified: latestMeta || homeLastMod || now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${base}/${country}/latest`,
      lastModified: latestMeta || homeLastMod || now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${base}/${country}/today`,
      lastModified: dailyIndexLastMod || latestMeta || now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${base}/${country}/daily`,
      lastModified: dailyIndexLastMod || now,
      changeFrequency: 'daily',
      priority: 0.8,
    }
  )

  for (const cat of CATEGORIES) {
    fixed.push({
      url: `${base}/${country}/category/${cat}`,
      lastModified: latestMeta || homeLastMod || now,
      changeFrequency: 'daily',
      priority: 0.7,
    })
  }

  // トピック詳細（国別）
  const topicEntries: MetadataRoute.Sitemap = []
  try {
    const topicsResponse = await fetchJson<{ topics: TopicItem[]; meta: any }>(`/v1/${country}/latest?limit=5000`, {
      next: { revalidate: 3600 },
    })
    for (const t of (topicsResponse.topics || []).slice(0, 5000)) {
      topicEntries.push({
        url: `${base}/${country}/news/n/${t.topic_id}`,
        lastModified: getLastModForTopic(t),
        changeFrequency: 'daily',
        priority: 0.7,
      })
    }
  } catch (e) {
    console.error(`Failed to fetch topics for sitemap (${country}):`, e)
  }

  // 朝刊（日付詳細、過去30日）
  const dailyEntries: MetadataRoute.Sitemap = []
  try {
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const r = await fetchJson<{ days: DailyItem[]; meta: any }>(`/v1/${country}/daily?year=${year}&month=${month}`, {
      next: { revalidate: 3600 },
    })
    for (const day of r.days || []) {
      const dayDate = new Date(day.dateLocal)
      if (dayDate < thirtyDaysAgo) continue
      dailyEntries.push({
        url: `${base}/${country}/daily/${day.dateLocal}`,
        lastModified: day.updatedAt ? new Date(day.updatedAt) : dayDate,
        changeFrequency: 'daily',
        priority: 0.6,
      })
    }
  } catch (e) {
    console.error(`Failed to fetch daily for sitemap (${country}):`, e)
  }

  return [...fixed, ...topicEntries, ...dailyEntries]
}


