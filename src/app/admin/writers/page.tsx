'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminDeleteWriter, adminListWriters, clearAdminToken, type AdminWriter } from '../../../lib/tglAdminApi'

export default function AdminWritersPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<AdminWriter[]>([])

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const r = await adminListWriters(q.trim() || undefined)
      setRows(r.writers || [])
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
    return [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [rows])

  const del = async (w: AdminWriter) => {
    if ((w.count_column_names || 0) > 0 || (w.count_columns || 0) > 0) {
      alert('紐付けがあるため削除できません')
      return
    }
    if (!confirm(`削除しますか？\n${w.writer_name_jp} / ${w.writer_name_en}\n※この操作は取り消せません。`)) return
    setError(null)
    setBusy(true)
    try {
      await adminDeleteWriter(w.writer_id)
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
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>ライター 一覧</h1>
        <Link
          href="/admin/writers/new"
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
            placeholder="writer_name_en / writer_name_jp"
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 6, minWidth: 320 }}
          />
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
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>writer_name_jp / en</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>紐付け</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((w, idx) => (
                <tr key={w.writer_id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700 }}>{w.writer_name_jp}</div>
                    <div style={{ color: '#6c757d' }}>{w.writer_name_en}</div>
                    <div style={{ color: '#adb5bd', fontSize: '0.8rem', fontFamily: 'monospace' }}>{w.writer_id}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#495057' }}>
                    コラム名:{w.count_column_names} / コラム:{w.count_columns}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <Link href={`/admin/writers/${encodeURIComponent(w.writer_id)}`} style={{ padding: '4px 12px', backgroundColor: '#007bff', color: '#fff', textDecoration: 'none', borderRadius: 4, fontSize: '0.85rem', fontWeight: 700 }}>
                        編集
                      </Link>
                      <button
                        type="button"
                        onClick={() => void del(w)}
                        disabled={busy || (w.count_column_names || 0) > 0 || (w.count_columns || 0) > 0}
                        style={{
                          padding: '4px 12px',
                          border: '1px solid #dc3545',
                          backgroundColor: (w.count_column_names || 0) > 0 || (w.count_columns || 0) > 0 ? '#f5f5f5' : '#fff',
                          color: (w.count_column_names || 0) > 0 || (w.count_columns || 0) > 0 ? '#999' : '#dc3545',
                          borderRadius: 4,
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: (w.count_column_names || 0) > 0 || (w.count_columns || 0) > 0 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '28px 16px', textAlign: 'center', color: '#6c757d' }}>
                    まだライターがありません
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


