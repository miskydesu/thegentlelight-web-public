import type { MetadataRoute } from 'next'
import { COUNTRIES, fetchJson } from '../lib/tglApi'

function getSiteBaseUrl(): string {
  // 環境変数: NEXT_PUBLIC_SITE_URL（prod/stg/devで設定）
  const v = process.env.NEXT_PUBLIC_SITE_URL
  if (v) return v.replace(/\/$/, '')
  // フォールバック（ローカル開発）
  return 'http://localhost:3000'
}

type TopicItem = {
  topic_id: string
  last_seen_at: string
  last_source_published_at: string | null
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

type DailyItem = {
  dateLocal: string
  updatedAt: string | null
}

/**
 * フェーズF1: sitemap を動的生成へ
 * - topics（主要国/主要カテゴリ/最新）
 * - columns/quotes（公開分）
 * - daily（日報、status=ready）
 * - ページングの安定URL（queryだらけを避ける）
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl()
  const now = new Date()

  const entries: MetadataRoute.Sitemap = []

  // 1. 固定ページ
  const fixedRoutes: string[] = ['/', '/about', '/legal', '/saved']
  for (const c of COUNTRIES) {
    fixedRoutes.push(`/${c.code}`)
    fixedRoutes.push(`/${c.code}/news`)
    fixedRoutes.push(`/${c.code}/today`)
    fixedRoutes.push(`/${c.code}/latest`)
    fixedRoutes.push(`/${c.code}/daily`)
    // カテゴリページ（Event Registry news/* に揃えたサイト内部カテゴリ）
    const categories = ['politics', 'business', 'technology', 'health', 'science_earth', 'arts']
    for (const cat of categories) {
      fixedRoutes.push(`/${c.code}/category/${cat}`)
    }
  }

  entries.push(
    ...fixedRoutes.map((path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: path === '/' ? 1.0 : 0.8,
    }))
  )

  // 2. Topics（主要国/最新、上限5000件/国）
  for (const c of COUNTRIES) {
    try {
      // 最新トピックを取得（過去30日以内、または上位5000件）
      const topicsResponse = await fetchJson<{ topics: TopicItem[]; meta: any }>(
        `/v1/${c.code}/latest?limit=5000`,
        { next: { revalidate: 3600 } } // 1時間キャッシュ
      )

      for (const topic of topicsResponse.topics.slice(0, 5000)) {
        const lastModified = topic.last_source_published_at
          ? new Date(topic.last_source_published_at)
          : new Date(topic.last_seen_at)
        entries.push({
          url: `${base}/${c.code}/news/n/${topic.topic_id}`,
          lastModified,
          changeFrequency: 'daily' as const,
          priority: 0.7,
        })
      }
    } catch (error) {
      console.error(`Failed to fetch topics for ${c.code}:`, error)
    }
  }

  // 3. Columns（公開分、上限1000件/国）
  // 注意: columns/quotesのページが実装されていない場合はスキップ
  // TODO: columns/quotesのページ実装後に有効化
  /*
  for (const c of COUNTRIES) {
    try {
      const columnsResponse = await fetchJson<{ columns: ColumnItem[]; meta: any }>(
        `${apiBase}/v1/${c.code}/columns?limit=1000`,
        { next: { revalidate: 3600 } } // 1時間キャッシュ
      )

      for (const column of columnsResponse.columns) {
        const lastModified = column.published_at ? new Date(column.published_at) : new Date(column.updated_at)
        entries.push({
          url: `${base}/${c.code}/columns/${column.column_id}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      }
    } catch (error) {
      console.error(`Failed to fetch columns for ${c.code}:`, error)
    }
  }

  // 4. Quotes（公開分、上限1000件/国）
  for (const c of COUNTRIES) {
    try {
      const quotesResponse = await fetchJson<{ quotes: QuoteItem[]; meta: any }>(
        `${apiBase}/v1/${c.code}/quotes?limit=1000`,
        { next: { revalidate: 3600 } } // 1時間キャッシュ
      )

      for (const quote of quotesResponse.quotes) {
        entries.push({
          url: `${base}/${c.code}/quotes/${quote.quote_id}`,
          lastModified: new Date(quote.updated_at),
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        })
      }
    } catch (error) {
      console.error(`Failed to fetch quotes for ${c.code}:`, error)
    }
  }
  */

  // 5. Daily（日報、status=ready、過去30日分）
  for (const c of COUNTRIES) {
    try {
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      const year = today.getFullYear()
      const month = today.getMonth() + 1

      const dailyResponse = await fetchJson<{ days: DailyItem[]; meta: any }>(
        `/v1/${c.code}/daily?year=${year}&month=${month}`,
        { next: { revalidate: 3600 } } // 1時間キャッシュ
      )

      for (const day of dailyResponse.days) {
        const dayDate = new Date(day.dateLocal)
        if (dayDate >= thirtyDaysAgo) {
          entries.push({
            url: `${base}/${c.code}/daily/${day.dateLocal}`,
            lastModified: day.updatedAt ? new Date(day.updatedAt) : dayDate,
            changeFrequency: 'daily' as const,
            priority: 0.6,
          })
        }
      }
    } catch (error) {
      console.error(`Failed to fetch daily for ${c.code}:`, error)
    }
  }

  return entries
}


