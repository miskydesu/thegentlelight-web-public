'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateColumn, clearAdminToken } from '../../../../lib/tglAdminApi'

export default function AdminColumnNewPage() {
  const router = useRouter()
  const [status, setStatus] = useState('draft')
  const [tags, setTags] = useState('')
  const [cover, setCover] = useState('')
  const [lang, setLang] = useState('en')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const tagsArray = tags.split(',').map((t) => t.trim()).filter((t) => t)
      const res = await adminCreateColumn({
        status,
        tags: tagsArray,
        cover: cover || null,
        localizations: [
          {
            lang,
            title,
            slug,
            excerpt: excerpt || null,
            body_md: bodyMd,
            seo_title: seoTitle || null,
            seo_description: seoDescription || null,
          },
        ],
      })
      router.push(`/admin/columns/${res.column.column_id}?lang=${lang}`)
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
    <main>
      <div style={{ marginBottom: 10 }}>
        <a href="/admin/columns" className="tglMuted">
          ← columns
        </a>
      </div>
      <h1 style={{ fontSize: '1.4rem' }}>New Column</h1>
      <div style={{ height: 12 }} />

      {error ? <div style={{ color: '#b00020', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{error}</div> : null}

      <form onSubmit={submit} className="tglRow">
        <div className="tglRowTitle">基本情報</div>
        <div style={{ height: 10 }} />
        <div className="tglRowMeta" style={{ display: 'grid', gap: 10 }}>
          <label>
            <div className="tglMuted">status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: '0.6rem' }}>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label>
            <div className="tglMuted">tags (カンマ区切り)</div>
            <input value={tags} onChange={(e) => setTags(e.target.value)} style={{ width: '100%', padding: '0.6rem' }} />
          </label>
          <label>
            <div className="tglMuted">cover_image_key</div>
            <input value={cover} onChange={(e) => setCover(e.target.value)} style={{ width: '100%', padding: '0.6rem' }} />
          </label>
        </div>

        <div style={{ height: 20 }} />

        <div className="tglRowTitle">Localization (lang: {lang})</div>
        <div style={{ height: 10 }} />
        <div className="tglRowMeta" style={{ display: 'grid', gap: 10 }}>
          <label>
            <div className="tglMuted">lang</div>
            <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ width: '100%', padding: '0.6rem' }}>
              <option value="en">en</option>
              <option value="ja">ja</option>
            </select>
          </label>
          <label>
            <div className="tglMuted">title *</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%', padding: '0.6rem' }} />
          </label>
          <label>
            <div className="tglMuted">slug *</div>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required style={{ width: '100%', padding: '0.6rem' }} />
          </label>
          <label>
            <div className="tglMuted">excerpt</div>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} style={{ width: '100%', padding: '0.6rem' }} />
          </label>
          <label>
            <div className="tglMuted">body_md *</div>
            <textarea value={bodyMd} onChange={(e) => setBodyMd(e.target.value)} required rows={20} style={{ width: '100%', padding: '0.6rem', fontFamily: 'monospace' }} />
          </label>
          <label>
            <div className="tglMuted">seo_title</div>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} style={{ width: '100%', padding: '0.6rem' }} />
          </label>
          <label>
            <div className="tglMuted">seo_description</div>
            <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} style={{ width: '100%', padding: '0.6rem' }} />
          </label>
        </div>

        <div style={{ height: 20 }} />
        <button className="tglButton" type="submit" disabled={busy}>
          {busy ? '作成中…' : '作成'}
        </button>
      </form>
    </main>
  )
}

