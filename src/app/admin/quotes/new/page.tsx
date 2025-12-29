'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateQuote, clearAdminToken } from '../../../../lib/tglAdminApi'

export default function AdminQuoteNewPage() {
  const router = useRouter()
  const [authorName, setAuthorName] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [tags, setTags] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [lang, setLang] = useState('en')
  const [quoteText, setQuoteText] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const tagsArray = tags.split(',').map((t) => t.trim()).filter((t) => t)
      const res = await adminCreateQuote({
        author_name: authorName || null,
        source_text: sourceText || null,
        tags: tagsArray,
        is_published: isPublished,
        localizations: [
          {
            lang,
            quote_text: quoteText,
            note: note || null,
          },
        ],
      })
      router.push(`/admin/quotes/${res.quote.quote_id}?lang=${lang}`)
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
        <a href="/admin/quotes" className="tglMuted">
          ← quotes
        </a>
      </div>
      <h1 style={{ fontSize: '1.4rem' }}>New Quote</h1>
      <div style={{ height: 12 }} />

      {error ? <div style={{ color: '#b00020', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{error}</div> : null}

      <form onSubmit={submit} className="tglRow">
        <div className="tglRowTitle">基本情報</div>
        <div style={{ height: 10 }} />
        <div className="tglRowMeta" style={{ display: 'grid', gap: 10 }}>
          <label>
            <div className="tglMuted">author_name</div>
            <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} style={{ width: '100%', padding: '0.6rem' }} />
          </label>
          <label>
            <div className="tglMuted">source_text</div>
            <input value={sourceText} onChange={(e) => setSourceText(e.target.value)} style={{ width: '100%', padding: '0.6rem' }} />
          </label>
          <label>
            <div className="tglMuted">tags (カンマ区切り)</div>
            <input value={tags} onChange={(e) => setTags(e.target.value)} style={{ width: '100%', padding: '0.6rem' }} />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            <span className="tglMuted">is_published</span>
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
            <div className="tglMuted">quote_text *</div>
            <textarea value={quoteText} onChange={(e) => setQuoteText(e.target.value)} required rows={8} style={{ width: '100%', padding: '0.6rem' }} />
          </label>
          <label>
            <div className="tglMuted">note</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} style={{ width: '100%', padding: '0.6rem' }} />
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

