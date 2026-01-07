import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type TopicSourcesResponse } from '../../../../../../lib/tglApi'
import { canonicalUrl } from '../../../../../../lib/seo'
import { getLocaleForCountry } from '../../../../../../lib/i18n'
import { getGentleFromSearchParams } from '../../../../../../lib/view-switch'
import { CACHE_POLICY } from '@/lib/cache-policy'

export function generateMetadata({ params }: { params: { country: string; topicId: string } }) {
  const { country, topicId } = params
  return {
    alternates: {
      canonical: canonicalUrl(`/${country}/news/n/${topicId}/source`),
    },
  }
}

export default async function TopicSourcesPage({
  params,
  searchParams,
}: {
  params: { country: string; topicId: string }
  searchParams: { gentle?: string }
}) {
  const { country, topicId } = params
  if (!isCountry(country)) return notFound()

  const gentle = getGentleFromSearchParams(searchParams)
  const isJa = getLocaleForCountry(country) === 'ja'
  const data = await fetchJson<TopicSourcesResponse>(
    `/v1/${country}/topics/${encodeURIComponent(topicId)}/sources${gentle ? '?gentle=1' : ''}`,
    { next: { revalidate: CACHE_POLICY.stable } }
  )

  const pickSourceBadgeLabel = (s: { source_name: string | null; source_domain: string | null }) => {
    const name = String(s.source_name || '').trim()
    if (name && !name.includes('\uFFFD')) return name
    const domain = String(s.source_domain || '').trim()
    return domain || ''
  }

  return (
    <main>
      <div className="tglMuted" style={{ marginBottom: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href={`/${country}/news/n/${topicId}${gentle ? '?gentle=1' : ''}`}>{isJa ? '← トピック' : '← Topic'}</Link>
        <Link href={`/${country}/news${gentle ? '?gentle=1' : ''}`}>{isJa ? 'ニュース' : 'News'}</Link>
      </div>

      <h1 style={{ fontSize: '1.35rem' }}>{isJa ? '参照元一覧' : 'Sources'}</h1>
      <div style={{ height: 12 }} />

      {data.sources?.length ? (
        <div className="tglList">
          {data.sources.map((s) => (
            <a key={s.source_id} className="tglRow" href={s.url} target="_blank" rel="noreferrer">
              <div className="tglRowTitle">{s.title}</div>
              <div className="tglRowMeta">
                {(() => {
                  const label = pickSourceBadgeLabel(s)
                  return label ? <span className="tglPill">{label}</span> : null
                })()}
                {s.published_at ? <span>{new Date(s.published_at).toLocaleString()}</span> : null}
                <span className="tglMuted">{isJa ? '外部サイトで開く →' : 'Open source →'}</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="tglRow">
          <div className="tglRowTitle">{isJa ? '参照元がありません' : 'No sources'}</div>
          <div className="tglRowMeta">
            {isJa ? 'topic_sources がまだ紐付いていない可能性があります。' : 'topic_sources may not be linked yet.'}
          </div>
        </div>
      )}
    </main>
  )
}


