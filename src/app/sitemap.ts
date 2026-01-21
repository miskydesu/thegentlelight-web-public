import type { MetadataRoute } from 'next'
import { COUNTRIES, fetchJson } from '../lib/tglApi'
import { getSiteBaseUrl, isIndexableTopic } from '../lib/seo'
import { CACHE_POLICY } from '../lib/cache-policy'

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
          if (
            !isIndexableTopic({
              summary: topic.summary ?? null,
              importance_score: topic.importance_score ?? null,
              source_count: topic.source_count ?? null,
              high_arousal: topic.high_arousal ?? null,
              distress_score: topic.distress_score ?? null,
            })
          ) {
            continue
          }
          const lastModified = topic.last_source_published_at
            ? new Date(topic.last_source_published_at)
            : new Date(topic.last_seen_at)
          // 末尾スラッシュを削除（SEO対策：リダイレクトエラーを防ぐ）
          entries.push({
            url: `${base}/${c.code}/news/n/${topic.topic_id}`.replace(/\/$/, ''),
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
      // 英語圏（US/CA/UK）のコラムは同一コンテンツ運用のため /en に集約する。
      // - /ca のデータを「代表」として /en/columns/* を生成
      // - /us, /uk は sitemap から除外（リダイレクトURLを載せない）
      if (c.code === 'us' || c.code === 'uk') continue
      const urlPrefix = c.code === 'ca' ? `${base}/en/columns` : `${base}/${c.code}/columns`
      const columnsResponse = await fetchJson<{ columns: ColumnItem[]; meta: any }>(
        `/v1/${c.code}/columns?limit=1000`,
        { next: { revalidate: CACHE_POLICY.meta } } // キャッシュ（メタ系）
      )

      for (const column of columnsResponse.columns) {
        const lastModified = column.published_at ? new Date(column.published_at) : new Date(column.updated_at)
        // 末尾スラッシュを削除（SEO対策：リダイレクトエラーを防ぐ）
        entries.push({
          url: `${urlPrefix}/${column.column_id}`.replace(/\/$/, ''),
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
      // 英語圏（US/CA/UK）の名言は同一コンテンツ運用のため /en に集約する。
      // - /ca のデータを「代表」として /en/quotes/* を生成
      // - /us, /uk は sitemap から除外（リダイレクトURLを載せない）
      if (c.code === 'us' || c.code === 'uk') continue
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
          const urlPrefix = c.code === 'ca' ? `${base}/en/quotes` : `${base}/${c.code}/quotes`
          // 末尾スラッシュを削除（SEO対策：リダイレクトエラーを防ぐ）
          entries.push({
            url: `${urlPrefix}/${quote.quote_id}`.replace(/\/$/, ''),
            lastModified: new Date(quote.updated_at),
            changeFrequency: 'monthly' as const,
            priority: 0.4,
          })
        }
      }

      // 著者別名言一覧（人物名検索のハブ → その先のまとめ役）
      // JPは最低限の狙いのため除外（CA/US/UKを優先）
      if (c.code !== 'jp') {
      const urlPrefix = c.code === 'ca' ? `${base}/en/quotes/author` : `${base}/${c.code}/quotes/author`
      for (const author of Array.from(authors)) {
          // 末尾スラッシュを削除（SEO対策：リダイレクトエラーを防ぐ）
        entries.push({
            url: `${urlPrefix}/${encodeURIComponent(author)}`.replace(/\/$/, ''),
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
        }
      }

      // 名言テーマ棚（上位9テーマ）：/en での index を狙う
      if (c.code === 'ca') {
        try {
          const themesResponse = await fetchJson<{ themes: Array<{ theme: string; count?: number | null; display_order?: number | null }> }>(
            `/v1/ca/quotes/themes`,
            { next: { revalidate: CACHE_POLICY.meta } }
          )
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
            entries.push({
              url: `${base}/en/quotes/theme/${encodeURIComponent(key)}`.replace(/\/$/, ''),
              lastModified: now,
              changeFrequency: 'weekly' as const,
              priority: 0.4,
            })
          }
        } catch (e) {
          console.error('Failed to fetch quote themes for en sitemap:', e)
        }
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

      // JPは最低限の狙いのため、朝刊の日付指定ページは除外（CA/US/UKを優先）
      if (c.code !== 'jp') {
      for (const day of dailyResponse.days) {
        const dayDate = new Date(day.dateLocal)
        if (dayDate >= thirtyDaysAgo) {
            // 末尾スラッシュを削除（SEO対策：リダイレクトエラーを防ぐ）
          entries.push({
              url: `${base}/${c.code}/daily/${day.dateLocal}`.replace(/\/$/, ''),
            lastModified: day.updatedAt ? new Date(day.updatedAt) : dayDate,
            changeFrequency: 'daily' as const,
            // 朝刊（日付詳細）: 毎日の入口として 0.9
            priority: 0.9,
          })
          }
        }
      }
    } catch (error) {
      console.error(`Failed to fetch daily for ${c.code}:`, error)
    }
  }

  // 3. 固定ページ（changefreq は雑でも揃える。priorityは過信しないがヒントとして記載）
  // NOTE: /saved はユーザー個人の保存リスト（クローラ非対象）なので sitemap から除外する
  // NOTE: /legal は /jp/legal へリダイレクト（互換）なので、sitemap には国別URLを載せる
  // NOTE: `/` は Global Editorial Home として indexable にする（x-default、常緑の入口）
  const fixedRoutes: string[] = ['/', '/about', '/en/about']
  for (const c of COUNTRIES) {
    fixedRoutes.push(`/${c.code}`)
    fixedRoutes.push(`/${c.code}/news`)
    fixedRoutes.push(`/${c.code}/latest`)
    fixedRoutes.push(`/${c.code}/daily`)
    // NOTE: 英語圏（US/CA/UK）の /about は /en/about に集約（リダイレクトURLを載せない）
    if (c.code === 'jp') fixedRoutes.push(`/${c.code}/about`)
    // NOTE: 英語圏（US/CA/UK）の columns/quotes/about は /en に集約（リダイレクトURLを載せない）
    if (c.code === 'jp') {
      fixedRoutes.push(`/${c.code}/columns`)
      fixedRoutes.push(`/${c.code}/quotes`)
      fixedRoutes.push(`/${c.code}/quotes/authors`)
    } else {
      // English editions: exclude /{country}/about from sitemap (redirects to /en/about)
      // keep other core pages under country
    }
    fixedRoutes.push(`/${c.code}/legal`)
    // カテゴリページ（Event Registry news/* に揃えたサイト内部カテゴリ）
    const categories = ['heartwarming', 'science_earth', 'politics', 'health', 'technology', 'arts', 'business', 'sports']
    for (const cat of categories) {
      // JPは試験運用：Heartwarming以外のカテゴリトップは noindex 対象なので sitemap から外す
      if (c.code === 'jp' && cat !== 'heartwarming') continue
      fixedRoutes.push(`/${c.code}/category/${cat}`)
    }
  }

  // /en（英語のコラム・名言の正URL）
  fixedRoutes.push('/en/columns')
  fixedRoutes.push('/en/quotes')
  fixedRoutes.push('/en/quotes/authors')

  const fixedEntries = fixedRoutes.map((path) => {
    // デフォルトは now（固定ページは更新頻度が低いが、運用上は雑でもOK）
    let lastModified: Date = now
    let changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly'
    let priority = 0.6

    if (path === '/') {
      lastModified = now
      changeFrequency = 'weekly'
      priority = 0.8
    } else if (path === '/about') {
      lastModified = now
      changeFrequency = 'yearly'
      priority = 0.3
    } else if (path === '/en/about') {
      lastModified = now
      changeFrequency = 'yearly'
      priority = 0.5
    } else {
      const m = path.match(/^\/(us|uk|ca|jp)(\/.*)?$/)
      const cc = m?.[1] || null
      const rest = m?.[2] || ''
      if (cc) {
        if (rest === '') {
          lastModified = homeLastModByCountry.get(cc) || now
          changeFrequency = 'hourly'
          // 優先国: CA/US=1.0（最優先）、UK=0.95、JP=0.9（最低限）
          priority = cc === 'ca' || cc === 'us' ? 1.0 : cc === 'uk' ? 0.95 : 0.9
        } else if (rest === '/about') {
          // NOTE: 英語圏（US/CA/UK）の /about は /en/about に集約
          if (cc === 'jp') {
            lastModified = now
            changeFrequency = 'yearly'
            priority = 0.5
          }
        } else if (rest === '/news') {
          lastModified = latestLastModByCountry.get(cc) || homeLastModByCountry.get(cc) || now
          changeFrequency = 'hourly'
          // ニュース一覧（評価の受け皿・重要ページ）
          priority = 0.9
        } else if (rest === '/latest') {
          lastModified = latestLastModByCountry.get(cc) || homeLastModByCountry.get(cc) || now
          // latest は補助（優先度を下げる）
          changeFrequency = 'daily'
          priority = 0.4
        } else if (rest === '/daily') {
          lastModified = dailyIndexLastModByCountry.get(cc) || now
          changeFrequency = 'daily'
          // 朝刊（入口）
          priority = 0.95
        } else if (rest === '/columns') {
          lastModified = now
          changeFrequency = 'weekly'
          // コラム一覧（少数だが思想の核）
          // 優先国: CA/US=0.85、UK=0.8、JP=0.7
          priority = cc === 'ca' || cc === 'us' ? 0.85 : cc === 'uk' ? 0.8 : 0.7
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
          const cat = rest.slice('/category/'.length)
          const isHeartwarming = cat === 'heartwarming'
          // カテゴリ棚は補助（ただし heartwarming は重要ページ）
          changeFrequency = isHeartwarming ? 'daily' : 'weekly'
          priority = isHeartwarming ? 0.9 : 0.55
        }
      }
    }

    // 末尾スラッシュを削除（SEO対策：リダイレクトエラーを防ぐ）
    const cleanPath = path.replace(/\/$/, '') || '/'
    return {
      url: `${base}${cleanPath}`,
      lastModified,
      changeFrequency,
      priority,
    }
  })

  entries.push(...fixedEntries)

  return entries
}


