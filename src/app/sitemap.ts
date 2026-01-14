import type { MetadataRoute } from 'next'
import { COUNTRIES, fetchJson } from '../lib/tglApi'
import { getSiteBaseUrl } from '../lib/seo'
import { CACHE_POLICY } from '../lib/cache-policy'

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
  author_name: string | null
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

  // --- 基礎データ（lastmod をできる範囲で正しく） ---
  // 国別トップ（/{country}）の lastmod は /home の updatedAt を使用
  const homeLastModByCountry = new Map<string, Date>()
  for (const c of COUNTRIES) {
    try {
      const r = await fetchJson<{ updatedAt?: string }>(`/v1/${c.code}/home?limit=1`, { next: { revalidate: CACHE_POLICY.meta } })
      if (r?.updatedAt) homeLastModByCountry.set(c.code, new Date(r.updatedAt))
    } catch (error) {
      console.error(`Failed to fetch home updatedAt for ${c.code}:`, error)
    }
  }

  // 最新一覧（/{country}/latest）・ニュース（/{country}/news）は、latest topics の先頭（=最新）の時刻を利用
  const latestLastModByCountry = new Map<string, Date>()

  // 1. Topics（主要国/最新、上限5000件/国）
  for (const c of COUNTRIES) {
    try {
      // 最新トピックを取得（過去30日以内、または上位5000件）
      const topicsResponse = await fetchJson<{ topics: TopicItem[]; meta: any }>(
        `/v1/${c.code}/latest?limit=5000`,
        { next: { revalidate: CACHE_POLICY.meta } } // キャッシュ（メタ系）
      )

      const first = topicsResponse.topics?.[0] || null
      if (first) {
        const lm = first.last_source_published_at ? new Date(first.last_source_published_at) : new Date(first.last_seen_at)
        latestLastModByCountry.set(c.code, lm)
      }

      // JPは試験運用：トピック詳細は noindex 対象なので sitemap から外す
      if (c.code !== 'jp') {
        for (const topic of topicsResponse.topics.slice(0, 5000)) {
          const lastModified = topic.last_source_published_at
            ? new Date(topic.last_source_published_at)
            : new Date(topic.last_seen_at)
          entries.push({
            url: `${base}/${c.code}/news/n/${topic.topic_id}`,
            lastModified,
            changeFrequency: 'daily' as const,
            // ニュース詳細（量産枠）: 0.3〜0.4 に明確に下げる
            priority: 0.35,
          })
        }
      }
    } catch (error) {
      console.error(`Failed to fetch topics for ${c.code}:`, error)
    }
  }

  // 3. Columns（公開分、上限1000件/国）
  for (const c of COUNTRIES) {
    try {
      const columnsResponse = await fetchJson<{ columns: ColumnItem[]; meta: any }>(
        `/v1/${c.code}/columns?limit=1000`,
        { next: { revalidate: CACHE_POLICY.meta } } // キャッシュ（メタ系）
      )

      for (const column of columnsResponse.columns) {
        const lastModified = column.published_at ? new Date(column.published_at) : new Date(column.updated_at)
        entries.push({
          url: `${base}/${c.code}/columns/${column.column_id}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          // コラム詳細（少数精鋭）
          priority: c.code === 'jp' ? 0.75 : 0.9,
        })
      }
    } catch (error) {
      console.error(`Failed to fetch columns for ${c.code}:`, error)
    }
  }

  // 4. Quotes（公開分、上限1000件/国）
  // - 名言詳細: 0.4
  // - 名言著者ページ（quotes/author/{name}）: 0.6（まとめ役）
  for (const c of COUNTRIES) {
    try {
      const quotesResponse = await fetchJson<{ quotes: QuoteItem[]; meta: any }>(
        `/v1/${c.code}/quotes?limit=1000`,
        { next: { revalidate: CACHE_POLICY.meta } } // キャッシュ（メタ系）
      )

      const authors = new Set<string>()
      for (const quote of quotesResponse.quotes) {
        const author = String((quote as any)?.author_name || '').trim()
        if (author) authors.add(author)
        // JPは試験運用：名言詳細は noindex 対象なので sitemap から外す
        if (c.code !== 'jp') {
          entries.push({
            url: `${base}/${c.code}/quotes/${quote.quote_id}`,
            lastModified: new Date(quote.updated_at),
            changeFrequency: 'monthly' as const,
            priority: 0.4,
          })
        }
      }

      // 著者別名言一覧（人物名検索のハブ → その先のまとめ役）
      for (const author of Array.from(authors)) {
        entries.push({
          url: `${base}/${c.code}/quotes/author/${encodeURIComponent(author)}`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      }
    } catch (error) {
      console.error(`Failed to fetch quotes for ${c.code}:`, error)
    }
  }

  // 2. Morning Briefing（朝刊、status=ready、過去30日分）
  // - 日付詳細は updatedAt があればそれを lastmod にする
  // - 朝刊一覧（/{country}/daily）の lastmod は、その月の最大 updatedAt を利用
  const dailyIndexLastModByCountry = new Map<string, Date>()
  for (const c of COUNTRIES) {
    try {
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      const year = today.getFullYear()
      const month = today.getMonth() + 1

      const dailyResponse = await fetchJson<{ days: DailyItem[]; meta: any }>(
        `/v1/${c.code}/daily?year=${year}&month=${month}`,
        { next: { revalidate: CACHE_POLICY.meta } } // キャッシュ（メタ系）
      )

      const maxUpdatedAt = (() => {
        const xs = (dailyResponse.days || []).map((d) => (d.updatedAt ? new Date(d.updatedAt) : null)).filter(Boolean) as Date[]
        if (!xs.length) return null
        return xs.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b))
      })()
      if (maxUpdatedAt) dailyIndexLastModByCountry.set(c.code, maxUpdatedAt)

      for (const day of dailyResponse.days) {
        const dayDate = new Date(day.dateLocal)
        if (dayDate >= thirtyDaysAgo) {
          entries.push({
            url: `${base}/${c.code}/daily/${day.dateLocal}`,
            lastModified: day.updatedAt ? new Date(day.updatedAt) : dayDate,
            changeFrequency: 'daily' as const,
            // 朝刊（日付詳細）: 毎日の入口として 0.9
            priority: 0.9,
          })
        }
      }
    } catch (error) {
      console.error(`Failed to fetch daily for ${c.code}:`, error)
    }
  }

  // 3. 固定ページ（changefreq は雑でも揃える。priorityは過信しないがヒントとして記載）
  // NOTE: /saved はユーザー個人の保存リスト（クローラ非対象）なので sitemap から除外する
  // NOTE: /legal は /jp/legal へリダイレクト（互換）なので、sitemap には国別URLを載せる
  // NOTE: `/` は noindex 方針のため sitemap には載せない（国別トップへ評価を寄せる）
  const fixedRoutes: string[] = ['/about']
  for (const c of COUNTRIES) {
    fixedRoutes.push(`/${c.code}`)
    fixedRoutes.push(`/${c.code}/news`)
    fixedRoutes.push(`/${c.code}/latest`)
    fixedRoutes.push(`/${c.code}/daily`)
    fixedRoutes.push(`/${c.code}/daily/today`)
    fixedRoutes.push(`/${c.code}/about`)
    fixedRoutes.push(`/${c.code}/columns`)
    fixedRoutes.push(`/${c.code}/quotes`)
    fixedRoutes.push(`/${c.code}/quotes/authors`)
    fixedRoutes.push(`/${c.code}/legal`)
    // カテゴリページ（Event Registry news/* に揃えたサイト内部カテゴリ）
    const categories = ['heartwarming', 'science_earth', 'politics', 'health', 'technology', 'arts', 'business', 'sports']
    for (const cat of categories) {
      // JPは試験運用：Heartwarming以外のカテゴリトップは noindex 対象なので sitemap から外す
      if (c.code === 'jp' && cat !== 'heartwarming') continue
      fixedRoutes.push(`/${c.code}/category/${cat}`)
    }
  }

  const fixedEntries = fixedRoutes.map((path) => {
    // デフォルトは now（固定ページは更新頻度が低いが、運用上は雑でもOK）
    let lastModified: Date = now
    let changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly'
    let priority = 0.6

    if (path === '/about') {
      lastModified = now
      changeFrequency = 'yearly'
      priority = 0.3
    } else {
      const m = path.match(/^\/(us|uk|ca|jp)(\/.*)?$/)
      const cc = m?.[1] || null
      const rest = m?.[2] || ''
      if (cc) {
        if (rest === '') {
          lastModified = homeLastModByCountry.get(cc) || now
          changeFrequency = 'hourly'
          // JPは試験運用：国トップの優先度を少し下げる（indexは維持）
          priority = cc === 'jp' ? 0.9 : 1.0
        } else if (rest === '/about') {
          lastModified = now
          changeFrequency = 'yearly'
          priority = 0.5
        } else if (rest === '/news') {
          lastModified = latestLastModByCountry.get(cc) || homeLastModByCountry.get(cc) || now
          changeFrequency = 'hourly'
          // ニュースカテゴリ（評価の受け皿）
          priority = 0.85
        } else if (rest === '/latest') {
          lastModified = latestLastModByCountry.get(cc) || homeLastModByCountry.get(cc) || now
          changeFrequency = 'hourly'
          // 最新一覧は補助的（news/category のほうを集約点にする）
          priority = 0.6
        } else if (rest === '/daily') {
          lastModified = dailyIndexLastModByCountry.get(cc) || now
          changeFrequency = 'daily'
          // 朝刊（入口）
          priority = 0.9
        } else if (rest === '/daily/today') {
          lastModified = dailyIndexLastModByCountry.get(cc) || now
          changeFrequency = 'daily'
          // 朝刊（今日・入口）
          priority = 0.9
        } else if (rest === '/columns') {
          lastModified = now
          changeFrequency = 'weekly'
          // コラム一覧（少数だが思想の核）
          priority = cc === 'jp' ? 0.7 : 0.8
        } else if (rest === '/quotes') {
          lastModified = now
          changeFrequency = 'weekly'
          // 名言一覧（検索入口として強化）
          priority = 0.8
        } else if (rest === '/quotes/authors') {
          lastModified = now
          changeFrequency = 'weekly'
          // 名言著者一覧（人物名検索のハブ）
          priority = 0.7
        } else if (rest === '/legal') {
          lastModified = now
          changeFrequency = 'yearly'
          priority = 0.3
        } else if (rest.startsWith('/category/')) {
          lastModified = latestLastModByCountry.get(cc) || homeLastModByCountry.get(cc) || now
          changeFrequency = 'daily'
          // ニュースカテゴリ（評価の受け皿）
          priority = 0.85
        }
      }
    }

    return {
      url: `${base}${path}`,
      lastModified,
      changeFrequency,
      priority,
    }
  })

  entries.push(...fixedEntries)

  return entries
}


