'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminDeleteQuoteAuthor, adminListQuoteAuthors, clearAdminToken, type AdminQuoteAuthor } from '../../../lib/tglAdminApi'

export default function AdminQuoteAuthorsPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [rows, setRows] = useState<AdminQuoteAuthor[]>([])

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const qValue = q.trim() || undefined
      const r = await adminListQuoteAuthors(qValue)
      let next = r.authors || []
      if (publishedFilter === 'published') next = next.filter((a) => a.is_published)
      if (publishedFilter === 'draft') next = next.filter((a) => !a.is_published)
      setRows(next)
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

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [rows])

  const del = async (row: AdminQuoteAuthor) => {
    if (!confirm(`削除しますか？\n${row.localizations?.ja?.display_name || row.localizations?.en?.display_name || row.canonical_key}\n※この操作は取り消せません。`)) return
    setError(null)
    setBusy(true)
    try {
      await adminDeleteQuoteAuthor(row.author_id)
      await load()
    } catch (err: any) {
      const msg = err?.message || '削除に失敗しました'
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

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>名言著者 一覧</h1>
        <Link
          href="/admin/quote-authors/new"
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 6,
            fontSize: '0.9rem',
            fontWeight: 700,
          }}
        >
          新規作成
        </Link>
      </div>

      {error ? (
        <div style={{ marginBottom: 24, padding: '12px 16px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 6, border: '1px solid #f5c6cb', whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}

      <section style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 20 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 600, color: '#1a1a1a' }}>検索</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="display_name / alias / canonical_key"
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 6, minWidth: 320 }}
          />
          <select
            value={publishedFilter}
            onChange={(e) => setPublishedFilter(e.target.value as any)}
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 6 }}
          >
            <option value="all">すべて</option>
            <option value="published">公開のみ</option>
            <option value="draft">非公開のみ</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            style={{
              padding: '8px 14px',
              backgroundColor: busy ? '#6c757d' : '#343a40',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 800,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? '読み込み中…' : '更新'}
          </button>
        </div>
      </section>

      <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>display_name (ja/en)</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>canonical_key</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>公開</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>aliases</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const nameJa = row.localizations?.ja?.display_name || ''
                const nameEn = row.localizations?.en?.display_name || ''
                return (
                  <tr key={row.author_id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700 }}>{nameJa || '—'}</div>
                      <div style={{ color: '#6c757d' }}>{nameEn || '—'}</div>
                      <div style={{ color: '#adb5bd', fontSize: '0.8rem', fontFamily: 'monospace' }}>{row.author_id}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{row.canonical_key}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: row.is_published ? '#2f9e44' : '#868e96', fontWeight: 700 }}>
                      {row.is_published ? '公開' : '非公開'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#495057' }}>
                      <div>{row.type || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#495057', fontSize: '0.85rem' }}>
                      {(row.aliases || []).slice(0, 6).join(', ')}
                      {(row.aliases || []).length > 6 ? '…' : ''}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <Link href={`/admin/quote-authors/${encodeURIComponent(row.author_id)}`} style={{ padding: '4px 12px', backgroundColor: '#007bff', color: '#fff', textDecoration: 'none', borderRadius: 4, fontSize: '0.85rem', fontWeight: 700 }}>
                          編集
                        </Link>
                        <button
                          type="button"
                          onClick={() => void del(row)}
                          disabled={busy}
                          style={{
                            padding: '4px 12px',
                            border: '1px solid #dc3545',
                            backgroundColor: busy ? '#f5f5f5' : '#fff',
                            color: busy ? '#999' : '#dc3545',
                            borderRadius: 4,
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: busy ? 'not-allowed' : 'pointer',
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '28px 16px', textAlign: 'center', color: '#6c757d' }}>
                    まだ名言著者がありません
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
