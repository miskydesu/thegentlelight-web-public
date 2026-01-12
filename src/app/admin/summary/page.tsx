'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetchJson, clearAdminToken } from '../../../lib/tglAdminApi'

export default function AdminSummaryPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any | null>(null)

  const NUMERIC_STYLE: React.CSSProperties = {
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum"',
    // 数値だけ “Pフォント（比例）” にならないように、数値部分だけ monospace を当てる
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  }

  // カテゴリは「データが0件で items が返ってこない」場合でも表示したいので固定順を持つ
  const SITE_CATEGORY_ORDER: string[] = [
    'science_earth',
    'politics',
    'health',
    'technology',
    'arts',
    'business',
    'sports',
    'heartwarming',
  ]

  const countryFlagEmoji = (country: string) => {
    const c = String(country ?? '').toLowerCase()
    switch (c) {
      case 'jp':
        return '🇯🇵'
      case 'us':
        return '🇺🇸'
      case 'uk':
        return '🇬🇧'
      case 'ca':
        return '🇨🇦'
      default:
        return ''
    }
  }

  const renderCountryHeader = (country: string) => {
    const code = String(country ?? '').toUpperCase()
    const flag = countryFlagEmoji(country)
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span>{code}</span>
        {flag ? <span aria-hidden="true">{flag}</span> : null}
      </span>
    )
  }

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const data = await adminFetchJson<any>('/admin/v1/dashboard/stats')
      setStats(data)
    } catch (err: any) {
      const msg = err?.message || '取得に失敗しました'
      if (String(msg).includes(' 401 ') || String(msg).includes(' 403 ')) {
        clearAdminToken()
        router.push('/admin/login')
        return
      }
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>サマリー</h1>
        <button
          onClick={() => void load()}
          disabled={busy}
          style={{
            padding: '8px 16px',
            fontSize: '0.9rem',
            backgroundColor: busy ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            transition: 'background-color 0.2s',
            boxShadow: busy ? 'none' : '0 2px 4px rgba(0,123,255,0.2)',
          }}
          onMouseEnter={(e) => {
            if (!busy) {
              e.currentTarget.style.backgroundColor = '#0056b3'
            }
          }}
          onMouseLeave={(e) => {
            if (!busy) {
              e.currentTarget.style.backgroundColor = '#007bff'
            }
          }}
        >
          {busy ? '更新中...' : '更新'}
        </button>
      </div>

      {error ? (
        <div
          style={{
            color: '#b00020',
            whiteSpace: 'pre-wrap',
            marginBottom: 20,
            padding: '12px 16px',
            backgroundColor: '#ffebee',
            borderRadius: '6px',
            border: '1px solid #ffcdd2',
          }}
        >
          {error}
        </div>
      ) : null}

      {busy ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>読み込み中...</div>
      ) : stats ? (
        <>
          {/* News Fetch（直近N時間）: top_pool / shelf_all の“有用度” */}
          <section
            style={{
              marginBottom: 20,
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>
                記事取得（直近<span style={NUMERIC_STYLE}>{Number(stats?.news_fetch_runs_last_hours?.since_hours ?? 36)}</span>時間）
              </h2>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.85rem' }}>
                表記:{' '}
                <span style={{ fontWeight: 800, color: '#495057' }}>runs</span> / <span style={{ fontWeight: 800, color: '#0b5394' }}>ins</span> /{' '}
                <span style={{ fontWeight: 800, color: '#212529' }}>createdTopics</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {(() => {
                const data = stats?.news_fetch_runs_last_hours
                const byKindCountry = (data?.by_kind_country ?? {}) as Record<
                  string,
                  {
                    runs: number
                    inserted: number
                    topicize_createdTopics: number
                    error: number
                  }
                >

                const kinds: Array<{ kind: string; label: string }> = [
                  { kind: 'top_pool', label: 'top_pool' },
                  { kind: 'shelf_all', label: 'shelf_all' },
                ]

                const cell = (v?: { runs: number; inserted: number; topicize_createdTopics: number; error: number }) => {
                  const runs = Number(v?.runs ?? 0)
                  const ins = Number(v?.inserted ?? 0)
                  const createdTopics = Number(v?.topicize_createdTopics ?? 0)
                  const err = Number(v?.error ?? 0)
                  return (
                    <span
                      style={{
                        display: 'inline-flex',
                        justifyContent: 'flex-end',
                        gap: 6,
                        width: '100%',
                        whiteSpace: 'nowrap',
                        ...NUMERIC_STYLE,
                      }}
                      title={err > 0 ? `errors=${err}` : undefined}
                    >
                      <span style={{ minWidth: 24, textAlign: 'right', color: '#495057' }}>{runs}</span>
                      <span style={{ color: '#adb5bd' }}>/</span>
                      <span style={{ minWidth: 24, textAlign: 'right', color: '#0b5394', fontWeight: 800 }}>{ins}</span>
                      <span style={{ color: '#adb5bd' }}>/</span>
                      <span style={{ minWidth: 24, textAlign: 'right', color: '#212529', fontWeight: 800 }}>{createdTopics}</span>
                    </span>
                  )
                }

                const countries: string[] = (stats.countries ?? []).map((c: any) => String(c.country))

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 220 }} />
                      {countries.map((c: string) => (
                        <col key={c} style={{ width: 170 }} />
                      ))}
                      <col style={{ width: 170 }} />
                    </colgroup>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#495057', backgroundColor: '#e9ecef' }}>queue</th>
                        {countries.map((c: string) => (
                          <th
                            key={c}
                            style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontWeight: 700,
                              color: '#495057',
                              borderLeft: '1px solid #e9ecef',
                            }}
                          >
                            {renderCountryHeader(c)}
                          </th>
                        ))}
                        <th
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: '#495057',
                            borderLeft: '1px solid #e9ecef',
                            backgroundColor: '#f1f3f5',
                          }}
                        >
                          TOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {kinds.map((k, idx) => {
                        const rowTotal = { runs: 0, inserted: 0, topicize_createdTopics: 0, error: 0 }
                        for (const c of countries) {
                          const v = byKindCountry[`${k.kind}:${c}`]
                          rowTotal.runs += Number(v?.runs ?? 0)
                          rowTotal.inserted += Number(v?.inserted ?? 0)
                          rowTotal.topicize_createdTopics += Number(v?.topicize_createdTopics ?? 0)
                          rowTotal.error += Number(v?.error ?? 0)
                        }

                        return (
                          <tr key={k.kind} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 800, color: '#212529' }}>{k.label}</td>
                            {countries.map((c: string) => (
                              <td key={c} style={{ padding: '12px 16px', borderLeft: '1px solid #e9ecef', textAlign: 'right' }}>
                                {cell(byKindCountry[`${k.kind}:${c}`])}
                              </td>
                            ))}
                            <td style={{ padding: '12px 16px', borderLeft: '1px solid #e9ecef', backgroundColor: '#f1f3f5', textAlign: 'right' }}>
                              {cell(rowTotal)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </section>

          {/* News Fetch（取得設定変更後）: 起点以後の fetched/inserted/updated/topics を並べて見る */}
          <section
            style={{
              marginBottom: 20,
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>
                記事取得（取得設定変更後）
              </h2>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.85rem' }}>
                集計範囲: 日本時間（JST）{String(stats?.news_fetch_runs_since_acq_change?.since_jst ?? '2026-01-12 19:20')} 〜 現在
              </div>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.85rem' }}>
                表記:{' '}
                <span style={{ fontWeight: 800, color: '#495057' }}>fetched</span> / <span style={{ fontWeight: 800, color: '#0b5394' }}>ins</span> /{' '}
                <span style={{ fontWeight: 800, color: '#6c757d' }}>upd</span> / <span style={{ fontWeight: 800, color: '#212529' }}>topics</span>{' '}
                <span style={{ color: '#adb5bd' }}>(runs)</span>
              </div>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.8rem' }}>
                ※ <span style={{ fontWeight: 800, color: '#212529' }}>topics</span> は「記事数」ではなく topicize の <span style={{ fontWeight: 800, color: '#212529' }}>createdTopics</span>（新規トピック作成数）です
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {(() => {
                const data = stats?.news_fetch_runs_since_acq_change
                const byKindCountry = (data?.by_kind_country ?? {}) as Record<
                  string,
                  {
                    runs: number
                    fetched: number
                    inserted: number
                    updated: number
                    topicize_createdTopics: number
                    error: number
                  }
                >

                const kinds: Array<{ kind: string; label: string }> = [
                  { kind: 'top_pool', label: 'top_pool' },
                  { kind: 'shelf_all', label: 'shelf_all' },
                  { kind: 'shelf_fastlane', label: 'shelf_fastlane' },
                  { kind: 'heartwarming', label: 'heartwarming' },
                  { kind: 'sports_small', label: 'sports_small' },
                ]

                const cell = (v?: {
                  runs: number
                  fetched: number
                  inserted: number
                  updated: number
                  topicize_createdTopics: number
                  error: number
                }) => {
                  const runs = Number(v?.runs ?? 0)
                  const fetched = Number((v as any)?.fetched ?? 0)
                  const ins = Number(v?.inserted ?? 0)
                  const upd = Number((v as any)?.updated ?? 0)
                  const createdTopics = Number(v?.topicize_createdTopics ?? 0)
                  const err = Number(v?.error ?? 0)
                  return (
                    <span
                      style={{
                        display: 'inline-flex',
                        justifyContent: 'flex-end',
                        gap: 6,
                        width: '100%',
                        whiteSpace: 'nowrap',
                        ...NUMERIC_STYLE,
                      }}
                      title={err > 0 ? `errors=${err}` : undefined}
                    >
                      <span style={{ minWidth: 26, textAlign: 'right', color: '#495057' }}>{fetched}</span>
                      <span style={{ color: '#adb5bd' }}>/</span>
                      <span style={{ minWidth: 26, textAlign: 'right', color: '#0b5394', fontWeight: 800 }}>{ins}</span>
                      <span style={{ color: '#adb5bd' }}>/</span>
                      <span style={{ minWidth: 26, textAlign: 'right', color: '#6c757d', fontWeight: 700 }}>{upd}</span>
                      <span style={{ color: '#adb5bd' }}>/</span>
                      <span style={{ minWidth: 26, textAlign: 'right', color: '#212529', fontWeight: 800 }}>{createdTopics}</span>
                      <span style={{ color: '#adb5bd' }}>(</span>
                      <span style={{ minWidth: 18, textAlign: 'right', color: '#adb5bd' }}>{runs}</span>
                      <span style={{ color: '#adb5bd' }}>)</span>
                    </span>
                  )
                }

                const countries: string[] = (stats.countries ?? []).map((c: any) => String(c.country))

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 220 }} />
                      {countries.map((c: string) => (
                        <col key={c} style={{ width: 220 }} />
                      ))}
                      <col style={{ width: 220 }} />
                    </colgroup>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#495057', backgroundColor: '#e9ecef' }}>queue</th>
                        {countries.map((c: string) => (
                          <th
                            key={c}
                            style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontWeight: 700,
                              color: '#495057',
                              borderLeft: '1px solid #e9ecef',
                            }}
                          >
                            {renderCountryHeader(c)}
                          </th>
                        ))}
                        <th
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: '#495057',
                            borderLeft: '1px solid #e9ecef',
                            backgroundColor: '#f1f3f5',
                          }}
                        >
                          TOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {kinds.map((k, idx) => {
                        const rowTotal = { runs: 0, fetched: 0, inserted: 0, updated: 0, topicize_createdTopics: 0, error: 0 }
                        for (const c of countries) {
                          const v = byKindCountry[`${k.kind}:${c}`] as any
                          rowTotal.runs += Number(v?.runs ?? 0)
                          rowTotal.fetched += Number(v?.fetched ?? 0)
                          rowTotal.inserted += Number(v?.inserted ?? 0)
                          rowTotal.updated += Number(v?.updated ?? 0)
                          rowTotal.topicize_createdTopics += Number(v?.topicize_createdTopics ?? 0)
                          rowTotal.error += Number(v?.error ?? 0)
                        }

                        return (
                          <tr key={k.kind} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 800, color: '#212529' }}>{k.label}</td>
                            {countries.map((c: string) => (
                              <td key={c} style={{ padding: '12px 16px', borderLeft: '1px solid #e9ecef', textAlign: 'right' }}>
                                {cell(byKindCountry[`${k.kind}:${c}`])}
                              </td>
                            ))}
                            <td style={{ padding: '12px 16px', borderLeft: '1px solid #e9ecef', backgroundColor: '#f1f3f5', textAlign: 'right' }}>
                              {cell(rowTotal as any)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </section>

          {/* 日別（直近5日）：要約生成済み / 未評価 / 要約待ち（未評価・要約待ちは1以上のみ表示） */}
          <section
            style={{
              marginBottom: 32,
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>
                日別（直近5日）：要約生成済み / 未評価 / 要約待ち
              </h2>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.9rem' }}>日付区切り: 日本時間（JST）0:00</div>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.85rem' }}>
                表記: <span style={{ fontWeight: 700, color: '#0b5394' }}>要約</span> / <span style={{ fontWeight: 700, color: '#b00020' }}>未評価</span> /{' '}
                <span style={{ fontWeight: 700, color: '#856404' }}>要約待ち</span>（未評価・要約待ちは1以上のみ表示）
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 700,
                        color: '#495057',
                        fontSize: '0.9rem',
                        backgroundColor: '#e9ecef',
                        width: 220,
                      }}
                    >
                      日付
                    </th>
                    {stats.countries?.map((c: any) => (
                      <th
                        key={c.country}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#495057',
                          fontSize: '0.9rem',
                          borderLeft: '1px solid #e9ecef',
                        }}
                      >
                        {renderCountryHeader(String(c.country))}
                      </th>
                    ))}
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#495057',
                        fontSize: '0.9rem',
                        borderLeft: '1px solid #e9ecef',
                        backgroundColor: '#f1f3f5',
                      }}
                    >
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Prefer pipeline (it includes summarized), but we only render the summarized count.
                    const pipelineDays = stats.topic_pipeline_by_day_last_5_days?.days
                    const summaryDays = stats.topic_summaries_by_day_last_5_days?.days ?? []
                    const days =
                      Array.isArray(pipelineDays) && pipelineDays.length > 0
                        ? pipelineDays
                        : (summaryDays as any[]).map((d: any) => ({
                            date_local: d?.date_local,
                            total: { summarized: Number(d?.total ?? 0), unevaluated: 0, pending: 0 },
                            countries: (d?.countries ?? []).map((c: any) => ({
                              country: c?.country,
                              summarized: Number(c?.count ?? 0),
                              unevaluated: 0,
                              pending: 0,
                            })),
                          }))

                    const rows = (days as any[]).map((d: any, idx: number) => {
                      const cell = (v: any) => {
                        const s = Number(v?.summarized ?? v?.total ?? v?.count ?? 0)
                        const u = Number(v?.unevaluated ?? 0)
                        const p = Number(v?.pending ?? 0)
                        return (
                          <span style={{ whiteSpace: 'nowrap', ...NUMERIC_STYLE }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b5394' }}>{s}</span>
                            {u > 0 ? (
                              <>
                                <span style={{ color: '#adb5bd', margin: '0 6px' }}>/</span>
                                <span style={{ fontWeight: 800, color: '#b00020' }}>{u}</span>
                              </>
                            ) : null}
                            {p > 0 ? (
                              <>
                                <span style={{ color: '#adb5bd', margin: '0 6px' }}>/</span>
                                <span style={{ fontWeight: 800, color: '#856404' }}>{p}</span>
                              </>
                            ) : null}
                          </span>
                        )
                      }

                      return (
                        <tr key={d.date_local} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#212529', backgroundColor: '#f8f9fa' }}>{d.date_local}</td>
                          {stats.countries?.map((c: any) => {
                            const found = (d.countries ?? []).find((x: any) => x.country === c.country) ?? null
                            return (
                              <td key={c.country} style={{ padding: '12px 16px', color: '#212529', borderLeft: '1px solid #e9ecef', textAlign: 'right' }}>
                                {cell(found)}
                              </td>
                            )
                          })}
                          <td
                            style={{
                              padding: '12px 16px',
                              color: '#212529',
                              borderLeft: '1px solid #e9ecef',
                              backgroundColor: '#f1f3f5',
                              textAlign: 'right',
                            }}
                          >
                            {cell(d.total)}
                          </td>
                        </tr>
                      )
                    })

                    // 合計（直近5日）
                    const sumTotal = (days as any[]).reduce(
                      (acc, d) => {
                        acc.s += Number(d?.total?.summarized ?? d?.total ?? 0)
                        acc.u += Number(d?.total?.unevaluated ?? 0)
                        acc.p += Number(d?.total?.pending ?? 0)
                        return acc
                      },
                      { s: 0, u: 0, p: 0 }
                    )
                    const sumByCountry: Record<string, { s: number; u: number; p: number }> = {}
                    for (const d of days as any[]) {
                      for (const c of d?.countries ?? []) {
                        const k = String(c?.country ?? '')
                        if (!k) continue
                        if (!sumByCountry[k]) sumByCountry[k] = { s: 0, u: 0, p: 0 }
                        sumByCountry[k].s += Number(c?.summarized ?? c?.count ?? 0)
                        sumByCountry[k].u += Number(c?.unevaluated ?? 0)
                        sumByCountry[k].p += Number(c?.pending ?? 0)
                      }
                    }

                    const totalRowCell = (s: number, u: number, p: number) => (
                      <span style={{ whiteSpace: 'nowrap', ...NUMERIC_STYLE }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b5394' }}>{s}</span>
                        {u > 0 ? (
                          <>
                            <span style={{ color: '#adb5bd', margin: '0 6px' }}>/</span>
                            <span style={{ fontWeight: 800, color: '#b00020' }}>{u}</span>
                          </>
                        ) : null}
                        {p > 0 ? (
                          <>
                            <span style={{ color: '#adb5bd', margin: '0 6px' }}>/</span>
                            <span style={{ fontWeight: 800, color: '#856404' }}>{p}</span>
                          </>
                        ) : null}
                      </span>
                    )

                    const totalRow = (
                      <tr key="__sum__" style={{ backgroundColor: '#eef6ff', borderTop: '2px solid #b6d8ff' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0b5394', backgroundColor: '#e7f3ff' }}>合計（直近5日）</td>
                        {stats.countries?.map((c: any) => {
                          const k = String(c.country)
                          const v = sumByCountry[k] ?? { s: 0, u: 0, p: 0 }
                          return (
                            <td key={k} style={{ padding: '12px 16px', borderLeft: '1px solid #e9ecef', textAlign: 'right' }}>
                              {totalRowCell(v.s, v.u, v.p)}
                            </td>
                          )
                        })}
                        <td style={{ padding: '12px 16px', borderLeft: '1px solid #e9ecef', backgroundColor: '#f1f3f5', textAlign: 'right' }}>
                          {totalRowCell(sumTotal.s, sumTotal.u, sumTotal.p)}
                        </td>
                      </tr>
                    )

                    return [...rows, totalRow]
                  })()}
                </tbody>
              </table>
            </div>
          </section>

          {/* 要約待ちまとめ（直近5日 + 期間外） */}
          <section
            style={{
              marginBottom: 32,
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>
                要約待ちまとめ
              </h2>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.9rem' }}>日付区切り: 日本時間（JST）0:00</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#495057',
                        fontSize: '0.9rem',
                        backgroundColor: '#e9ecef',
                        width: 220,
                      }}
                    >
                      項目
                    </th>
                    {stats.countries?.map((c: any) => (
                      <th
                        key={c.country}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          fontWeight: 600,
                          color: '#495057',
                          fontSize: '0.9rem',
                          borderLeft: '1px solid #e9ecef',
                        }}
                      >
                        {renderCountryHeader(String(c.country))}
                      </th>
                    ))}
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#495057',
                        fontSize: '0.9rem',
                        backgroundColor: '#f1f3f5',
                        borderLeft: '1px solid #e9ecef',
                      }}
                    >
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const row = (
                      label: string,
                      total: number,
                      perCountry: (country: string) => number,
                      tone?: { totalBg?: string; totalColor?: string }
                    ) => (
                      <tr key={label} style={{ backgroundColor: '#fff', borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#212529', backgroundColor: '#f8f9fa' }}>{label}</td>
                        {stats.countries?.map((c: any) => (
                          <td key={c.country} style={{ padding: '12px 16px', textAlign: 'right', color: '#495057', borderLeft: '1px solid #e9ecef' }}>
                            <span style={NUMERIC_STYLE}>{perCountry(String(c.country))}</span>
                          </td>
                        ))}
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            color: tone?.totalColor ?? '#495057',
                            fontSize: '1rem',
                            fontWeight: 700,
                            backgroundColor: tone?.totalBg ?? '#f1f3f5',
                            borderLeft: '1px solid #e9ecef',
                          }}
                        >
                          <span style={NUMERIC_STYLE}>{total}</span>
                        </td>
                      </tr>
                    )

                    const total = stats.total ?? {}
                    const countries = stats.countries ?? []
                    const findCountry = (country: string) => (countries as any[]).find((x) => x.country === country) ?? {}

                    return [
                      row(
                        '未評価（直近5日）',
                        Number(total.unevaluated_last_5_days ?? 0),
                        (c) => Number(findCountry(c).unevaluated_last_5_days ?? 0)
                      ),
                      row(
                        '要約待ち（直近5日）',
                        Number(total.pendingSummary_last_5_days ?? 0),
                        (c) => Number(findCountry(c).pendingSummary_last_5_days ?? 0)
                      ),
                    ]
                  })()}
                </tbody>
              </table>
            </div>

            {/* 期間外（直近5日より前） */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #e9ecef', backgroundColor: '#fff' }}>
              <div style={{ fontWeight: 700, color: '#495057', marginBottom: 10 }}>期間外（直近5日より前）</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.9rem', width: 220 }}>項目</th>
                      {stats.countries?.map((c: any) => (
                        <th
                          key={c.country}
                          style={{
                            padding: '10px 12px',
                            textAlign: 'center',
                            fontWeight: 600,
                            color: '#495057',
                            fontSize: '0.9rem',
                            borderLeft: '1px solid #e9ecef',
                          }}
                        >
                          {renderCountryHeader(String(c.country))}
                        </th>
                      ))}
                      <th
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#495057',
                          fontSize: '0.9rem',
                          borderLeft: '1px solid #e9ecef',
                          backgroundColor: '#f1f3f5',
                        }}
                      >
                        TOTAL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const total = stats.total ?? {}
                      const countries = stats.countries ?? []
                      const findCountry = (country: string) => (countries as any[]).find((x) => x.country === country) ?? {}
                      const row = (label: string, totalVal: number, perCountry: (country: string) => number) => (
                        <tr key={label} style={{ backgroundColor: '#fff', borderBottom: '1px solid #e9ecef' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#212529' }}>{label}</td>
                          {stats.countries?.map((c: any) => (
                            <td key={c.country} style={{ padding: '10px 12px', textAlign: 'right', color: '#6c757d', borderLeft: '1px solid #e9ecef' }}>
                              <span style={NUMERIC_STYLE}>{perCountry(String(c.country))}</span>
                            </td>
                          ))}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              color: '#6c757d',
                              fontWeight: 700,
                              borderLeft: '1px solid #e9ecef',
                              backgroundColor: '#f1f3f5',
                            }}
                          >
                            <span style={NUMERIC_STYLE}>{totalVal}</span>
                          </td>
                        </tr>
                      )
                      return [
                        row('未評価（期間外）', Number(total.unevaluated_outside_5_days ?? 0), (c) => Number(findCountry(c).unevaluated_outside_5_days ?? 0)),
                        row(
                          '要約待ち（期間外）',
                          Number(total.pendingSummary_outside_5_days ?? 0),
                          (c) => Number(findCountry(c).pendingSummary_outside_5_days ?? 0)
                        ),
                      ]
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 直近5日（JST 0:00区切り）の country×category（new_topics / summarized_ready_topics） */}
          <section
            style={{
              marginBottom: 32,
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>
                トピック集計（直近5日・country×category）
              </h2>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.9rem' }}>日付区切り: 日本時間（JST）0:00</div>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.85rem' }}>
                表記: <span style={{ fontWeight: 800, color: '#212529' }}>new</span> / <span style={{ fontWeight: 700, color: '#0b5394' }}>ready</span> /{' '}
                <span style={{ fontWeight: 500, color: '#8a6d3b' }}>%</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {(() => {
                const items = stats.topic_metrics_by_country_category_last_5_days?.items ?? []
                const countries = (stats.countries ?? []).map((c: any) => String(c.country))
                // Keep display order: JP → CA → US → UK (stats.countries already in that order)
                const countryCols: string[] = (countries.length ? countries : ['jp', 'ca', 'us', 'uk']) as string[]

                const categoriesFromData: string[] = Array.from(new Set<string>(items.map((x: any) => String(x.category))))
                const extraCategories = categoriesFromData.filter((c: string) => !SITE_CATEGORY_ORDER.includes(c)).sort()
                const categories: string[] = [...SITE_CATEGORY_ORDER, ...extraCategories]
                const byCatCountry = new Map<string, Map<string, { new_topics: number; ready: number }>>()
                for (const it of items as any[]) {
                  const cat = String(it.category)
                  const c = String(it.country)
                  const new_topics = Number(it.new_topics ?? 0)
                  const ready = Number(it.summarized_ready_topics ?? 0)
                  if (!byCatCountry.has(cat)) byCatCountry.set(cat, new Map())
                  byCatCountry.get(cat)!.set(c, { new_topics, ready })
                }

                const cell = (v: { new_topics: number; ready: number } | null | undefined) => {
                  const n = Number(v?.new_topics ?? 0)
                  const r = Number(v?.ready ?? 0)
                  const pct = n > 0 ? Math.round((r / n) * 100) : 0
                  return (
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        justifyContent: 'flex-end',
                        gap: 6,
                        width: '100%',
                          ...NUMERIC_STYLE,
                      }}
                    >
                      <span style={{ fontWeight: 800, color: '#212529', minWidth: 28, textAlign: 'right' }}>{n}</span>
                      <span style={{ color: '#adb5bd' }}>/</span>
                      <span style={{ fontWeight: 800, color: '#0b5394', minWidth: 28, textAlign: 'right' }}>{r}</span>
                      <span style={{ color: '#adb5bd' }}>/</span>
                      <span style={{ fontWeight: 500, color: '#8a6d3b', minWidth: 40, textAlign: 'right' }}>{pct}%</span>
                    </span>
                  )
                }

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 220 }} />
                      {countryCols.map((c: string) => (
                        <col key={c} style={{ width: 160 }} />
                      ))}
                      <col style={{ width: 160 }} />
                    </colgroup>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                        <th
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontWeight: 700,
                            color: '#495057',
                            fontSize: '0.9rem',
                            backgroundColor: '#e9ecef',
                          }}
                        >
                          category
                        </th>
                        {countryCols.map((c: string) => (
                          <th
                            key={c}
                            style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontWeight: 700,
                              color: '#495057',
                              fontSize: '0.9rem',
                              borderLeft: '1px solid #e9ecef',
                            }}
                          >
                            {renderCountryHeader(c)}
                          </th>
                        ))}
                        <th
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: '#495057',
                            fontSize: '0.9rem',
                            borderLeft: '1px solid #e9ecef',
                            backgroundColor: '#f1f3f5',
                          }}
                        >
                          TOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat: string, idx: number) => {
                        const m = byCatCountry.get(cat) ?? new Map()
                        const total = countryCols.reduce(
                          (acc: { new_topics: number; ready: number }, c: string) => {
                            const v = m.get(c)
                            acc.new_topics += Number(v?.new_topics ?? 0)
                            acc.ready += Number(v?.ready ?? 0)
                            return acc
                          },
                          { new_topics: 0, ready: 0 }
                        )
                        return (
                          <tr key={cat} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 800, color: '#212529' }}>{cat}</td>
                            {countryCols.map((c: string) => (
                              <td key={c} style={{ padding: '12px 16px', color: '#212529', textAlign: 'right', borderLeft: '1px solid #e9ecef' }}>
                                {cell(m.get(c))}
                              </td>
                            ))}
                            <td
                              style={{
                                padding: '12px 16px',
                                color: '#212529',
                                textAlign: 'right',
                                borderLeft: '1px solid #e9ecef',
                                backgroundColor: '#f1f3f5',
                              }}
                            >
                              {cell(total)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </section>

          {/* 取得設定変更後（2026-01-12 19:20 JST以降）の country×category（sources / new_topics / summarized_ready_topics） */}
          <section
            style={{
              marginBottom: 32,
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>
                トピック集計（取得設定変更後）
              </h2>
              {!stats?.topic_metrics_by_country_category_since_acq_change ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffe69c',
                    color: '#664d03',
                    fontSize: '0.9rem',
                  }}
                >
                  この集計キー（<span style={{ ...NUMERIC_STYLE, fontWeight: 700 }}>topic_metrics_by_country_category_since_acq_change</span>）がAPIレスポンスにありません。
                  APIが未更新（デプロイ未反映）か、別環境を見ている可能性があります。
                </div>
              ) : null}
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.9rem' }}>
                集計範囲: 日本時間（JST）{String(stats?.topic_metrics_by_country_category_since_acq_change?.since_jst ?? '2026-01-12 19:20')} 〜 現在
              </div>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.85rem' }}>
                debug: first_seen_since_total=
                <span style={{ ...NUMERIC_STYLE, marginLeft: 6 }}>
                  {Number(stats?.topic_metrics_by_country_category_since_acq_change?.debug?.topics_first_seen_since_total ?? 0)}
                </span>
                , ready_since_total=
                <span style={{ ...NUMERIC_STYLE, marginLeft: 6 }}>
                  {Number(stats?.topic_metrics_by_country_category_since_acq_change?.debug?.topics_ready_since_total ?? 0)}
                </span>
              </div>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.85rem' }}>
                表記: <span style={{ fontWeight: 700, color: '#495057' }}>source</span> / <span style={{ fontWeight: 800, color: '#212529' }}>new</span> /{' '}
                <span style={{ fontWeight: 700, color: '#0b5394' }}>ready</span> / <span style={{ fontWeight: 500, color: '#8a6d3b' }}>%</span>
              </div>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.8rem' }}>
                ※ <span style={{ fontWeight: 700, color: '#495057' }}>source</span> は保存された記事数（<span style={{ ...NUMERIC_STYLE, fontWeight: 700 }}>source_articles.fetched_at</span> 基準）です
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {(() => {
                const items = stats.topic_metrics_by_country_category_since_acq_change?.items ?? []
                const countries = (stats.countries ?? []).map((c: any) => String(c.country))
                // Keep display order: JP → CA → US → UK (stats.countries already in that order)
                const countryCols: string[] = (countries.length ? countries : ['jp', 'ca', 'us', 'uk']) as string[]

                const categoriesFromData: string[] = Array.from(new Set<string>(items.map((x: any) => String(x.category))))
                const extraCategories = categoriesFromData.filter((c: string) => !SITE_CATEGORY_ORDER.includes(c)).sort()
                const categories: string[] = [...SITE_CATEGORY_ORDER, ...extraCategories]
                const byCatCountry = new Map<string, Map<string, { sources: number; new_topics: number; ready: number }>>()
                const totalByCountry = new Map<string, { sources: number; new_topics: number; ready: number }>()
                for (const it of items as any[]) {
                  const cat = String(it.category)
                  const c = String(it.country)
                  const sources = Number((it as any).sources ?? 0)
                  const new_topics = Number(it.new_topics ?? 0)
                  const ready = Number(it.summarized_ready_topics ?? 0)
                  if (!byCatCountry.has(cat)) byCatCountry.set(cat, new Map())
                  byCatCountry.get(cat)!.set(c, { sources, new_topics, ready })

                  const cur = totalByCountry.get(c) ?? { sources: 0, new_topics: 0, ready: 0 }
                  totalByCountry.set(c, {
                    sources: cur.sources + sources,
                    new_topics: cur.new_topics + new_topics,
                    ready: cur.ready + ready,
                  })
                }

                const cell = (v: { sources: number; new_topics: number; ready: number } | null | undefined) => {
                  const s = Number(v?.sources ?? 0)
                  const n = Number(v?.new_topics ?? 0)
                  const r = Number(v?.ready ?? 0)
                  const pct = n > 0 ? Math.round((r / n) * 100) : 0
                  return (
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        justifyContent: 'flex-end',
                        gap: 6,
                        width: '100%',
                        ...NUMERIC_STYLE,
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#495057', minWidth: 30, textAlign: 'right' }}>{s}</span>
                      <span style={{ color: '#adb5bd' }}>/</span>
                      <span style={{ fontWeight: 800, color: '#212529', minWidth: 28, textAlign: 'right' }}>{n}</span>
                      <span style={{ color: '#adb5bd' }}>/</span>
                      <span style={{ fontWeight: 800, color: '#0b5394', minWidth: 28, textAlign: 'right' }}>{r}</span>
                      <span style={{ color: '#adb5bd' }}>/</span>
                      <span style={{ fontWeight: 500, color: '#8a6d3b', minWidth: 40, textAlign: 'right' }}>{pct}%</span>
                    </span>
                  )
                }

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 220 }} />
                      {countryCols.map((c: string) => (
                        <col key={c} style={{ width: 210 }} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                        <th
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontWeight: 700,
                            color: '#495057',
                            fontSize: '0.9rem',
                            backgroundColor: '#e9ecef',
                          }}
                        >
                          category
                        </th>
                        {countryCols.map((c: string) => (
                          <th
                            key={c}
                            style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontWeight: 700,
                              color: '#495057',
                              fontSize: '0.9rem',
                              borderLeft: '1px solid #e9ecef',
                            }}
                          >
                            {renderCountryHeader(c)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat: string, idx: number) => {
                        const m = byCatCountry.get(cat) ?? new Map()
                        return (
                          <tr key={cat} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 800, color: '#212529' }}>{cat}</td>
                            {countryCols.map((c: string) => (
                              <td key={c} style={{ padding: '12px 16px', color: '#212529', textAlign: 'right', borderLeft: '1px solid #e9ecef' }}>
                                {cell(m.get(c))}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                      <tr style={{ backgroundColor: '#f1f3f5', borderTop: '2px solid #dee2e6' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 900, color: '#212529' }}>TOTAL</td>
                        {countryCols.map((c: string) => (
                          <td
                            key={c}
                            style={{
                              padding: '12px 16px',
                              color: '#212529',
                              textAlign: 'right',
                              borderLeft: '1px solid #e9ecef',
                              fontWeight: 800,
                            }}
                          >
                            {cell(totalByCountry.get(c))}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </section>

          {/* failed日報 */}
          {/* NOTE: 既存の /admin の表示と同じ並び（下は必要最低限だけ残す） */}
          <div style={{ height: 10 }} />
          <div className="tglRow">
            <div className="tglRowTitle">その他の操作</div>
            <div className="tglRowMeta">
              <Link href="/admin/topics">Topics 一覧</Link>
              <span className="tglMuted">|</span>
              <Link href="/admin/columns">Columns 一覧</Link>
              <span className="tglMuted">|</span>
              <Link href="/admin/quotes">Quotes 一覧</Link>
            </div>
          </div>
        </>
      ) : null}
    </main>
  )
}

