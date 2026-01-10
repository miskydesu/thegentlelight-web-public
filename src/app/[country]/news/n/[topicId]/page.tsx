import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type TopicDetailResponse, type TopicSourcesResponse } from '../../../../../lib/tglApi'
import { canonicalUrl } from '../../../../../lib/seo'
import { getLocaleForCountry, type Locale } from '../../../../../lib/i18n'
import { generateSEOMetadata, generateArticleJSONLD } from '../../../../../lib/seo-helpers'
import { getSiteBaseUrl } from '../../../../../lib/seo'
import { getGentleFromSearchParams } from '../../../../../lib/view-switch'
import { Card, CardContent, CardMeta, CardTitle } from '../../../../../components/ui/Card'
import { getCategoryBadgeTheme, getCategoryLabel } from '../../../../../lib/categories'
import styles from './topic.module.css'
import { SaveTopicButton } from '../../../../../components/topic/SaveTopicButton'
import { CACHE_POLICY } from '@/lib/cache-policy'
// 表示はsoft一本（UX方針）

function isApiNotFoundError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '')
  // fetchJson() throws: `API ${status} ...` so this catches the 404 path reliably.
  return msg.includes('API 404') || msg.includes(' 404 ')
}

export async function generateMetadata({
  params,
}: {
  params: { country: string; topicId: string }
}) {
  const { country, topicId } = params
  if (!isCountry(country)) return {}

  const lang: Locale = getLocaleForCountry(country)
  const isJa = lang === 'ja'
  const brandSuffix = isJa ? 'やさしいニュース The Gentle Light' : 'Calm News The Gentle Light'
  const sep = isJa ? '｜' : ' | '

  try {
    // トピックデータを取得（metadata生成用）
    const data = await fetchJson<TopicDetailResponse>(`/v1/${country}/topics/${encodeURIComponent(topicId)}`, {
      next: { revalidate: CACHE_POLICY.stable },
    })
    const t = data.topic

    const base = getSiteBaseUrl()
    const path = `/news/n/${topicId}`
    const canonicalPath = `/${country}${path}`

    return generateSEOMetadata({
      title: `${t.title || `${country.toUpperCase()} News`}${sep}${brandSuffix}`,
      description: t.summary || undefined,
      type: 'article',
      publishedTime: t.last_source_published_at || undefined,
      canonical: `${base}${canonicalPath}`,
    })
  } catch (error) {
    // エラー時は最小限のmetadataを返す
    return generateSEOMetadata({
      title: `${country.toUpperCase()} News${sep}${brandSuffix}`,
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

  let data: TopicDetailResponse
  try {
    data = await fetchJson<TopicDetailResponse>(`/v1/${country}/topics/${encodeURIComponent(topicId)}${gentle ? '?gentle=1' : ''}`, {
      next: { revalidate: CACHE_POLICY.stable },
    })
  } catch (e) {
    // Ensure a clean 404 page for deleted/hidden/nonexistent topics (e.g. Google indexed old URLs)
    if (isApiNotFoundError(e)) return notFound()
    throw e
  }

  // Sources are optional for rendering; if this fails, show the topic page with no sources.
  let sourcesData: TopicSourcesResponse = { sources: [], meta: { is_partial: false } as any }
  try {
    sourcesData = await fetchJson<TopicSourcesResponse>(`/v1/${country}/topics/${encodeURIComponent(topicId)}/sources${gentle ? '?gentle=1' : ''}`, {
      next: { revalidate: CACHE_POLICY.stable },
    })
  } catch (e) {
    if (isApiNotFoundError(e)) {
      // If sources endpoint returns 404, treat it as "no sources" rather than breaking the page.
      sourcesData = { sources: [], meta: { is_partial: false } as any }
    } else {
      throw e
    }
  }
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
  const isJa = locale === 'ja'
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
            {isJa ? '← ニュース' : '← News'}
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
            <span className={styles.cardTitleAccent}>{isJa ? '要約' : 'Summary'}</span>
          </CardTitle>
          <CardContent>
            {topic.summary ? (
              <div className={styles.bodyText}>{topic.summary}</div>
            ) : (
              <div className={styles.mutedText}>{isJa ? '（要約はまだありません）' : '(No summary yet)'}</div>
            )}
          </CardContent>
        </Card>

        <div style={{ height: 12 }} />

        <Card className={styles.topCard}>
          <CardTitle className={styles.sectionTitle}>
            <span className={styles.cardTitleAccent}>{isJa ? '本文' : 'Content'}</span>
          </CardTitle>
          <CardContent>
            {topic.content ? (
              <div className={styles.bodyText}>{topic.content}</div>
            ) : (
              <div className={styles.mutedText}>{isJa ? '（本文はまだありません）' : '(No content yet)'}</div>
            )}
          </CardContent>
        </Card>

        <div style={{ height: 12 }} />

        <Card className={styles.topCard}>
          <CardTitle className={styles.sectionTitle}>
            <span className={styles.cardTitleAccent}>{isJa ? '参照元' : 'Sources'}</span>
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
                      <span>{isJa ? '外部サイトで開く →' : 'Open source →'}</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className={styles.mutedText}>{isJa ? '（参照元がまだありません）' : '(No sources yet)'}</div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  )
}


