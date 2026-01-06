'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateQuoteWithGptEn, adminListQuoteTags, adminCheckDuplicateQuote, clearAdminToken } from '../../../../lib/tglAdminApi'

export default function AdminQuoteNewGptEnPage() {
  const router = useRouter()
  const [tags, setTags] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [isPublished, setIsPublished] = useState(true)
  const [quoteTextEn, setQuoteTextEn] = useState('')
  const [authorNameEn, setAuthorNameEn] = useState('')
  const [sourceTextEn, setSourceTextEn] = useState('')
  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loadingTags, setLoadingTags] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTags = async () => {
      setLoadingTags(true)
      try {
        const res = await adminListQuoteTags()
        setAvailableTags(res.tags || [])
      } catch (err: any) {
        console.error('Failed to load tags:', err)
      } finally {
        setLoadingTags(false)
      }
    }
    void loadTags()
  }, [])

  useEffect(() => {
    // selectedTagsが変更されたら、tags文字列を更新
    setTags(selectedTags.join(','))
  }, [selectedTags])

  const handleGenerateAndCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quoteTextEn.trim()) {
      setError('名言本文（英語）を入力してください')
      return
    }

    setError(null)
    setGenerating(true)
    setBusy(true)

    try {
      // 重複チェック（英語のquote_textのみ）
      const duplicateCheck = await adminCheckDuplicateQuote(undefined, quoteTextEn.trim() || undefined)

      if (duplicateCheck.is_duplicate && duplicateCheck.duplicates.length > 0) {
        const duplicateMessages = duplicateCheck.duplicates.map((dup) => {
          const locs = dup.localizations.map((loc) => `[${loc.lang}] ${loc.quote_text.substring(0, 50)}${loc.quote_text.length > 50 ? '...' : ''}`).join('\n')
          return `Quote ID: ${dup.quote_id}\n${locs}`
        }).join('\n\n')
        
        alert(`同じ名言が既に登録されています:\n\n${duplicateMessages}\n\n登録を中止します。`)
        setGenerating(false)
        setBusy(false)
        return
      }

      // GPT生成とQuote作成を1回で実行（ja/en両方が確実に作成される）
      // selectedTagsを使う（空の場合はtags文字列からも取得）
      const tagsArray = selectedTags.length > 0 ? selectedTags : tags.split(',').map((t) => t.trim()).filter((t) => t)
      const res = await adminCreateQuoteWithGptEn({
        tags: tagsArray,
        is_published: isPublished,
        quote_text_en: quoteTextEn,
        author_name_en: authorNameEn || null,
        source_text_en: sourceTextEn || null,
        author_name: authorNameEn || null,
      })

      const quoteId = res.quote.quote_id

      // 編集ページにリダイレクト
      router.push(`/admin/quotes/${quoteId}?lang=en`)
    } catch (err: any) {
      let msg = err?.message || '作成に失敗しました'
      
      // ネットワークエラーの場合、より分かりやすいメッセージに変換
      if (msg.includes('APIサーバーに接続できません') || msg.includes('ERR_CONNECTION_REFUSED') || msg.includes('Failed to fetch')) {
        msg = 'APIサーバーに接続できません。APIサーバーが起動しているか確認してください。'
      }
      
      if (String(msg).includes(' 401 ') || String(msg).includes(' 403 ')) {
        clearAdminToken()
        router.push('/admin/login')
        return
      }
      setError(msg)
    } finally {
      setGenerating(false)
      setBusy(false)
    }
  }

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value)
    setSelectedTags(selected)
  }

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/admin/quotes"
          style={{
            color: '#007bff',
            textDecoration: 'none',
            fontSize: '0.9rem',
            display: 'inline-block',
            marginBottom: '16px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none'
          }}
        >
          ← Quotes 一覧
        </Link>
        <h1 style={{ fontSize: '1.8rem', margin: '0 0 24px 0', fontWeight: 600, color: '#1a1a1a' }}>
          New Quote (GPT)英和
        </h1>
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
          }}
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={handleGenerateAndCreate}>
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
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>基本情報</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>
                tags <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>（Ctrl/Cmd+クリックで複数選択）</span>
              </span>
              <select
                multiple
                value={selectedTags}
                onChange={handleTagChange}
                size={8}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: '#fff',
                  transition: 'border-color 0.2s',
                  minHeight: '160px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#007bff'
                  e.currentTarget.style.outline = 'none'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#ced4da'
                }}
              >
                {loadingTags ? (
                  <option disabled>読み込み中...</option>
                ) : availableTags.length === 0 ? (
                  <option disabled>タグがありません</option>
                ) : (
                  availableTags
                    .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
                    .map((tag) => {
                      const displayName = tag.tag_name_jp
                        ? `${tag.tag_name_jp}${tag.tag_name_en ? ` (${tag.tag_name_en})` : ''}`
                        : tag.tag
                      return (
                        <option key={tag.tag} value={tag.tag}>
                          {displayName}
                        </option>
                      )
                    })
                )}
              </select>
              {selectedTags.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: 4 }}>
                  選択中: {selectedTags.length}個
                </div>
              )}
              <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: 4 }}>
                タグ形式: <code style={{ backgroundColor: '#f8f9fa', padding: '2px 4px', borderRadius: '3px' }}>prefix:value</code>
                （例: <code style={{ backgroundColor: '#f8f9fa', padding: '2px 4px', borderRadius: '3px' }}>theme:kindness</code>）
              </div>
            </label>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>公開状態</span>
              <select
                value={isPublished ? 'true' : 'false'}
                onChange={(e) => setIsPublished(e.target.value === 'true')}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#007bff'
                  e.currentTarget.style.outline = 'none'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#ced4da'
                }}
              >
                <option value="true">公開</option>
                <option value="false">下書き</option>
              </select>
            </label>
          </div>
        </section>

        {/* 英語情報（GPT生成用） */}
        <section
          style={{
            marginBottom: 24,
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '20px',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>
            英語情報（GPTで日本語情報を生成します）
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>
                名言本文（英語） <span style={{ color: '#dc3545' }}>*</span>
              </span>
              <textarea
                value={quoteTextEn}
                onChange={(e) => setQuoteTextEn(e.target.value)}
                required
                rows={6}
                placeholder="Enter quote text (English)"
                style={{
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: '#fff',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#007bff'
                  e.currentTarget.style.outline = 'none'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#ced4da'
                }}
              />
            </label>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>著者名（英語）</span>
              <input
                value={authorNameEn}
                onChange={(e) => setAuthorNameEn(e.target.value)}
                placeholder="Enter author name (English)"
                style={{
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: '#fff',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#007bff'
                  e.currentTarget.style.outline = 'none'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#ced4da'
                }}
              />
            </label>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>出典（英語）</span>
              <input
                value={sourceTextEn}
                onChange={(e) => setSourceTextEn(e.target.value)}
                placeholder="Enter source information (English)"
                style={{
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: '#fff',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#007bff'
                  e.currentTarget.style.outline = 'none'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#ced4da'
                }}
              />
            </label>
          </div>
        </section>

        {/* 送信ボタン */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <Link
            href="/admin/quotes"
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5a6268'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6c757d'
            }}
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={busy || generating}
            style={{
              padding: '10px 20px',
              backgroundColor: busy || generating ? '#6c757d' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: busy || generating ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!busy && !generating) {
                e.currentTarget.style.backgroundColor = '#218838'
              }
            }}
            onMouseLeave={(e) => {
              if (!busy && !generating) {
                e.currentTarget.style.backgroundColor = '#28a745'
              }
            }}
          >
            {generating ? 'GPT生成中…' : busy ? '作成中…' : 'GPTで生成して作成'}
          </button>
        </div>
      </form>
    </main>
  )
}
