'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminColumnsJaToEn, adminCreateColumn, adminListColumnNames, adminListWriters, adminSetColumnWriters, adminUploadColumnCover, adminUploadTempImage, clearAdminToken, type AdminColumnName, type AdminWriter } from '../../../../lib/tglAdminApi'
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
  seo_keywords: string
}

export default function AdminColumnNewPage() {
  const router = useRouter()
  const [status, setStatus] = useState('draft')
  const [publishedAtLocal, setPublishedAtLocal] = useState('') // datetime-local (browser local time)
  const [columnNameId, setColumnNameId] = useState('')
  const [columnNames, setColumnNames] = useState<AdminColumnName[]>([])
  const [writers, setWriters] = useState<AdminWriter[]>([])
  const [selectedWriterIds, setSelectedWriterIds] = useState<Record<string, boolean>>({})
  const [cover, setCover] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [activeLang, setActiveLang] = useState<'en' | 'ja'>('ja')
  const [loc, setLoc] = useState<{ en: ColumnLoc; ja: ColumnLoc }>({
    en: { title: '', slug: '', excerpt: '', body_md: '', seo_title: '', seo_description: '', seo_keywords: '' },
    ja: { title: '', slug: '', excerpt: '', body_md: '', seo_title: '', seo_description: '', seo_keywords: '' },
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdColumnId, setCreatedColumnId] = useState<string | null>(null)
  const [uploadSessionId] = useState(() => (Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 32))

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

  const clearCover = () => {
    setCoverFile(null)
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverPreviewUrl(null)
    setCover('')
    setCoverUrl(null)
  }

  useEffect(() => {
    const loadNames = async () => {
      try {
        const r = await adminListColumnNames()
        setColumnNames(r.column_names || [])
      } catch {
        // ignore (non-fatal)
      }
    }
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
    void loadNames()
    void loadWriters()
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isValid = (): { ok: boolean; message?: string } => {
    const required = (v: string) => Boolean(String(v || '').trim())
    for (const lang of ['en', 'ja'] as const) {
      const l = loc[lang]
      if (!required(l.title)) return { ok: false, message: `${lang}: title は必須です` }
      if (!required(l.slug)) return { ok: false, message: `${lang}: slug は必須です` }
      if (!required(l.body_md)) return { ok: false, message: `${lang}: body_md は必須です` }
    }
    return { ok: true }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const v = isValid()
    if (!v.ok) {
      setError(v.message || '入力が不足しています（en/ja両方が必須です）')
      await swalError(v.message || '入力が不足しています（en/ja両方が必須です）', '入力不足（Invalid）')
      return
    }
    setBusy(true)
    try {
      await swalLoading('作成中…', 'コラムを作成しています')
      const res = await adminCreateColumn({
        status,
        column_name_id: columnNameId.trim() ? columnNameId.trim() : null,
        published_at: publishedAtLocal ? new Date(publishedAtLocal).toISOString() : undefined,
        cover: null, // coverは作成後にAPIで一括セット（DB+R2）
        localizations: [
          {
            lang: 'en',
            title: loc.en.title,
            slug: loc.en.slug,
            excerpt: loc.en.excerpt || null,
            body_md: loc.en.body_md,
            seo_title: loc.en.seo_title || null,
            seo_description: loc.en.seo_description || null,
            seo_keywords: loc.en.seo_keywords || null,
          },
          {
            lang: 'ja',
            title: loc.ja.title,
            slug: loc.ja.slug,
            excerpt: loc.ja.excerpt || null,
            body_md: loc.ja.body_md,
            seo_title: loc.ja.seo_title || null,
            seo_description: loc.ja.seo_description || null,
            seo_keywords: loc.ja.seo_keywords || null,
          },
        ],
      })
      const newId = String(res.column.column_id)
      setCreatedColumnId(newId)

      if (coverFile) {
        const r = await adminUploadColumnCover(newId, coverFile)
        setCover(r.key)
        setCoverUrl(r.url)
      }

      // writers (best-effort)
      try {
        const ids = Object.entries(selectedWriterIds).filter(([, v]) => v).map(([k]) => k)
        if (ids.length) await adminSetColumnWriters(newId, ids)
      } catch {
        // ignore (non-fatal)
      }

      router.push(`/admin/columns/${newId}?lang=${activeLang}`)
    } catch (err: any) {
      const msg = err?.message || '作成に失敗しました'
      if (String(msg).includes(' 401 ') || String(msg).includes(' 403 ')) {
        clearAdminToken()
        router.push('/admin/login')
        return
      }
      if (createdColumnId) {
        setError(`${msg}\n\n※コラム自体は作成済みの可能性があります。編集画面でカバーを再アップロードしてください。\n編集: /admin/columns/${createdColumnId}`)
      } else {
        setError(msg)
      }
      await swalError(msg, '作成失敗（Create failed）')
    } finally {
      setBusy(false)
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

  const generateEnFromJa = async () => {
    const ja = loc.ja
    if (!ja.title.trim() || !ja.slug.trim() || !ja.body_md.trim()) {
      await swalError('日本語（ja）の title / slug / body_md を先に入力してください', '入力不足（Invalid）')
      return
    }

    const ok = await swalConfirm({
      title: '英語（en）を自動生成しますか？',
      text: '日本語（ja）を元に、英語圏前提の自然なローカライズで英語欄を上書きします（画像URLはそのまま）。',
      confirmText: '生成する',
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
          setCoverUrl(null)
        }}
      />
      <div style={{ marginBottom: 10 }}>
        <a href="/admin/columns" style={{ color: '#6c757d', textDecoration: 'none' }}>
          ← コラム一覧（Columns）
        </a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>新規コラム作成（New Column）</h1>
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

      <form onSubmit={submit}>
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
                  title="空にすると、作成時に自動設定（publishedの場合）になります"
                >
                  クリア
                </button>
              </div>
              <div style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                ※空の場合、status=published なら作成時に自動で「今」を入れます（後から編集で変更できます）<br />
                ※published_at が未来の場合は **予約投稿** 扱いになり、その日時までは一般公開ページに表示されません
              </div>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>カバー画像（R2アップロード / cover_image_key）</span>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="file" accept="image/*" disabled={busy} onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
                <span style={{ color: '#6c757d', fontSize: '0.85rem' }}>
                  画像を選ぶとプレビューしてクロップできます（最大横幅1200px）。保存時にR2へアップロードします（未保存の間はR2に増えません）
                </span>
                <button
                  type="button"
                  onClick={() => clearCover()}
                  disabled={busy || (!coverFile && !cover && !coverUrl)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #ced4da',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  クリア
                </button>
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
            <h2 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 600, color: '#1a1a1a' }}>
              ローカライズ（Localization / EN+JA 両方必須）
            </h2>
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
                title="日本語（ja）を元に英語（en）を自動生成（LLM）"
              >
                JA→EN 自動生成（LLM）
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('ja')}
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
                style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem' }}
              />
            </label>
          </div>

          <div style={{ height: 12 }} />

          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>抜粋（excerpt）</span>
            <textarea
              value={loc[activeLang].excerpt}
              onChange={(e) => setLoc((p) => ({ ...p, [activeLang]: { ...p[activeLang], excerpt: e.target.value } }))}
              rows={3}
              style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </label>

          <div style={{ height: 12 }} />

          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>SEO説明（seo_description）</span>
            <textarea
              value={loc[activeLang].seo_description}
              onChange={(e) => setLoc((p) => ({ ...p, [activeLang]: { ...p[activeLang], seo_description: e.target.value } }))}
              rows={3}
              style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </label>

          <div style={{ height: 12 }} />

          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>SEOキーワード（seo_keywords / カンマ区切り）</span>
            <input
              value={loc[activeLang].seo_keywords}
              onChange={(e) => setLoc((p) => ({ ...p, [activeLang]: { ...p[activeLang], seo_keywords: e.target.value } }))}
              placeholder={activeLang === 'ja' ? '例: ニュース疲れ, 情報過多, マインドフルネス' : 'e.g. news anxiety, mindful news, calm reading'}
              style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </label>

          <div style={{ height: 12 }} />

          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>本文（Markdown / body_md）*</span>
            <TiptapMarkdownEditor
              value={loc[activeLang].body_md}
              onChange={(next) => setLoc((p) => ({ ...p, [activeLang]: { ...p[activeLang], body_md: next } }))}
              disabled={busy}
              uploadImage={async (file) => {
                // Newコラム（未保存）では temp に上げる。保存時にAPI側で columns/ に確定＆tmp削除される。
                const r = await adminUploadTempImage(file, uploadSessionId)
                return { url: r.url }
              }}
            />
          </label>

          <div style={{ height: 12 }} />

        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '10px 20px',
              backgroundColor: busy ? '#6c757d' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? '作成中…' : '作成'}
          </button>
        </div>
      </form>
    </main>
  )
}

