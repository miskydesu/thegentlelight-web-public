'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminListQuotes, clearAdminToken } from '../../../lib/tglAdminApi'

export default function AdminQuotesPage() {
  const router = useRouter()
  const [lang, setLang] = useState('en')
  const [q, setQ] = useState('')
  const [isPublished, setIsPublished] = useState<boolean | undefined>(undefined)
  const [tag, setTag] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([])

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await adminListQuotes(lang, q.trim() || undefined, isPublished, tag.trim() || undefined)
      setRows(res.quotes || [])
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
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>Quotes</h1>
        <Link className="tglButton" href="/admin/quotes/new">
          New Quote
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
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="author/quote contains…" />
          </label>
          <label>
            <span className="tglMuted">is_published</span>{' '}
            <select
              value={isPublished === undefined ? '' : String(isPublished)}
              onChange={(e) => setIsPublished(e.target.value === '' ? undefined : e.target.value === 'true')}
            >
              <option value="">all</option>
              <option value="true">published</option>
              <option value="false">not published</option>
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
          {rows.map((q: any) => (
            <Link key={q.quote_id} href={`/admin/quotes/${q.quote_id}?lang=${lang}`} className="tglRow">
              <div className="tglRowTitle">
                {q.author_name ? `${q.author_name}: ` : ''}
                {q.quote_text ? q.quote_text.substring(0, 80) + (q.quote_text.length > 80 ? '...' : '') : '(no quote)'}
              </div>
              <div className="tglRowMeta">
                {q.is_published ? <span className="tglPill">published</span> : <span className="tglMuted">not published</span>}
                {q.source_text ? <span className="tglMuted">{q.source_text.substring(0, 40)}...</span> : null}
                {q.updated_at ? <span className="tglMuted">{new Date(q.updated_at).toLocaleDateString()}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="tglRow">
          <div className="tglRowTitle">quotes がありません</div>
          <div className="tglRowMeta">フィルタ条件を変えるか、新規作成してください。</div>
        </div>
      )}
    </main>
  )
}

