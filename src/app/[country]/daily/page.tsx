import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type DailyListResponse } from '../../../lib/tglApi'
import { canonicalUrl } from '../../../lib/seo'

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  return {
    alternates: {
      canonical: canonicalUrl(`/${country}/daily`),
    },
  }
}

export default async function DailyIndex({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const data = await fetchJson<DailyListResponse>(`/v1/${country}/daily`, { next: { revalidate: 30 } })
  const isPartial = Boolean(data.meta?.is_partial)

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>日報</h1>
        {isPartial ? <span className="tglPill">部分取得（partial）</span> : null}
      </div>

      <div style={{ height: 12 }} />

      {data.days?.length ? (
        <div className="tglList">
          {data.days.map((d) => {
            // APIのdateLocalはISOっぽい文字列が来るので、YYYY-MM-DDに寄せる（表示/リンク用）
            const date = d.dateLocal.slice(0, 10)
            return (
              <Link key={d.dateLocal} href={`/${country}/daily/${date}`} className="tglRow">
                <div className="tglRowTitle">{date}</div>
                <div className="tglRowMeta">
                  <span>{d.topicCount} topics</span>
                  <span className="tglPill">{d.status}</span>
                  <span className="tglMuted">updated {new Date(d.updatedAt).toLocaleString()}</span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="tglRow">
          <div className="tglRowTitle">まだ日報がありません</div>
          <div className="tglRowMeta">先に daily generate を実行してください。</div>
        </div>
      )}
    </main>
  )
}


