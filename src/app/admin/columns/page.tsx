'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminListColumns, clearAdminToken } from '../../../lib/tglAdminApi'

export default function AdminColumnsPage() {
  const router = useRouter()
  const [lang, setLang] = useState('en')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [tag, setTag] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([])

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await adminListColumns(lang, q.trim() || undefined, status.trim() || undefined, tag.trim() || undefined)
      setRows(res.columns || [])
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>Columns</h1>
        <Link className="tglButton" href="/admin/columns/new">
          New Column
        </Link>
      </div>

      <div style={{ height: 12 }} />

      <section className="tglRow">
        <div className="tglRowTitle">フィルタ</div>
        <div style={{ height: 10 }} />
        <div className="tglRowMeta" style={{ alignItems: 'center' }}>
          <label>
            <span className="tglMuted">lang</span>{' '}
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="en">en</option>
              <option value="ja">ja</option>
            </select>
          </label>
          <label>
            <span className="tglMuted">q</span>{' '}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="title/excerpt contains…" />
          </label>
          <label>
            <span className="tglMuted">status</span>{' '}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">all</option>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label>
            <span className="tglMuted">tag</span>{' '}
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="tag…" />
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
          {rows.map((c: any) => (
            <Link key={c.column_id} href={`/admin/columns/${c.column_id}?lang=${lang}`} className="tglRow">
              <div className="tglRowTitle">{c.title || '(no title)'}</div>
              <div className="tglRowMeta">
                <span className="tglPill">{c.status}</span>
                {c.slug ? <span className="tglMuted">/{c.slug}</span> : null}
                {c.excerpt ? <span className="tglMuted">{c.excerpt.substring(0, 60)}...</span> : null}
                {c.published_at ? <span className="tglMuted">{new Date(c.published_at).toLocaleDateString()}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="tglRow">
          <div className="tglRowTitle">columns がありません</div>
          <div className="tglRowMeta">フィルタ条件を変えるか、新規作成してください。</div>
        </div>
      )}
    </main>
  )
}

