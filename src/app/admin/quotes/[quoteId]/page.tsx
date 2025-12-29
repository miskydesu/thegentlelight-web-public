'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { adminGetQuote, adminUpdateQuote, clearAdminToken } from '../../../../lib/tglAdminApi'

export default function AdminQuoteDetailPage() {
  const router = useRouter()
  const params = useParams<{ quoteId: string }>()
  const sp = useSearchParams()

  const quoteId = params.quoteId
  const langParam = sp.get('lang') || 'en'
  const lang = langParam === 'en' || langParam === 'ja' ? langParam : 'en'

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  const [authorName, setAuthorName] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [tags, setTags] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [quoteText, setQuoteText] = useState('')
  const [note, setNote] = useState('')

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await adminGetQuote(quoteId, lang)
      setData(res)
      const q = res?.quote
      if (q) {
        setAuthorName(q.author_name || '')
        setSourceText(q.source_text || '')
        setTags(Array.isArray(q.tags) ? q.tags.join(', ') : '')
        setIsPublished(q.is_published !== false)
        const loc = q.localizations?.[lang]
        if (loc) {
          setQuoteText(loc.quote_text || '')
          setNote(loc.note || '')
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
  }, [quoteId, lang])

  const save = async () => {
    setError(null)
    setBusy(true)
    try {
      const tagsArray = tags.split(',').map((t) => t.trim()).filter((t) => t)
      await adminUpdateQuote(quoteId, {
        author_name: authorName || null,
        source_text: sourceText || null,
        tags: tagsArray,
        is_published: isPublished,
        localizations: {
          [lang]: {
            quote_text: quoteText,
            note: note || null,
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
        <a href="/admin/quotes" className="tglMuted">
          ← quotes
        </a>
      </div>
      <h1 style={{ fontSize: '1.35rem' }}>
        {data?.quote?.author_name ? `${data.quote.author_name}: ` : ''}
        {data?.quote?.localizations?.[lang]?.quote_text?.substring(0, 60) || '(loading)'}
      </h1>
      <div style={{ height: 10 }} />

      {error ? <div style={{ color: '#b00020', whiteSpace: 'pre-wrap' }}>{error}</div> : null}

      <div style={{ height: 12 }} />

      <section className="tglRow">
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
            <div className="tglMuted">quote_text *</div>
            <textarea value={quoteText} onChange={(e) => setQuoteText(e.target.value)} required rows={8} style={{ width: '100%', padding: '0.6rem' }} />
          </label>
          <label>
            <div className="tglMuted">note</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} style={{ width: '100%', padding: '0.6rem' }} />
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

