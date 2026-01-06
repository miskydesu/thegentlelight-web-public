'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateColumnName, adminListWriters, adminSetColumnNameWriters, adminUploadColumnNameCover, clearAdminToken, type AdminWriter } from '../../../../lib/tglAdminApi'
import { CoverImageCropperModal } from '@/components/admin/CoverImageCropperModal'

export default function AdminColumnNameNewPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [slug, setSlug] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [nameJp, setNameJp] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionJp, setDescriptionJp] = useState('')
  const [displayOrder, setDisplayOrder] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [writers, setWriters] = useState<AdminWriter[]>([])
  const [selectedWriterIds, setSelectedWriterIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loadWriters = async () => {
      try {
        const r = await adminListWriters()
        setWriters(r.writers || [])
        const init: Record<string, boolean> = {}
        for (const w of r.writers || []) init[w.writer_id] = false
        setSelectedWriterIds(init)
      } catch {
        // ignore (non-fatal)
      }
    }
    void loadWriters()
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickCover = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(String(reader.result || ''))
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const clearCover = () => {
    setCoverFile(null)
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverPreviewUrl(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const r = await adminCreateColumnName({
        slug: slug.trim(),
        name_en: nameEn.trim(),
        name_jp: nameJp.trim(),
        description_en: descriptionEn.trim() || null,
        description_jp: descriptionJp.trim() || null,
        display_order: displayOrder.trim() ? Number(displayOrder.trim()) : null,
      })
      const id = String(r.column_name.column_name_id)
      // writers (best-effort)
      try {
        const ids = Object.entries(selectedWriterIds).filter(([, v]) => v).map(([k]) => k)
        if (ids.length) await adminSetColumnNameWriters(id, ids)
      } catch {
        // ignore (non-fatal)
      }
      if (coverFile) {
        try {
          await adminUploadColumnNameCover(id, coverFile)
        } catch (e2: any) {
          // non-fatal: 作成は完了しているので編集画面で再アップロード可能
          setError((p) => (p ? p : '') + `\n\n※作成は完了しましたが、カバー画像のアップロードに失敗しました。\n編集: /admin/column-names/${id}\n${e2?.message || ''}`)
        }
      }
      router.push(`/admin/column-names/${encodeURIComponent(id)}`)
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
      <CoverImageCropperModal
        open={cropOpen}
        imageSrc={cropSrc}
        maxWidth={1200}
        onClose={() => {
          setCropOpen(false)
          setCropSrc(null)
        }}
        onApply={(file, previewUrl) => {
          if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
          setCoverFile(file)
          setCoverPreviewUrl(previewUrl)
        }}
      />
      <div style={{ marginBottom: 10 }}>
        <a href="/admin/column-names" style={{ color: '#6c757d', textDecoration: 'none' }}>
          ← コラム名 一覧
        </a>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>コラム名 新規作成</h1>
      </div>

      {error ? (
        <div style={{ marginBottom: 24, padding: '12px 16px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 6, border: '1px solid #f5c6cb', whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}

      <form onSubmit={submit}>
        <section style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 20 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>基本情報</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>
                slug <span style={{ color: '#dc3545' }}>*</span>
              </span>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="example: parenting" style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6, fontFamily: 'monospace' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>
                name_jp <span style={{ color: '#dc3545' }}>*</span>
              </span>
              <input value={nameJp} onChange={(e) => setNameJp(e.target.value)} required placeholder="日本語名" style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>
                name_en <span style={{ color: '#dc3545' }}>*</span>
              </span>
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required placeholder="English name" style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>display_order</span>
              <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} placeholder="例: 1" style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
            </label>
          </div>
        </section>

        <section style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 20 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 600, color: '#1a1a1a' }}>ライター（複数選択）</h2>
          <div style={{ color: '#6c757d', fontSize: '0.85rem', marginBottom: 10 }}>※作成時に一緒に紐付けします</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {writers.map((w) => (
              <label key={w.writer_id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={!!selectedWriterIds[w.writer_id]}
                  onChange={(e) => setSelectedWriterIds((p) => ({ ...p, [w.writer_id]: e.target.checked }))}
                />
                <span style={{ fontWeight: 700 }}>{w.writer_name_jp}</span>
                <span style={{ color: '#6c757d' }}>{w.writer_name_en}</span>
              </label>
            ))}
            {writers.length === 0 ? <div style={{ color: '#6c757d' }}>ライターが未登録です（先に /admin/writers で作成してください）</div> : null}
          </div>
        </section>

        <section style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 20 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>説明文</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>description_jp</span>
              <textarea value={descriptionJp} onChange={(e) => setDescriptionJp(e.target.value)} rows={4} style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>description_en</span>
              <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={4} style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
            </label>
          </div>
        </section>

        <section style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 20 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>カバー画像</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="file" accept="image/*" disabled={busy} onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
              {coverPreviewUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => clearCover()}
                  style={{ padding: '8px 14px', border: '1px solid #ced4da', backgroundColor: '#fff', color: '#495057', borderRadius: 6, fontWeight: 800 }}
                >
                  取消
                </button>
              ) : null}
              <div style={{ color: '#6c757d', fontSize: '0.85rem' }}>※作成時に一緒にアップロードします</div>
            </div>
            {coverPreviewUrl ? (
              <div>
                <div style={{ color: '#6c757d', fontSize: '0.85rem', marginBottom: 6 }}>プレビュー（未保存）</div>
                <img src={coverPreviewUrl} alt="" style={{ width: 320, maxWidth: '100%', borderRadius: 10, border: '1px solid #e9ecef' }} />
              </div>
            ) : (
              <div style={{ color: '#6c757d' }}>未設定</div>
            )}
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Link href="/admin/column-names" style={{ padding: '10px 20px', border: '1px solid #ced4da', backgroundColor: '#fff', color: '#495057', textDecoration: 'none', borderRadius: 6, fontWeight: 600 }}>
            キャンセル
          </Link>
          <button type="submit" disabled={busy} style={{ padding: '10px 20px', backgroundColor: busy ? '#6c757d' : '#007bff', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy ? '作成中…' : '作成'}
          </button>
        </div>
      </form>
    </main>
  )
}


