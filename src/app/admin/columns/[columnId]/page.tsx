'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { adminGetColumn, adminUpdateColumn, clearAdminToken } from '../../../../lib/tglAdminApi'

export default function AdminColumnDetailPage() {
  const router = useRouter()
  const params = useParams<{ columnId: string }>()
  const sp = useSearchParams()

  const columnId = params.columnId
  const langParam = sp.get('lang') || 'en'
  const lang = langParam === 'en' || langParam === 'ja' ? langParam : 'en'

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  const [status, setStatus] = useState('draft')
  const [tags, setTags] = useState('')
  const [cover, setCover] = useState('')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await adminGetColumn(columnId, lang)
      setData(res)
      const c = res?.column
      if (c) {
        setStatus(c.status || 'draft')
        setTags(Array.isArray(c.tags) ? c.tags.join(', ') : '')
        setCover(c.cover_image_key || '')
        const loc = c.localizations?.[lang]
        if (loc) {
          setTitle(loc.title || '')
          setSlug(loc.slug || '')
          setExcerpt(loc.excerpt || '')
          setBodyMd(loc.body_md || '')
          setSeoTitle(loc.seo_title || '')
          setSeoDescription(loc.seo_description || '')
        }
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
  }, [columnId, lang])

  const save = async () => {
    setError(null)
    setBusy(true)
    try {
      const tagsArray = tags.split(',').map((t) => t.trim()).filter((t) => t)
      await adminUpdateColumn(columnId, {
        status,
        tags: tagsArray,
        cover: cover || null,
        localizations: {
          [lang]: {
            title,
            slug,
            excerpt: excerpt || null,
            body_md: bodyMd,
            seo_title: seoTitle || null,
            seo_description: seoDescription || null,
          },
        },
      })
      await load()
    } catch (err: any) {
      setError(err?.message || '更新に失敗しました')
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
      <h1 style={{ fontSize: '1.35rem' }}>{data?.column?.localizations?.[lang]?.title || '(loading)'}</h1>
      <div style={{ height: 10 }} />

      {error ? <div style={{ color: '#b00020', whiteSpace: 'pre-wrap' }}>{error}</div> : null}

      <div style={{ height: 12 }} />

      <section className="tglRow">
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
        <button className="tglButton" onClick={() => void save()} disabled={busy}>
          {busy ? '保存中…' : '保存'}
        </button>
      </section>
    </main>
  )
}

