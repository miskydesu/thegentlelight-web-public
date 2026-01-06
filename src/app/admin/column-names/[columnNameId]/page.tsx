'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  adminDeleteColumnNameCover,
  adminGetColumnNameWriters,
  adminListColumnNames,
  adminListWriters,
  adminSetColumnNameWriters,
  adminUpdateColumnName,
  adminUploadColumnNameCover,
  clearAdminToken,
  type AdminColumnName,
  type AdminWriter,
} from '../../../../lib/tglAdminApi'
import { CoverImageCropperModal } from '@/components/admin/CoverImageCropperModal'

export default function AdminColumnNameEditPage() {
  const router = useRouter()
  const params = useParams<{ columnNameId: string }>()
  const columnNameId = params.columnNameId

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<AdminColumnName | null>(null)

  const [slug, setSlug] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [nameJp, setNameJp] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionJp, setDescriptionJp] = useState('')
  const [displayOrder, setDisplayOrder] = useState('')
  const [writers, setWriters] = useState<AdminWriter[]>([])
  const [selectedWriterIds, setSelectedWriterIds] = useState<Record<string, boolean>>({})

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverKey, setCoverKey] = useState<string | null>(null)
  const [coverBusy, setCoverBusy] = useState(false)
  const [coverDeleteRequested, setCoverDeleteRequested] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await adminListColumnNames()
      const found = res.column_names.find((x) => x.column_name_id === columnNameId) || null
      if (!found) {
        setError('not found')
        setRow(null)
        return
      }
      setRow(found)
      setSlug(found.slug || '')
      setNameEn(found.name_en || '')
      setNameJp(found.name_jp || '')
      setDescriptionEn(found.description_en || '')
      setDescriptionJp(found.description_jp || '')
      setDisplayOrder(found.display_order !== null && found.display_order !== undefined ? String(found.display_order) : '')
      setCoverUrl(found.cover_image_url || null)
      setCoverKey(found.cover_image_key || null)
      setCoverDeleteRequested(false)
      setCoverFile(null)
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
      setCoverPreviewUrl(null)

      // writers (non-fatal)
      try {
        const all = await adminListWriters()
        setWriters(all.writers || [])
        const init: Record<string, boolean> = {}
        for (const w of all.writers || []) init[w.writer_id] = false
        const linked = await adminGetColumnNameWriters(columnNameId)
        for (const id of linked.writer_ids || []) init[id] = true
        setSelectedWriterIds(init)
      } catch {
        // ignore
      }
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
  }, [columnNameId])

  useEffect(() => {
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

  const cancelCoverChanges = () => {
    setCoverDeleteRequested(false)
    setCoverFile(null)
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverPreviewUrl(null)
    // 画面は再読込でDB状態に戻すのが安全
    void load()
  }

  const save = async () => {
    setError(null)
    setBusy(true)
    try {
      await adminUpdateColumnName(columnNameId, {
        slug: slug.trim(),
        name_en: nameEn.trim(),
        name_jp: nameJp.trim(),
        description_en: descriptionEn.trim() || null,
        description_jp: descriptionJp.trim() || null,
        display_order: displayOrder.trim() ? Number(displayOrder.trim()) : null,
      })

      // writers (save-time)
      try {
        const ids = Object.entries(selectedWriterIds).filter(([, v]) => v).map(([k]) => k)
        await adminSetColumnNameWriters(columnNameId, ids)
      } catch (e: any) {
        setError((p) => (p ? `${p}\n` : '') + (e?.message || 'ライター紐付けの保存に失敗しました'))
      }

      // cover変更（保存時に反映）
      if (coverDeleteRequested) {
        setCoverBusy(true)
        await adminDeleteColumnNameCover(columnNameId)
        setCoverBusy(false)
      } else if (coverFile) {
        setCoverBusy(true)
        await adminUploadColumnNameCover(columnNameId, coverFile)
        setCoverBusy(false)
      }

      setCoverDeleteRequested(false)
      setCoverFile(null)
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
      setCoverPreviewUrl(null)
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
      setCoverBusy(false)
    }
  }

  const deleteCover = async () => {
    if (!confirm('カバー画像を削除しますか？（保存時に反映）')) return
    setCoverDeleteRequested(true)
    setCoverFile(null)
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverPreviewUrl(null)
    setCoverKey(null)
    setCoverUrl(null)
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
          setCoverDeleteRequested(false)
          // 既存表示は一旦消して「未保存プレビュー」を優先
          setCoverUrl(null)
        }}
      />
      <div style={{ marginBottom: 10 }}>
        <a href="/admin/column-names" style={{ color: '#6c757d', textDecoration: 'none' }}>
          ← コラム名 一覧
        </a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>
          コラム名 編集: <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{columnNameId}</span>
        </h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || coverBusy}
            style={{ padding: '10px 20px', backgroundColor: busy ? '#6c757d' : '#007bff', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700 }}
          >
            {busy ? '保存中…' : '保存'}
          </button>
          <Link
            href="/admin/column-names"
            style={{ padding: '10px 20px', border: '1px solid #ced4da', backgroundColor: '#fff', color: '#495057', textDecoration: 'none', borderRadius: 6, fontWeight: 700 }}
          >
            戻る
          </Link>
        </div>
      </div>

      {error ? (
        <div style={{ marginBottom: 24, padding: '12px 16px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 6, border: '1px solid #f5c6cb', whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}

      {row ? (
        <>
          <section style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 20 }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>基本情報</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>slug</span>
                <input value={slug} onChange={(e) => setSlug(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6, fontFamily: 'monospace' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>name_jp</span>
                <input value={nameJp} onChange={(e) => setNameJp(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>name_en</span>
                <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 600 }}>display_order</span>
                <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }} />
              </label>
            </div>
            <div style={{ marginTop: 12, color: '#6c757d', fontSize: '0.9rem' }}>使用数: {row.count}</div>
          </section>

          <section style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 20 }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 600, color: '#1a1a1a' }}>ライター（複数選択）</h2>
            <div style={{ color: '#6c757d', fontSize: '0.85rem', marginBottom: 10 }}>※ここで設定したライターは、紐づくコラムにも連動できます</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {writers.map((w) => (
                <label key={w.writer_id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={!!selectedWriterIds[w.writer_id]}
                    onChange={(e) => setSelectedWriterIds((p) => ({ ...p, [w.writer_id]: e.target.checked }))}
                    disabled={busy || coverBusy}
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
                <input type="file" accept="image/*" disabled={busy || coverBusy} onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
                {coverPreviewUrl ? (
                  <button
                    type="button"
                    disabled={busy || coverBusy}
                    onClick={() => cancelCoverChanges()}
                    style={{ padding: '8px 14px', border: '1px solid #ced4da', backgroundColor: '#fff', color: '#495057', borderRadius: 6, fontWeight: 800 }}
                  >
                    取消
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={coverBusy || busy || !coverKey}
                  onClick={() => void deleteCover()}
                  style={{ padding: '8px 14px', border: '1px solid #dc3545', backgroundColor: '#fff', color: '#dc3545', borderRadius: 6, fontWeight: 800 }}
                >
                  削除
                </button>
              </div>
              {coverPreviewUrl ? (
                <div>
                  <div style={{ color: '#6c757d', fontSize: '0.85rem', marginBottom: 6 }}>プレビュー（未保存）</div>
                  <img src={coverPreviewUrl} alt="" style={{ width: 320, maxWidth: '100%', borderRadius: 10, border: '1px solid #e9ecef' }} />
                </div>
              ) : coverDeleteRequested ? (
                <div style={{ color: '#dc3545', fontWeight: 700 }}>削除予定（保存時に反映）</div>
              ) : coverUrl ? (
                <div>
                  <div style={{ color: '#6c757d', fontSize: '0.85rem', marginBottom: 6 }}>
                    現在: <a href={coverUrl} target="_blank" rel="noreferrer">{coverUrl}</a>
                  </div>
                  <img src={coverUrl} alt="" style={{ width: 320, maxWidth: '100%', borderRadius: 10, border: '1px solid #e9ecef' }} />
                </div>
              ) : (
                <div style={{ color: '#6c757d' }}>未設定</div>
              )}
              <div style={{ color: '#6c757d', fontSize: '0.85rem' }}>
                ※カバー画像は「保存」ボタンを押したときに反映されます（IDベース: <code>column-names/covers/{columnNameId}</code>）
              </div>
            </div>
          </section>
        </>
      ) : (
        <div style={{ padding: '40px 20px', backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center', color: '#6c757d' }}>
          読み込み中…
        </div>
      )}
    </main>
  )
}


