import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type TopicDetailResponse, type TopicSourcesResponse } from '../../../../../lib/tglApi'
import { canonicalUrl } from '../../../../../lib/seo'
import { getLocaleForCountry, type Locale } from '../../../../../lib/i18n'
import { generateSEOMetadata, generateArticleJSONLD, generateHreflang } from '../../../../../lib/seo-helpers'
import { getSiteBaseUrl } from '../../../../../lib/seo'
import { getGentleFromSearchParams } from '../../../../../lib/view-switch'
import { Card, CardContent, CardMeta, CardTitle } from '../../../../../components/ui/Card'
import { getCategoryBadgeTheme, getCategoryLabel } from '../../../../../lib/categories'
import styles from './topic.module.css'
import { SaveTopicButton } from '../../../../../components/topic/SaveTopicButton'
// 表示はsoft一本（UX方針）

export async function generateMetadata({
  params,
}: {
  params: { country: string; topicId: string }
}) {
  const { country, topicId } = params
  if (!isCountry(country)) return {}

  const lang: Locale = getLocaleForCountry(country)

  try {
    // トピックデータを取得（metadata生成用）
    const data = await fetchJson<TopicDetailResponse>(`/v1/${country}/topics/${encodeURIComponent(topicId)}`, {
      next: { revalidate: 300 }, // 5分キャッシュ
    })
    const t = data.topic

    const base = getSiteBaseUrl()
    const path = `/news/n/${topicId}`
    const canonicalPath = `/${country}${path}`

    // 利用可能な言語を判定（topic_localizationsから）
    // 注意: 現時点ではAPIレスポンスに言語情報が含まれていないため、デフォルト言語のみと仮定
    // TODO: APIレスポンスに言語情報を追加するか、別途APIで確認
    const availableLangs: Locale[] = [getLocaleForCountry(country)] // デフォルト言語は常に利用可能
    // 将来的に翻訳がある場合は追加: if (hasTranslation) availableLangs.push(otherLang)

    const hreflang = generateHreflang(country, path, availableLangs)

    return generateSEOMetadata({
      title: t.title || `${country.toUpperCase()} News`,
      description: t.summary || undefined,
      type: 'article',
      publishedTime: t.last_source_published_at || undefined,
      canonical: `${base}${canonicalPath}`,
      hreflang,
    })
  } catch (error) {
    // エラー時は最小限のmetadataを返す
    return generateSEOMetadata({
      title: `${country.toUpperCase()} News`,
      canonical: canonicalUrl(`/${country}/news/n/${topicId}`),
    })
  }
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: { country: string; topicId: string }
  searchParams: { gentle?: string }
}) {
  const { country, topicId } = params
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const gentle = getGentleFromSearchParams(searchParams)

  const [data, sourcesData] = await Promise.all([
    fetchJson<TopicDetailResponse>(`/v1/${country}/topics/${encodeURIComponent(topicId)}${gentle ? '?gentle=1' : ''}`, {
      next: { revalidate: 30 },
    }),
    fetchJson<TopicSourcesResponse>(`/v1/${country}/topics/${encodeURIComponent(topicId)}/sources${gentle ? '?gentle=1' : ''}`, {
      next: { revalidate: 30 },
    }),
  ])
  const topic = data.topic

  const base = getSiteBaseUrl()
  const path = `/news/n/${topicId}`
  const canonicalPath = `/${country}${path}`
  const articleJSONLD = generateArticleJSONLD({
    title: topic.title || `${country.toUpperCase()} News`,
    description: topic.summary || undefined,
    url: `${base}${canonicalPath}`,
    publishedTime: topic.last_source_published_at || undefined,
  })

  const locale = lang === 'ja' ? 'ja' : 'en'
  const categoryLabel = getCategoryLabel(topic.category, locale)
  const catTheme = getCategoryBadgeTheme(topic.category)
  const publishedLabel = topic.last_source_published_at
    ? new Date(topic.last_source_published_at).toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US')
    : null
  const sources = (sourcesData.sources || []).slice(0, 6)
  const sourceCountLabel =
    locale === 'ja'
      ? `参照元 : ${topic.source_count}記事`
      : `Sources: ${topic.source_count} ${topic.source_count === 1 ? 'article' : 'articles'}`
  const highArousalLabel = locale === 'ja' ? '心の負担に注意' : 'May be upsetting'
  const showCaution = Boolean(topic.high_arousal) || (topic.distress_score ?? 0) >= 50
  const pickSourceBadgeLabel = (s: { source_name: string | null; source_domain: string | null }) => {
    const name = String(s.source_name || '').trim()
    // 文字化け（置換文字 U+FFFD）が混ざる場合は domain にフォールバック
    if (name && !name.includes('\uFFFD')) return name
    const domain = String(s.source_domain || '').trim()
    return domain || ''
  }

  return (
    <>
      {/* JSON-LD構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJSONLD),
        }}
      />

      <main>
        <div className={styles.pageHeader}>
          <Link
            href={`/${country}/news${gentle ? '?gentle=1' : ''}`}
            style={{ fontSize: '0.95rem', color: 'var(--muted)', textDecoration: 'none' }}
          >
            ← ニュース
          </Link>
          <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{gentle ? 'Gentle' : 'All'}</span>
        </div>

        <Card className={styles.topCard} style={{ ['--cat-color' as any]: catTheme.color }}>
          <CardTitle as="h1" style={{ fontSize: '1.45rem', marginBottom: 10 }}>
            <span className={styles.cardTitleAccent}>{topic.title || '—'}</span>
          </CardTitle>
          <CardMeta className={styles.metaRow}>
            <span className={styles.metaLeft}>
              <span className={styles.categoryBadge} style={catTheme}>
                {categoryLabel}
              </span>
              {showCaution ? (
                <span className={styles.categoryBadge} style={{ opacity: 0.75 }}>
                  {highArousalLabel}
                </span>
              ) : null}
              <span className={styles.countPill}>{sourceCountLabel}</span>
              <SaveTopicButton
                topic={{
                  topic_id: topic.topic_id,
                  country: topic.country as any,
                  category: topic.category,
                  title: topic.title || '—',
                  importance_score: topic.importance_score || 0,
                  source_count: topic.source_count || 0,
                  last_seen_at: topic.last_seen_at ?? null,
                  last_source_published_at: topic.last_source_published_at ?? null,
                  high_arousal: Boolean(topic.high_arousal),
                  distress_score: topic.distress_score ?? null,
                  summary: topic.summary ?? null,
                  summary_updated_at: topic.summary_updated_at ?? null,
                }}
              />
            </span>
            {publishedLabel ? <span className={styles.metaRight}>{publishedLabel}</span> : null}
          </CardMeta>
        </Card>

        <div style={{ height: 12 }} />

        <Card className={styles.topCard}>
          <CardTitle className={styles.sectionTitle}>
            <span className={styles.cardTitleAccent}>要約</span>
          </CardTitle>
          <CardContent>
            {topic.summary ? <div className={styles.bodyText}>{topic.summary}</div> : <div className={styles.mutedText}>（要約はまだありません）</div>}
          </CardContent>
        </Card>

        <div style={{ height: 12 }} />

        <Card className={styles.topCard}>
          <CardTitle className={styles.sectionTitle}>
            <span className={styles.cardTitleAccent}>本文</span>
          </CardTitle>
          <CardContent>
            {topic.content ? <div className={styles.bodyText}>{topic.content}</div> : <div className={styles.mutedText}>（本文はまだありません）</div>}
          </CardContent>
        </Card>

        <div style={{ height: 12 }} />

        <Card className={styles.topCard}>
          <CardTitle className={styles.sectionTitle}>
            <span className={styles.cardTitleAccent}>参照元</span>
          </CardTitle>
          <CardContent>
            {sources.length ? (
              <div className={styles.sourceList}>
                {sources.map((s) => (
                  <a key={s.source_id} className={styles.sourceItem} href={s.url} target="_blank" rel="noreferrer">
                    <div className={styles.sourceTitle}>{s.title || '—'}</div>
                    <div className={styles.sourceMeta}>
                      {(() => {
                        const label = pickSourceBadgeLabel(s)
                        return label ? <span className={styles.categoryBadge}>{label}</span> : null
                      })()}
                      {s.published_at ? <span>{new Date(s.published_at).toLocaleString()}</span> : null}
                      <span>外部サイトで開く →</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className={styles.mutedText}>（参照元がまだありません）</div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  )
}


