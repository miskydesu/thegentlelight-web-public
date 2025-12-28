'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { COUNTRIES, type Country } from '../../../lib/tglApi'
import { adminListTopics, clearAdminToken } from '../../../lib/tglAdminApi'

export default function AdminTopicsPage() {
  const router = useRouter()
  const [country, setCountry] = useState<Country>('us')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([])

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await adminListTopics(country, q.trim(), status.trim(), category.trim())
      setRows(res.topics || [])
    } catch (err: any) {
      const msg = err?.message || '取得に失敗しました'
      // 401/403 の場合はログインへ
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

  const header = useMemo(() => `${country.toUpperCase()} topics`, [country])

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>{header}</h1>
        <Link className="tglMuted" href="/admin/login">
          ログインへ →
        </Link>
      </div>

      <div style={{ height: 12 }} />

      <section className="tglRow">
        <div className="tglRowTitle">フィルタ</div>
        <div style={{ height: 10 }} />
        <div className="tglRowMeta" style={{ alignItems: 'center' }}>
          <label>
            <span className="tglMuted">Country</span>{' '}
            <select value={country} onChange={(e) => setCountry(e.target.value as Country)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="tglMuted">q</span>{' '}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="title contains…" />
          </label>
          <label>
            <span className="tglMuted">status</span>{' '}
            <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="active/hidden…" />
          </label>
          <label>
            <span className="tglMuted">category</span>{' '}
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="world/economy…" />
          </label>

          <button className="tglButton" onClick={() => void load()} disabled={busy}>
            {busy ? '更新中…' : '更新'}
          </button>
        </div>
        {error ? (
          <div style={{ marginTop: 10, color: '#b00020', whiteSpace: 'pre-wrap' }}>{error}</div>
        ) : null}
      </section>

      <div style={{ height: 12 }} />

      {rows.length ? (
        <div className="tglList">
          {rows.map((t: any) => (
            <Link key={t.topic_id} href={`/admin/topics/${t.topic_id}?country=${country}`} className="tglRow">
              <div className="tglRowTitle">{t.title}</div>
              <div className="tglRowMeta">
                <span className="tglPill">{t.category}</span>
                <span className="tglPill">{t.status}</span>
                <span>{t.source_count} sources</span>
                {t.high_arousal ? <span className="tglPill">high arousal</span> : null}
                {t.last_source_published_at ? <span className="tglMuted">updated {new Date(t.last_source_published_at).toLocaleString()}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="tglRow">
          <div className="tglRowTitle">topics がありません</div>
          <div className="tglRowMeta">フィルタ条件を変えるか、ジョブ実行後に再読み込みしてください。</div>
        </div>
      )}
    </main>
  )
}


