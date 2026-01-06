'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminDeleteColumnName, adminListColumnNames, clearAdminToken, type AdminColumnName } from '../../../lib/tglAdminApi'

export default function AdminColumnNamesPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<AdminColumnName[]>([])

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await adminListColumnNames(q.trim() || undefined)
      setRows(res.column_names || [])
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
    return [...rows].sort((a, b) => {
      const ao = a.display_order ?? 999999
      const bo = b.display_order ?? 999999
      if (ao !== bo) return ao - bo
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [rows])

  const del = async (row: AdminColumnName) => {
    if ((row.count || 0) > 0) {
      alert('使用中のため削除できません')
      return
    }
    if (!confirm(`削除しますか？\nslug: ${row.slug}\n※この操作は取り消せません。`)) return
    setError(null)
    setBusy(true)
    try {
      await adminDeleteColumnName(row.column_name_id)
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
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>コラム名 一覧</h1>
        <Link
          href="/admin/column-names/new"
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          新規作成
        </Link>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 24,
            padding: '12px 16px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '6px',
            border: '1px solid #f5c6cb',
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        style={{
          marginBottom: 24,
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '20px',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 600, color: '#1a1a1a' }}>検索</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="slug / name / description"
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
              fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? '読み込み中…' : '更新'}
          </button>
        </div>
      </section>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                  cover
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                  slug
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                  name_jp / name_en
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                  order
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                  使用数
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => (
                <tr key={r.column_name_id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                  <td style={{ padding: '10px 12px', textAlign: 'center', width: 92 }}>
                    {r.cover_image_url ? (
                      <a href={r.cover_image_url} target="_blank" rel="noreferrer" title="open cover">
                        <img src={r.cover_image_url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e9ecef' }} />
                      </a>
                    ) : (
                      <span style={{ color: '#adb5bd', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.slug}</td>
                  <td style={{ padding: '12px 16px', minWidth: 360 }}>
                    <div style={{ fontWeight: 700 }}>{r.name_jp}</div>
                    <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>{r.name_en}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'monospace' }}>{r.display_order ?? '-'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{r.count ?? 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <Link
                        href={`/admin/column-names/${encodeURIComponent(r.column_name_id)}`}
                        style={{ padding: '4px 12px', backgroundColor: '#007bff', color: '#fff', textDecoration: 'none', borderRadius: 4, fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        編集
                      </Link>
                      <button
                        type="button"
                        onClick={() => void del(r)}
                        disabled={busy || (r.count ?? 0) > 0}
                        style={{
                          padding: '4px 12px',
                          border: '1px solid #dc3545',
                          backgroundColor: (r.count ?? 0) > 0 ? '#f5f5f5' : '#fff',
                          color: (r.count ?? 0) > 0 ? '#999' : '#dc3545',
                          borderRadius: 4,
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: (r.count ?? 0) > 0 ? 'not-allowed' : 'pointer',
                        }}
                        title={(r.count ?? 0) > 0 ? '使用中のため削除できません' : '削除'}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '28px 16px', textAlign: 'center', color: '#6c757d' }}>
                    まだコラム名がありません
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


