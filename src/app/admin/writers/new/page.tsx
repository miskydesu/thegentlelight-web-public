'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateWriter, clearAdminToken } from '../../../../lib/tglAdminApi'

export default function AdminWriterNewPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nameJp, setNameJp] = useState('')
  const [nameEn, setNameEn] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const r = await adminCreateWriter({ writer_name_en: nameEn.trim(), writer_name_jp: nameJp.trim() })
      router.push(`/admin/writers/${encodeURIComponent(r.writer.writer_id)}`)
    } catch (err: any) {
      const msg = err?.message || '作成に失敗しました'
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
      <h1 style={{ fontSize: '1.8rem', margin: '0 0 16px', fontWeight: 600, color: '#1a1a1a' }}>ライター 新規作成</h1>

      {error ? (
        <div style={{ marginBottom: 24, padding: '12px 16px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 6, border: '1px solid #f5c6cb', whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}

      <form onSubmit={submit}>
        <section style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 20 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>基本情報</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>
                writer_name_jp <span style={{ color: '#dc3545' }}>*</span>
              </span>
              <input value={nameJp} onChange={(e) => setNameJp(e.target.value)} required placeholder="例: 山田 太郎" style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>
                writer_name_en <span style={{ color: '#dc3545' }}>*</span>
              </span>
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required placeholder="e.g. Taro Yamada" style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
            </label>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Link href="/admin/writers" style={{ padding: '10px 20px', border: '1px solid #ced4da', backgroundColor: '#fff', color: '#495057', textDecoration: 'none', borderRadius: 6, fontWeight: 700 }}>
            キャンセル
          </Link>
          <button type="submit" disabled={busy} style={{ padding: '10px 20px', backgroundColor: busy ? '#6c757d' : '#007bff', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy ? '作成中…' : '作成'}
          </button>
        </div>
      </form>
    </main>
  )
}


