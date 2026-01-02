import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type TodayResponse, type Country } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { useTranslations, getLocaleForCountry, type Locale } from '@/lib/i18n'
// 表示はsoft一本（UX方針）

export function generateMetadata({ params }: { params: { country: string } }) {
  return {
    title: `Today's Summary - ${params.country.toUpperCase()}`,
  }
}

export default async function TodayPage({
  params,
}: {
  params: { country: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const data = await fetchJson<TodayResponse>(`/v1/${country}/today`, { next: { revalidate: 30 } })
  const isPartial = Boolean(data.meta?.is_partial)
  const t = useTranslations(country, lang)

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>{t.pages.today.title}</h1>
        {data.daily?.generated_at && (
          <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            {new Date(data.daily.generated_at).toLocaleString()}
          </span>
        )}
      </div>

      <div style={{ height: 12 }} />

      {data.daily?.status === 'failed' ? (
        <EmptyState
          title={country === 'jp' ? '日報の生成に失敗しました' : 'Daily generation failed'}
          description={country === 'jp' ? 'しばらくしてからもう一度ご覧ください。' : 'Please try again later.'}
          action={{ label: country === 'jp' ? '日報一覧へ' : 'Daily List', href: `/${country}/daily` }}
        />
      ) : data.daily?.status === 'pending' ? (
        <EmptyState
          title={country === 'jp' ? '日報を生成中です' : 'Generating daily...'}
          description={country === 'jp' ? 'しばらくお待ちください。' : 'Please wait a moment.'}
          action={{ label: country === 'jp' ? '日報一覧へ' : 'Daily List', href: `/${country}/daily` }}
        />
      ) : data.daily && data.topics.length > 0 ? (
        <>
          {data.daily.summary && (
            <section style={{ marginBottom: '1.5rem' }}>
              <Card>
                <CardTitle>{t.pages.today.summary}</CardTitle>
                <CardContent>
                  <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.daily.summary}</p>
                </CardContent>
              </Card>
            </section>
          )}

          <section>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>{t.pages.today.topics}</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {data.topics.map((t) => (
                <Link key={t.topic_id} href={`/${country}/news/n/${t.topic_id}`}>
                  <Card clickable>
                    <CardTitle>
                      <span style={{ marginRight: '0.5rem', color: 'var(--muted)' }}>#{t.rank}</span>
                      {t.title}
                    </CardTitle>
                    {t.summary && (
                      <CardContent style={{ marginTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--muted)' }}>
                          {t.summary}
                        </p>
                      </CardContent>
                    )}
                    <CardMeta style={{ marginTop: '0.5rem' }}>
                      <span>{t.category}</span>
                      <span>{t.source_count} sources</span>
                    </CardMeta>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {isPartial && <PartialNotice country={country} />}
        </>
      ) : (
        <EmptyState
          title={country === 'jp' ? 'まだ今日のまとめがありません' : "Today's summary is not available yet"}
          description={country === 'jp' ? '日報が生成されるまでお待ちください。' : 'Please wait for the daily to be generated.'}
          action={{ label: country === 'jp' ? '日報一覧へ' : 'Daily List', href: `/${country}/daily` }}
        />
      )}
    </main>
  )
}

