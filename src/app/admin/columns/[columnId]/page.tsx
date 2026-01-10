'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { adminColumnsJaToEn, adminDeleteColumnCover, adminGetColumn, adminGetColumnWriters, adminListColumnNames, adminListWriters, adminSetColumnWriters, adminUpdateColumn, adminUploadColumnCover, adminUploadTempImage, clearAdminToken, type AdminColumnName, type AdminWriter } from '../../../../lib/tglAdminApi'
import { TiptapMarkdownEditor } from '@/components/admin/TiptapMarkdownEditor'
import { CoverImageCropperModal } from '@/components/admin/CoverImageCropperModal'
import { swalClose, swalConfirm, swalError, swalLoading, swalSuccess } from '@/lib/adminSwal'

type ColumnLoc = {
  title: string
  slug: string
  excerpt: string
  body_md: string
  seo_title: string
  seo_description: string
}

export default function AdminColumnDetailPage() {
  const router = useRouter()
  const params = useParams<{ columnId: string }>()
  const sp = useSearchParams()

  const columnId = params?.columnId || ''
  const langParam = sp?.get('lang') || 'en'
  const initialLang: 'en' | 'ja' = langParam === 'en' ? 'en' : 'ja'

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  const [status, setStatus] = useState('draft')
  const [publishedAtLocal, setPublishedAtLocal] = useState('') // datetime-local (browser local time)
  const [columnNameId, setColumnNameId] = useState('')
  const [columnNames, setColumnNames] = useState<AdminColumnName[]>([])
  const [writers, setWriters] = useState<AdminWriter[]>([])
  const [selectedWriterIds, setSelectedWriterIds] = useState<Record<string, boolean>>({})
  const [cover, setCover] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [busyCover, setBusyCover] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [coverDeleteRequested, setCoverDeleteRequested] = useState(false)
  const [uploadSessionId] = useState(() => (Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 32))
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [activeLang, setActiveLang] = useState<'en' | 'ja'>(initialLang)
  const [loc, setLoc] = useState<{ en: ColumnLoc; ja: ColumnLoc }>({
    en: { title: '', slug: '', excerpt: '', body_md: '', seo_title: '', seo_description: '' },
    ja: { title: '', slug: '', excerpt: '', body_md: '', seo_title: '', seo_description: '' },
  })

  const generateEnFromJa = async () => {
    const ja = loc.ja
    if (!ja.title.trim() || !ja.slug.trim() || !ja.body_md.trim()) {
      await swalError('日本語（ja）の title / slug / body_md を先に入力してください', '入力不足（Invalid）')
      return
    }

    const ok = await swalConfirm({
      title: '英語（en）を再生成しますか？',
      text: '日本語（ja）を元に、英語圏前提の自然なローカライズで英語欄を上書きします（画像URLはそのまま）。',
      confirmText: '再生成する',
      cancelText: 'キャンセル',
    })
    if (!ok) return

    try {
      await swalLoading('生成中…', '英語ローカライズを作成しています')
      const r = await adminColumnsJaToEn({
        title: ja.title,
        slug: ja.slug,
        excerpt: ja.excerpt || null,
        body_md: ja.body_md,
        seo_title: ja.seo_title || null,
        seo_description: ja.seo_description || null,
      })
      const g = r.generated
      setLoc((p) => ({
        ...p,
        en: {
          ...p.en,
          title: g.title_en,
          slug: g.slug_en,
          excerpt: g.excerpt_en,
          body_md: g.body_md_en,
          seo_title: g.seo_title_en,
          seo_description: g.seo_description_en,
        },
      }))
      setActiveLang('en')
      await swalSuccess('英語（en）を反映しました', '完了（Done）')
    } catch (err: any) {
      const msg = err?.message || '英語生成に失敗しました'
      await swalError(msg, '生成失敗（Failed）')
    } finally {
      await swalClose()
    }
  }

  const pickCover = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      setCropSrc(dataUrl)
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const requestRemoveCover = () => {
    setCoverDeleteRequested(true)
    setCoverFile(null)
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverPreviewUrl(null)
    setCover('')
    setCoverUrl(null)
  }

  const cancelCoverChanges = () => {
    setCoverDeleteRequested(false)
    setCoverFile(null)
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverPreviewUrl(null)
    // 画面は再読込でDB状態に戻すのが安全
    void load()
  }

  const load = async () => {
    if (!columnId) {
      setError('invalid id')
      setBusy(false)
      return
    }
    setError(null)
    setBusy(true)
    try {
      await swalLoading('読み込み中…', 'コラム情報を取得しています')
      // コラム名一覧（非fatal）
      try {
        const cn = await adminListColumnNames()
        setColumnNames(cn.column_names || [])
      } catch {
        // ignore
      }
      // ライター一覧（非fatal）
      try {
        const w = await adminListWriters()
        setWriters(w.writers || [])
        const init: Record<string, boolean> = {}
        for (const x of w.writers || []) init[x.writer_id] = false
        const linked = await adminGetColumnWriters(columnId)
        for (const id of linked.writer_ids || []) init[id] = true
        setSelectedWriterIds(init)
      } catch {
        // ignore
      }
      // en/ja両方を一度に取得して、タブで切り替える
      const res = await adminGetColumn(columnId, 'all')
      setData(res)
      const c = res?.column
      if (c) {
        setStatus(c.status || 'draft')
        setColumnNameId(String(c.column_name_id || ''))
        // published_at(ISO) -> datetime-local
        const iso = c.published_at ? String(c.published_at) : ''
        if (iso) {
          const d = new Date(iso)
          const pad = (n: number) => String(n).padStart(2, '0')
          const yyyy = d.getFullYear()
          const mm = pad(d.getMonth() + 1)
          const dd = pad(d.getDate())
          const hh = pad(d.getHours())
          const mi = pad(d.getMinutes())
          setPublishedAtLocal(`${yyyy}-${mm}-${dd}T${hh}:${mi}`)
        } else {
          setPublishedAtLocal('')
        }
        setCover(c.cover_image_key || '')
        setCoverUrl(c.cover_image_url || null)
        setCoverDeleteRequested(false)
        setCoverFile(null)
        if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
        setCoverPreviewUrl(null)
        const en = c.localizations?.en
        const ja = c.localizations?.ja
        setLoc({
          en: {
            title: en?.title || '',
            slug: en?.slug || '',
            excerpt: en?.excerpt || '',
            body_md: en?.body_md || '',
            seo_title: en?.seo_title || '',
            seo_description: en?.seo_description || '',
          },
          ja: {
            title: ja?.title || '',
            slug: ja?.slug || '',
            excerpt: ja?.excerpt || '',
            body_md: ja?.body_md || '',
            seo_title: ja?.seo_title || '',
            seo_description: ja?.seo_description || '',
          },
        })
      }
    } catch (err: any) {
      const msg = err?.message || '取得に失敗しました'
      if (String(msg).includes(' 401 ') || String(msg).includes(' 403 ')) {
        clearAdminToken()
        router.push('/admin/login')
        return
      }
      setError(msg)
      await swalError(msg, '取得失敗（Load failed）')
    } finally {
      setBusy(false)
      await swalClose()
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnId])

  const save = async () => {
    setError(null)
    setBusy(true)
    try {
      await swalLoading('保存中…', '変更を保存しています')
      await adminUpdateColumn(columnId, {
        status,
        column_name_id: columnNameId.trim() ? columnNameId.trim() : null,
        published_at: publishedAtLocal ? new Date(publishedAtLocal).toISOString() : null,
        localizations: {
          en: {
            title: loc.en.title,
            slug: loc.en.slug,
            excerpt: loc.en.excerpt || null,
            body_md: loc.en.body_md,
            seo_title: loc.en.seo_title || null,
            seo_description: loc.en.seo_description || null,
          },
          ja: {
            title: loc.ja.title,
            slug: loc.ja.slug,
            excerpt: loc.ja.excerpt || null,
            body_md: loc.ja.body_md,
            seo_title: loc.ja.seo_title || null,
            seo_description: loc.ja.seo_description || null,
          },
        },
      })

      if (coverDeleteRequested) await adminDeleteColumnCover(columnId)
      else if (coverFile) {
        setBusyCover(true)
        const r = await adminUploadColumnCover(columnId, coverFile)
        setCover(r.key)
        setCoverUrl(r.url)
        setBusyCover(false)
      }

      // writers（個別コラム）
      try {
        const ids = Object.entries(selectedWriterIds).filter(([, v]) => v).map(([k]) => k)
        await adminSetColumnWriters(columnId, ids)
      } catch (e: any) {
        setError((p) => (p ? `${p}\n` : '') + (e?.message || 'ライター紐付けの保存に失敗しました'))
      }

      setCoverDeleteRequested(false)
      setCoverFile(null)
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
      setCoverPreviewUrl(null)
      await load()
      await swalSuccess('保存しました', '完了（Done）')
    } catch (err: any) {
      setError(err?.message || '更新に失敗しました')
      await swalError(err?.message || '更新に失敗しました', '保存失敗（Save failed）')
    } finally {
      setBusy(false)
      setBusyCover(false)
      await swalClose()
    }
  }

  const nowAsDatetimeLocal = (): string => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
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
          setCoverUrl(null)
        }}
      />
      <div style={{ marginBottom: 10 }}>
        <a href="/admin/columns" style={{ color: '#6c757d', textDecoration: 'none' }}>
          ← コラム一覧（Columns）
        </a>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>
          コラム編集（Edit Column）: {loc[activeLang].title || '(loading)'}
        </h1>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          style={{
            padding: '10px 20px',
            backgroundColor: busy ? '#6c757d' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? '保存中…' : '保存'}
        </button>
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

      {/* 基本情報 */}
      <section
        style={{
          marginBottom: 24,
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '20px',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>基本情報（Base）</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>コラム名（column_name）</span>
            <select
              value={columnNameId}
              onChange={(e) => setColumnNameId(e.target.value)}
              disabled={busy}
              style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem', backgroundColor: '#fff' }}
            >
              <option value="">（未設定）</option>
              {columnNames.map((n) => (
                <option key={n.column_name_id} value={n.column_name_id}>
                  {n.name_jp} / {n.name_en} ({n.slug})
                </option>
              ))}
            </select>
            <div style={{ color: '#6c757d', fontSize: '0.8rem' }}>コラムに1つだけ割り当てられます</div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>状態（status）</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem' }}
            >
              <option value="draft">下書き（draft）</option>
              <option value="published">公開（published）</option>
              <option value="archived">アーカイブ（archived）</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>公開日時（published_at）</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="datetime-local"
                value={publishedAtLocal}
                onChange={(e) => setPublishedAtLocal(e.target.value)}
                disabled={busy}
                style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem' }}
              />
              <button
                type="button"
                onClick={() => setPublishedAtLocal(nowAsDatetimeLocal())}
                disabled={busy}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ced4da',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                今（Now）
              </button>
              <button
                type="button"
                onClick={() => setPublishedAtLocal('')}
                disabled={busy || !publishedAtLocal}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ced4da',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title="クリアすると published_at は null になります"
              >
                クリア
              </button>
            </div>
            <div style={{ color: '#6c757d', fontSize: '0.8rem' }}>
              ※保存時にDBへ反映されます。空の場合は published_at=null（未設定）になります<br />
              ※status=published かつ published_at が未来の場合は **予約投稿** 扱いになり、その日時までは一般公開ページに表示されません
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>カバー画像（R2アップロード / cover_image_key）</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="file" accept="image/*" disabled={busy || busyCover} onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
              <span style={{ color: '#6c757d', fontSize: '0.85rem' }}>
                画像を選ぶとプレビューしてクロップできます（最大横幅1200px）。保存時にR2へアップロードします
              </span>
              <button
                type="button"
                disabled={busy || busyCover || (!cover && !coverUrl)}
                onClick={() => requestRemoveCover()}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ced4da',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title="カバー画像を削除（保存時に反映）"
              >
                削除
              </button>
              {coverFile || coverDeleteRequested ? (
                <button
                  type="button"
                  disabled={busy || busyCover}
                  onClick={() => cancelCoverChanges()}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #ced4da',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  title="カバー変更を取り消し（DB状態に戻す）"
                >
                  取消
                </button>
              ) : null}
            </div>
            <input
              value={cover}
              readOnly
              placeholder="（保存後に自動設定）例: columns/covers/<columnId>"
              style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem', fontFamily: 'monospace' }}
            />
            {coverPreviewUrl ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ color: '#6c757d', fontSize: '0.85rem' }}>プレビュー（未保存）</div>
                <img src={coverPreviewUrl} alt="cover preview" style={{ maxWidth: 320, borderRadius: 8, border: '1px solid #e9ecef' }} />
              </div>
            ) : coverUrl ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ color: '#6c757d', fontSize: '0.85rem' }}>
                  プレビュー（Preview）: <a href={coverUrl} target="_blank" rel="noreferrer">{coverUrl}</a>
                </div>
                <img src={coverUrl} alt="cover preview" style={{ maxWidth: 320, borderRadius: 8, border: '1px solid #e9ecef' }} />
              </div>
            ) : null}
          </label>
        </div>
      </section>

      <section style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 20 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 600, color: '#1a1a1a' }}>ライター（個別コラム）</h2>
        <div style={{ color: '#6c757d', fontSize: '0.85rem', marginBottom: 10 }}>※コラム名のライターに加えて、個別コラムにも複数紐付けできます</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {writers.map((w) => (
            <label key={w.writer_id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={!!selectedWriterIds[w.writer_id]}
                onChange={(e) => setSelectedWriterIds((p) => ({ ...p, [w.writer_id]: e.target.checked }))}
                disabled={busy}
              />
              <span style={{ fontWeight: 700 }}>{w.writer_name_jp}</span>
              <span style={{ color: '#6c757d' }}>{w.writer_name_en}</span>
            </label>
          ))}
          {writers.length === 0 ? <div style={{ color: '#6c757d' }}>ライターが未登録です（先に /admin/writers で作成してください）</div> : null}
        </div>
      </section>

      {/* Localization */}
      <section
        style={{
          marginBottom: 24,
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 600, color: '#1a1a1a' }}>ローカライズ（Localization）</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void generateEnFromJa()}
              disabled={busy}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: '#fff',
                color: '#212529',
                cursor: busy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
              title="日本語（ja）を元に英語（en）を再生成（LLM）"
            >
              JA→EN 再生成（LLM）
            </button>
            <button
              type="button"
              onClick={() => setActiveLang('ja')}
              disabled={busy}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: activeLang === 'ja' ? '#007bff' : '#fff',
                color: activeLang === 'ja' ? '#fff' : '#212529',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              日本語
            </button>
            <button
              type="button"
              onClick={() => setActiveLang('en')}
              disabled={busy}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: activeLang === 'en' ? '#007bff' : '#fff',
                color: activeLang === 'en' ? '#fff' : '#212529',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              English
            </button>
          </div>
        </div>

        <div style={{ height: 8 }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>タイトル（title）*</span>
            <input
              value={loc[activeLang].title}
              onChange={(e) => setLoc((p) => ({ ...p, [activeLang]: { ...p[activeLang], title: e.target.value } }))}
              style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.95rem' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>スラッグ（slug）*</span>
            <input
              value={loc[activeLang].slug}
              onChange={(e) => setLoc((p) => ({ ...p, [activeLang]: { ...p[activeLang], slug: e.target.value } }))}
              style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.95rem', fontFamily: 'monospace' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>SEOタイトル（seo_title）</span>
            <input
              value={loc[activeLang].seo_title}
              onChange={(e) => setLoc((p) => ({ ...p, [activeLang]: { ...p[activeLang], seo_title: e.target.value } }))}
              style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.95rem' }}
            />
          </label>
        </div>

        <div style={{ height: 16 }} />

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>抜粋（excerpt）</span>
          <textarea
            value={loc[activeLang].excerpt}
            onChange={(e) => setLoc((p) => ({ ...p, [activeLang]: { ...p[activeLang], excerpt: e.target.value } }))}
            rows={3}
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.95rem' }}
          />
        </label>

        <div style={{ height: 16 }} />

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>本文（Markdown / body_md）*</span>
          <TiptapMarkdownEditor
            value={loc[activeLang].body_md}
            onChange={(next) => setLoc((p) => ({ ...p, [activeLang]: { ...p[activeLang], body_md: next } }))}
            disabled={busy}
            uploadImage={async (file) => {
              const r = await adminUploadTempImage(file, uploadSessionId)
              return { url: r.url }
            }}
          />
        </label>

        <div style={{ height: 16 }} />

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>SEO説明（seo_description）</span>
          <textarea
            value={loc[activeLang].seo_description}
            onChange={(e) => setLoc((p) => ({ ...p, [activeLang]: { ...p[activeLang], seo_description: e.target.value } }))}
            rows={3}
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.95rem' }}
          />
        </label>

        <div style={{ height: 20 }} />
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          style={{
            padding: '10px 20px',
            backgroundColor: busy ? '#6c757d' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? '保存中…' : '保存'}
        </button>
      </section>
    </main>
  )
}

