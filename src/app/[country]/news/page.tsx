import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type TopicsResponse } from '../../../lib/tglApi'
import { canonicalUrl } from '../../../lib/seo'

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  return {
    alternates: {
      canonical: canonicalUrl(`/${country}/news`),
    },
  }
}

export default async function NewsPage({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const data = await fetchJson<TopicsResponse>(`/v1/${country}/topics`, { next: { revalidate: 30 } })
  const isPartial = Boolean(data.meta?.is_partial)

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>ニュース（棚）</h1>
        {isPartial ? <span className="tglPill">部分取得（partial）</span> : null}
      </div>

      <div style={{ height: 12 }} />

      {data.topics?.length ? (
        <div className="tglList">
          {data.topics.map((t) => (
            <Link key={t.topic_id} href={`/${country}/news/n/${t.topic_id}`} className="tglRow">
              <div className="tglRowTitle">{t.title}</div>
              <div className="tglRowMeta">
                <span className="tglPill">{t.category}</span>
                <span>{t.source_count} sources</span>
                {t.last_source_published_at ? <span>updated {new Date(t.last_source_published_at).toLocaleString()}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="tglRow">
          <div className="tglRowTitle">まだトピックがありません</div>
          <div className="tglRowMeta">先にジョブを実行して topics を作成してください。</div>
        </div>
      )}
    </main>
  )
}


