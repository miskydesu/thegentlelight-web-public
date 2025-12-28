import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, isCountry, type HomeResponse } from '../../lib/tglApi'
import { canonicalUrl } from '../../lib/seo'

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  return {
    alternates: {
      canonical: canonicalUrl(`/${country}`),
    },
  }
}

export default async function CountryHome({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const data = await fetchJson<HomeResponse>(`/v1/${country}/home`, { next: { revalidate: 30 } })
  const isPartial = Boolean(data.meta?.is_partial)

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.5rem' }}>{country.toUpperCase()} トップ</h1>
        {isPartial ? <span className="tglPill">部分取得（partial）</span> : <span className="tglMuted">updated: {new Date(data.updatedAt).toLocaleString()}</span>}
      </div>

      <div style={{ height: 12 }} />

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem' }}>重要トピック</h2>
          <Link className="tglMuted" href={`/${country}/news`}>
            もっと見る →
          </Link>
        </div>

        <div style={{ height: 8 }} />

        {data.hero_topics?.length ? (
          <div className="tglList">
            {data.hero_topics.map((t) => (
              <Link key={t.topic_id} href={`/${country}/news/n/${t.topic_id}`} className="tglRow">
                <div className="tglRowTitle">{t.title}</div>
                <div className="tglRowMeta">
                  <span className="tglPill">{t.category}</span>
                  <span>{t.source_count} sources</span>
                  {t.high_arousal ? <span className="tglPill">high arousal</span> : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="tglRow">
            <div className="tglRowTitle">まだトピックがありません</div>
            <div className="tglRowMeta">
              先にステージングのジョブ（NewsAPI）を実行して、topics を作成してください。
            </div>
          </div>
        )}
      </section>

      <div style={{ height: 20 }} />

      <section className="tglRow">
        <div className="tglRowTitle">日報</div>
        <div className="tglRowMeta">
          <Link href={`/${country}/daily`}>日報一覧へ →</Link>
        </div>
      </section>
    </main>
  )
}


