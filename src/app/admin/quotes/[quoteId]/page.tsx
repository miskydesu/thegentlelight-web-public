'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { adminGetQuote, adminUpdateQuote, adminGenerateQuoteEn, clearAdminToken } from '../../../../lib/tglAdminApi'

export default function AdminQuoteDetailPage() {
  const router = useRouter()
  const params = useParams<{ quoteId: string }>()
  const sp = useSearchParams()

  const quoteId = params?.quoteId || ''
  const langParam = sp?.get('lang') || 'en'
  const lang = langParam === 'en' || langParam === 'ja' ? langParam : 'en'

  const [busy, setBusy] = useState(false)
  const [generatingEn, setGeneratingEn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  const [sourceText, setSourceText] = useState('')
  const [tags, setTags] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  // 言語別のstateを管理
  const [localizations, setLocalizations] = useState<{
    en: { quoteText: string; authorName: string; sourceText: string; note: string; context: string }
    ja: { quoteText: string; authorName: string; sourceText: string; note: string; context: string }
  }>({
    en: { quoteText: '', authorName: '', sourceText: '', note: '', context: '' },
    ja: { quoteText: '', authorName: '', sourceText: '', note: '', context: '' },
  })

  const load = async () => {
    if (!quoteId) {
      setError('invalid id')
      setBusy(false)
      return
    }
    setError(null)
    setBusy(true)
    try {
      // enとjaの両方を取得
      const [resEn, resJa] = await Promise.all([
        adminGetQuote(quoteId, 'en'),
        adminGetQuote(quoteId, 'ja'),
      ])
      setData(resEn) // 表示用にenを設定
      const qEn = resEn?.quote
      const qJa = resJa?.quote
      if (qEn || qJa) {
        const q = qEn || qJa
        setTags(Array.isArray(q.tags) ? q.tags.join(', ') : '')
        setIsPublished(q.is_published !== false)
        
        // 両言語のデータを保持
        const locEn = qEn?.localizations?.en
        const locJa = qJa?.localizations?.ja
        setLocalizations({
          en: {
            quoteText: locEn?.quote_text || '',
            authorName: locEn?.author_name || qEn?.author_name || '',
            sourceText: locEn?.source_text || '',
            note: locEn?.note || '',
            context: locEn?.context || '',
          },
          ja: {
            quoteText: locJa?.quote_text || '',
            authorName: locJa?.author_name || qJa?.author_name || '',
            sourceText: locJa?.source_text || '',
            note: locJa?.note || '',
            context: locJa?.context || '',
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
      // 両言語のデータを同時に保存
      await adminUpdateQuote(quoteId, {
        tags: tagsArray,
        is_published: isPublished,
        localizations: {
          en: {
            quote_text: localizations.en.quoteText,
            author_name: localizations.en.authorName || null,
            source_text: localizations.en.sourceText || null,
            note: localizations.en.note || null,
            context: localizations.en.context || null,
          },
          ja: {
            quote_text: localizations.ja.quoteText,
            author_name: localizations.ja.authorName || null,
            source_text: localizations.ja.sourceText || null,
            note: localizations.ja.note || null,
            context: localizations.ja.context || null,
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

  const handleGenerateEn = async () => {
    if (!confirm('日本語情報から英語情報とnoteを自動生成しますか？')) return

    setError(null)
    setGeneratingEn(true)
    try {
      await adminGenerateQuoteEn(quoteId)
      await load()
      alert('英語情報の生成が完了しました')
    } catch (err: any) {
      const msg = err?.message || '英語情報の生成に失敗しました'
      if (String(msg).includes(' 401 ') || String(msg).includes(' 403 ')) {
        clearAdminToken()
        router.push('/admin/login')
        return
      }
      setError(msg)
    } finally {
      setGeneratingEn(false)
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
        {localizations[lang]?.authorName
          ? `${localizations[lang].authorName}: `
          : ''}
        {localizations[lang]?.quoteText?.substring(0, 60) || '(loading)'}
      </h1>
      <div style={{ height: 10 }} />

      {error ? <div style={{ color: '#b00020', whiteSpace: 'pre-wrap' }}>{error}</div> : null}

      <div style={{ height: 12 }} />

      {/* 言語切り替えタブ */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() => router.push(`/admin/quotes/${quoteId}?lang=ja`)}
          style={{
            padding: '8px 16px',
            backgroundColor: lang === 'ja' ? '#007bff' : '#f8f9fa',
            color: lang === 'ja' ? '#fff' : '#495057',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: lang === 'ja' ? 600 : 400,
          }}
        >
          日本語
        </button>
        <button
          onClick={() => router.push(`/admin/quotes/${quoteId}?lang=en`)}
          style={{
            padding: '8px 16px',
            backgroundColor: lang === 'en' ? '#007bff' : '#f8f9fa',
            color: lang === 'en' ? '#fff' : '#495057',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: lang === 'en' ? 600 : 400,
          }}
        >
          English
        </button>
        {lang === 'ja' && (
          <button
            className="tglButton"
            onClick={() => void handleGenerateEn()}
            disabled={generatingEn || busy}
            style={{ backgroundColor: '#28a745', borderColor: '#28a745', marginLeft: 'auto' }}
          >
            {generatingEn ? '生成中…' : '英語情報を自動生成'}
          </button>
        )}
      </div>

      <div style={{ height: 12 }} />

      <section className="tglRow">
        <div className="tglRowTitle">基本情報</div>
        <div style={{ height: 10 }} />
        <div className="tglRowMeta" style={{ display: 'grid', gap: 10 }}>
          <label>
            <div className="tglMuted">tags (カンマ区切り)</div>
            <input value={tags} onChange={(e) => setTags(e.target.value)} style={{ width: '100%', padding: '0.6rem' }} placeholder="theme:way-of-life, theme:doubt" />
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
              タグ形式: <code>prefix:value</code>（例: <code>theme:way-of-life</code>）<br />
              テーマ棚: <code>theme:way-of-life</code>, <code>theme:doubt</code>, <code>theme:time</code>, <code>theme:work</code>, <code>theme:solitude</code>, <code>theme:hope</code>
            </div>
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
            <div className="tglMuted">author_name</div>
            <input
              value={localizations[lang]?.authorName || ''}
              onChange={(e) =>
                setLocalizations({
                  ...localizations,
                  [lang]: { ...localizations[lang], authorName: e.target.value },
                })
              }
              style={{ width: '100%', padding: '0.6rem' }}
            />
          </label>
          <label>
            <div className="tglMuted">source_text</div>
            <input
              value={localizations[lang]?.sourceText || ''}
              onChange={(e) =>
                setLocalizations({
                  ...localizations,
                  [lang]: { ...localizations[lang], sourceText: e.target.value },
                })
              }
              style={{ width: '100%', padding: '0.6rem' }}
            />
          </label>
          <label>
            <div className="tglMuted">quote_text *</div>
            <textarea
              value={localizations[lang]?.quoteText || ''}
              onChange={(e) =>
                setLocalizations({
                  ...localizations,
                  [lang]: { ...localizations[lang], quoteText: e.target.value },
                })
              }
              required
              rows={8}
              style={{ width: '100%', padding: '0.6rem' }}
            />
          </label>
          <label>
            <div className="tglMuted">note</div>
            <textarea
              value={localizations[lang]?.note || ''}
              onChange={(e) =>
                setLocalizations({
                  ...localizations,
                  [lang]: { ...localizations[lang], note: e.target.value },
                })
              }
              rows={4}
              style={{ width: '100%', padding: '0.6rem' }}
            />
          </label>
          <label>
            <div className="tglMuted">context</div>
            <textarea
              value={localizations[lang]?.context || ''}
              onChange={(e) =>
                setLocalizations({
                  ...localizations,
                  [lang]: { ...localizations[lang], context: e.target.value },
                })
              }
              rows={3}
              style={{ width: '100%', padding: '0.6rem' }}
              placeholder={lang === 'ja' ? '文脈（任意）。いつ/どこでの言葉か。' : 'Context (optional). When/where was this said?'}
            />
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

