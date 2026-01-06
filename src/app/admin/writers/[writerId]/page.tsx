'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { adminListWriters, adminUpdateWriter, clearAdminToken, type AdminWriter } from '../../../../lib/tglAdminApi'

export default function AdminWriterEditPage() {
  const router = useRouter()
  const params = useParams<{ writerId: string }>()
  const writerId = params.writerId

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<AdminWriter | null>(null)

  const [nameJp, setNameJp] = useState('')
  const [nameEn, setNameEn] = useState('')

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const r = await adminListWriters()
      const found = r.writers.find((x) => x.writer_id === writerId) || null
      if (!found) {
        setRow(null)
        setError('not found')
        return
      }
      setRow(found)
      setNameEn(found.writer_name_en || '')
      setNameJp(found.writer_name_jp || '')
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
  }, [writerId])

  const save = async () => {
    setError(null)
    setBusy(true)
    try {
      await adminUpdateWriter(writerId, {
        writer_name_en: nameEn.trim(),
        writer_name_jp: nameJp.trim(),
      })
      await load()
    } catch (err: any) {
      const msg = err?.message || '更新に失敗しました'
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
      <div style={{ marginBottom: 10 }}>
        <Link href="/admin/writers" style={{ color: '#6c757d', textDecoration: 'none' }}>
          ← ライター 一覧
        </Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>
          ライター 編集: <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{writerId}</span>
        </h1>
        <button type="button" onClick={() => void save()} disabled={busy} style={{ padding: '10px 20px', backgroundColor: busy ? '#6c757d' : '#007bff', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 800 }}>
          {busy ? '保存中…' : '保存'}
        </button>
      </div>

      {error ? (
        <div style={{ marginBottom: 24, padding: '12px 16px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 6, border: '1px solid #f5c6cb', whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}

      {row ? (
        <section style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 20 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>基本情報</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>writer_name_jp</span>
              <input value={nameJp} onChange={(e) => setNameJp(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>writer_name_en</span>
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
            </label>
          </div>
          <div style={{ marginTop: 12, color: '#6c757d', fontSize: '0.9rem' }}>
            紐付け: コラム名 {row.count_column_names} / コラム {row.count_columns}
          </div>
        </section>
      ) : (
        <div style={{ padding: '40px 20px', backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center', color: '#6c757d' }}>
          読み込み中…
        </div>
      )}
    </main>
  )
}


