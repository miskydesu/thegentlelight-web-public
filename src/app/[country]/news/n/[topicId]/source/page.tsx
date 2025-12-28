import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type TopicSourcesResponse } from '../../../../../../lib/tglApi'
import { canonicalUrl } from '../../../../../../lib/seo'

export function generateMetadata({ params }: { params: { country: string; topicId: string } }) {
  const { country, topicId } = params
  return {
    alternates: {
      canonical: canonicalUrl(`/${country}/news/n/${topicId}/source`),
    },
  }
}

export default async function TopicSourcesPage({ params }: { params: { country: string; topicId: string } }) {
  const { country, topicId } = params
  if (!isCountry(country)) return notFound()

  const data = await fetchJson<TopicSourcesResponse>(`/v1/${country}/topics/${encodeURIComponent(topicId)}/sources`, { next: { revalidate: 30 } })

  return (
    <main>
      <div className="tglMuted" style={{ marginBottom: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href={`/${country}/news/n/${topicId}`}>← トピック</Link>
        <Link href={`/${country}/news`}>ニュース</Link>
      </div>

      <h1 style={{ fontSize: '1.35rem' }}>参照元一覧</h1>
      <div style={{ height: 12 }} />

      {data.sources?.length ? (
        <div className="tglList">
          {data.sources.map((s) => (
            <a key={s.source_id} className="tglRow" href={s.url} target="_blank" rel="noreferrer">
              <div className="tglRowTitle">{s.title}</div>
              <div className="tglRowMeta">
                {s.source_domain ? <span className="tglPill">{s.source_domain}</span> : null}
                {s.published_at ? <span>{new Date(s.published_at).toLocaleString()}</span> : null}
                <span className="tglMuted">外部サイトで開く →</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="tglRow">
          <div className="tglRowTitle">参照元がありません</div>
          <div className="tglRowMeta">topic_sources がまだ紐付いていない可能性があります。</div>
        </div>
      )}
    </main>
  )
}


