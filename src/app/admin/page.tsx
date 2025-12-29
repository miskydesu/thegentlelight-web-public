'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetchJson, clearAdminToken } from '../../lib/tglAdminApi'
import { isCountry, type Country } from '../../lib/tglApi'

export default function AdminPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any | null>(null)
  const [country, setCountry] = useState<Country>('us')

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const sp = new URLSearchParams()
      if (country) sp.set('country', country)
      const data = await adminFetchJson<any>(`/admin/v1/dashboard/stats?${sp.toString()}`)
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
  }, [country])

  return (
    <main>
      <h1 style={{ fontSize: '1.4rem' }}>管理ホーム</h1>
      <div style={{ height: 12 }} />

      <div className="tglRow" style={{ marginBottom: 16 }}>
        <div className="tglRowTitle">国フィルタ</div>
        <div className="tglRowMeta">
          {(['us', 'uk', 'ca', 'jp'] as Country[]).map((c) => (
            <label key={c} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="radio"
                name="country"
                value={c}
                checked={country === c}
                onChange={() => setCountry(c)}
              />
              <span>{c.toUpperCase()}</span>
            </label>
          ))}
        </div>
      </div>

      {error ? <div style={{ color: '#b00020', whiteSpace: 'pre-wrap', marginBottom: 16 }}>{error}</div> : null}

      {busy ? (
        <div className="tglMuted">読み込み中...</div>
      ) : stats ? (
        <>
          {/* 要約未生成数 */}
          <section className="tglRow" style={{ marginBottom: 12 }}>
            <div className="tglRowTitle">要約未生成</div>
            <div className="tglRowMeta">
              <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{stats.summary_missing_count}</span>
              <span className="tglMuted">件</span>
            </div>
          </section>

          {/* failed日報 */}
          <section className="tglRow" style={{ marginBottom: 12 }}>
            <div className="tglRowTitle">失敗した日報</div>
            <div className="tglRowMeta">
              {stats.failed_daily_digests?.length > 0 ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {stats.failed_daily_digests.map((d: any) => (
                    <div key={d.daily_id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="tglPill">{d.country.toUpperCase()}</span>
                      <span>{d.date_local}</span>
                      {d.generated_at ? <span className="tglMuted">{new Date(d.generated_at).toLocaleString()}</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="tglMuted">なし</span>
              )}
            </div>
          </section>

          {/* 束ね不足検知（source_count=1） */}
          <section className="tglRow" style={{ marginBottom: 12 }}>
            <div className="tglRowTitle">束ね不足（source_count=1）</div>
            <div className="tglRowMeta">
              {stats.single_source_topics?.length > 0 ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {stats.single_source_topics.slice(0, 10).map((t: any) => (
                    <Link
                      key={t.topic_id}
                      href={`/admin/topics/${t.topic_id}?country=${t.country}`}
                      style={{ display: 'flex', gap: 8, alignItems: 'center', textDecoration: 'none' }}
                    >
                      <span className="tglPill">{t.country.toUpperCase()}</span>
                      <span>{t.title}</span>
                      <span className="tglMuted">({t.source_count}件)</span>
                    </Link>
                  ))}
                  {stats.single_source_topics.length > 10 && (
                    <span className="tglMuted">他 {stats.single_source_topics.length - 10} 件...</span>
                  )}
                </div>
              ) : (
                <span className="tglMuted">なし</span>
              )}
            </div>
          </section>

          {/* 最近の監査ログ */}
          <section className="tglRow" style={{ marginBottom: 12 }}>
            <div className="tglRowTitle">最近の監査ログ</div>
            <div className="tglRowMeta">
              {stats.recent_audit_logs?.length > 0 ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {stats.recent_audit_logs.map((log: any) => (
                    <div key={log.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="tglMuted">{new Date(log.created_at).toLocaleString()}</span>
                      <span className="tglPill">{log.action}</span>
                      <span className="tglMuted">{log.target_type}</span>
                      {log.target_id ? (
                        <Link
                          href={`/admin/topics/${log.target_id}?country=${country}`}
                          className="tglMuted"
                          style={{ textDecoration: 'none' }}
                        >
                          {log.target_id.slice(0, 8)}...
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="tglMuted">なし</span>
              )}
            </div>
          </section>

          <div style={{ height: 20 }} />
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

