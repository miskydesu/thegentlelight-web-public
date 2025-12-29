import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type DailyDetailResponse } from '../../../../lib/tglApi'
import { canonicalUrl } from '../../../../lib/seo'
import { getLocaleForCountry, type Locale } from '../../../../lib/i18n'
import { getViewFromSearchParams, type View } from '../../../../lib/view-switch'

export function generateMetadata({ params, searchParams }: { params: { country: string; date: string }; searchParams: { lang?: string; view?: string } }) {
  const { country, date } = params
  return {
    alternates: {
      canonical: canonicalUrl(`/${country}/daily/${date}`),
    },
  }
}

export default async function DailyDetailPage({
  params,
  searchParams,
}: {
  params: { country: string; date: string }
  searchParams: { lang?: string; view?: string }
}) {
  const { country, date } = params
  if (!isCountry(country)) return notFound()

  const lang: Locale = searchParams.lang === 'en' || searchParams.lang === 'ja' ? searchParams.lang : getLocaleForCountry(country)
  const view: View = getViewFromSearchParams(searchParams)
  const data = await fetchJson<DailyDetailResponse>(`/v1/${country}/daily/${encodeURIComponent(date)}?lang=${lang}&view=${view}`, { next: { revalidate: 30 } })

  return (
    <main>
      <div className="tglMuted" style={{ marginBottom: 10 }}>
        <Link href={`/${country}/daily`}>← 日報一覧</Link>
      </div>

      <h1 style={{ fontSize: '1.45rem' }}>{date} の日報</h1>
      <div style={{ height: 10 }} />

      <div className="tglRowMeta">
        <span>{data.daily.topic_count} topics</span>
        {data.daily.generated_at ? <span className="tglMuted">generated {new Date(data.daily.generated_at).toLocaleString()}</span> : null}
      </div>

      <div style={{ height: 12 }} />

      {data.topics?.length ? (
        <div className="tglList">
          {data.topics.map((t) => (
            <Link key={t.topic_id} href={`/${country}/news/n/${t.topic_id}`} className="tglRow">
              <div className="tglRowTitle">
                <span className="tglPill" style={{ marginRight: 8 }}>
                  #{t.rank}
                </span>
                {t.title}
              </div>
              <div className="tglRowMeta">
                <span className="tglPill">{t.category}</span>
                <span>{t.source_count} sources</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="tglRow">
          <div className="tglRowTitle">topics がありません</div>
          <div className="tglRowMeta">日報生成はできているが、対象期間のtopicsが少ない可能性があります。</div>
        </div>
      )}
    </main>
  )
}


