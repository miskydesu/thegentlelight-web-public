import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type TopicDetailResponse } from '../../../../../lib/tglApi'
import { canonicalUrl } from '../../../../../lib/seo'
import { getLocaleForCountry, type Locale } from '../../../../../lib/i18n'

export function generateMetadata({ params, searchParams }: { params: { country: string; topicId: string }; searchParams: { lang?: string } }) {
  const { country, topicId } = params
  return {
    alternates: {
      canonical: canonicalUrl(`/${country}/news/n/${topicId}`),
    },
  }
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: { country: string; topicId: string }
  searchParams: { lang?: string }
}) {
  const { country, topicId } = params
  if (!isCountry(country)) return notFound()

  const lang: Locale = searchParams.lang === 'en' || searchParams.lang === 'ja' ? searchParams.lang : getLocaleForCountry(country)
  const data = await fetchJson<TopicDetailResponse>(`/v1/${country}/topics/${encodeURIComponent(topicId)}?lang=${lang}`, { next: { revalidate: 30 } })
  const t = data.topic

  return (
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
  )
}


