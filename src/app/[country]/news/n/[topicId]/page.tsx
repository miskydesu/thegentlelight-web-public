import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type TopicDetailResponse } from '../../../../../lib/tglApi'
import { canonicalUrl } from '../../../../../lib/seo'
import { getLocaleForCountry, type Locale } from '../../../../../lib/i18n'
import { generateSEOMetadata, generateArticleJSONLD, generateHreflang } from '../../../../../lib/seo-helpers'
import { getSiteBaseUrl } from '../../../../../lib/seo'
import { getViewFromSearchParams, type View } from '../../../../../lib/view-switch'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { country: string; topicId: string }
  searchParams: { lang?: string; view?: string }
}) {
  const { country, topicId } = params
  if (!isCountry(country)) return {}

  const lang: Locale = searchParams.lang === 'en' || searchParams.lang === 'ja' ? searchParams.lang : getLocaleForCountry(country)
  const view: View = getViewFromSearchParams(searchParams)

  try {
    // トピックデータを取得（metadata生成用）
    const data = await fetchJson<TopicDetailResponse>(`/v1/${country}/topics/${encodeURIComponent(topicId)}?lang=${lang}&view=${view}`, {
      next: { revalidate: 300 }, // 5分キャッシュ
    })
    const t = data.topic

    const base = getSiteBaseUrl()
    const path = `/news/n/${topicId}`
    const canonicalPath = lang === getLocaleForCountry(country) ? `/${country}${path}` : `/${country}${path}?lang=${lang}`

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
  searchParams: { lang?: string; view?: string }
}) {
  const { country, topicId } = params
  if (!isCountry(country)) return notFound()

  const lang: Locale = searchParams.lang === 'en' || searchParams.lang === 'ja' ? searchParams.lang : getLocaleForCountry(country)
  const view: View = getViewFromSearchParams(searchParams)
  const data = await fetchJson<TopicDetailResponse>(`/v1/${country}/topics/${encodeURIComponent(topicId)}?lang=${lang}&view=${view}`, { next: { revalidate: 30 } })
  const t = data.topic

  const base = getSiteBaseUrl()
  const path = `/news/n/${topicId}`
  const canonicalPath = lang === getLocaleForCountry(country) ? `/${country}${path}` : `/${country}${path}?lang=${lang}`
  const articleJSONLD = generateArticleJSONLD({
    title: t.title || `${country.toUpperCase()} News`,
    description: t.summary || undefined,
    url: `${base}${canonicalPath}`,
    publishedTime: t.last_source_published_at || undefined,
  })

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
        <div className="tglMuted" style={{ marginBottom: 10 }}>
          <Link href={`/${country}/news`}>← ニュース</Link>
        </div>

        <h1 style={{ fontSize: '1.45rem', lineHeight: 1.25 }}>{t.title}</h1>
        <div style={{ height: 10 }} />

        <div className="tglRowMeta">
          <span className="tglPill">{t.category}</span>
          <span>{t.source_count} sources</span>
          {t.high_arousal ? <span className="tglPill">high arousal</span> : null}
        </div>

        <div style={{ height: 16 }} />

        <section className="tglRow">
          <div className="tglRowTitle">要点</div>
          <div className="tglRowMeta" style={{ display: 'block' }}>
            {t.summary ? <p style={{ marginTop: 8, lineHeight: 1.7 }}>{t.summary}</p> : <span className="tglMuted">（要約はまだありません）</span>}
          </div>
        </section>

        <div style={{ height: 12 }} />

        <section className="tglRow">
          <div className="tglRowTitle">参照元</div>
          <div className="tglRowMeta">
            <Link href={`/${country}/news/n/${topicId}/source`}>参照元一覧へ →</Link>
          </div>
        </section>
      </main>
    </>
  )
}


