'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateQuote, adminListQuoteTags, adminCheckDuplicateQuote, clearAdminToken } from '../../../../lib/tglAdminApi'

export default function AdminQuoteNewPage() {
  const router = useRouter()
  const [tags, setTags] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [isPublished, setIsPublished] = useState(true)
  const [currentLang, setCurrentLang] = useState<'en' | 'ja'>('ja') // 表示中の言語
  // 言語別のstateを管理
  const [localizations, setLocalizations] = useState<{
    en: { quoteText: string; authorName: string; sourceText: string; note: string; context: string }
    ja: { quoteText: string; authorName: string; sourceText: string; note: string; context: string }
  }>({
    en: { quoteText: '', authorName: '', sourceText: '', note: '', context: '' },
    ja: { quoteText: '', authorName: '', sourceText: '', note: '', context: '' },
  })
  const [busy, setBusy] = useState(false)
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      // selectedTagsを使う（空の場合はtags文字列からも取得）
      const tagsArray = selectedTags.length > 0 ? selectedTags : tags.split(',').map((t) => t.trim()).filter((t) => t)
      
      // jaとenの両方のlocalizationを同時に作成
      const localizationsArray = []
      
      // 日本語のlocalization（quote_textが必須）
      if (localizations.ja.quoteText.trim()) {
        localizationsArray.push({
          lang: 'ja',
          quote_text: localizations.ja.quoteText,
          author_name: localizations.ja.authorName || null,
          source_text: localizations.ja.sourceText || null,
          note: localizations.ja.note || null,
          context: localizations.ja.context || null,
        })
      }
      
      // 英語のlocalization（quote_textが必須）
      if (localizations.en.quoteText.trim()) {
        localizationsArray.push({
          lang: 'en',
          quote_text: localizations.en.quoteText,
          author_name: localizations.en.authorName || null,
          source_text: localizations.en.sourceText || null,
          note: localizations.en.note || null,
          context: localizations.en.context || null,
        })
      }
      
      if (localizationsArray.length === 0) {
        setError('日本語または英語のquote_textを入力してください')
        setBusy(false)
        return
      }

      // 重複チェック
      const duplicateCheck = await adminCheckDuplicateQuote(
        localizations.ja.quoteText.trim() || undefined,
        localizations.en.quoteText.trim() || undefined
      )

      if (duplicateCheck.is_duplicate && duplicateCheck.duplicates.length > 0) {
        const duplicateMessages = duplicateCheck.duplicates.map((dup) => {
          const locs = dup.localizations.map((loc) => `[${loc.lang}] ${loc.quote_text.substring(0, 50)}${loc.quote_text.length > 50 ? '...' : ''}`).join('\n')
          return `Quote ID: ${dup.quote_id}\n${locs}`
        }).join('\n\n')
        
        alert(`同じ名言が既に登録されています:\n\n${duplicateMessages}\n\n登録を中止します。`)
        setBusy(false)
        return
      }
      
      const res = await adminCreateQuote({
        tags: tagsArray,
        is_published: isPublished,
        localizations: localizationsArray,
      })
      router.push(`/admin/quotes/${res.quote.quote_id}?lang=ja`)
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
      setBusy(false)
    }
  }

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value)
    setSelectedTags(selected)
  }

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Link
            href="/admin/quotes"
            style={{
              color: '#6c757d',
              textDecoration: 'none',
              fontSize: '0.9rem',
              marginBottom: 8,
              display: 'inline-block',
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
          <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>New Quote</h1>
        </div>
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

      <form onSubmit={submit}>
        {/* 基本情報セクション */}
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
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>is_published</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.9rem', color: '#495057' }}>公開状態で作成する</span>
              </label>
            </label>
          </div>
        </section>

        {/* 多言語情報セクション */}
        <section
          style={{
            marginBottom: 24,
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>多言語情報</h2>
            {/* 言語切り替えタブ */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setCurrentLang('ja')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentLang === 'ja' ? '#007bff' : '#f8f9fa',
                  color: currentLang === 'ja' ? '#fff' : '#495057',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: currentLang === 'ja' ? 600 : 400,
                }}
              >
                日本語
              </button>
              <button
                type="button"
                onClick={() => setCurrentLang('en')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentLang === 'en' ? '#007bff' : '#f8f9fa',
                  color: currentLang === 'en' ? '#fff' : '#495057',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: currentLang === 'en' ? 600 : 400,
                }}
              >
                English
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>author_name ({currentLang})</span>
              <input
                value={localizations[currentLang]?.authorName || ''}
                onChange={(e) =>
                  setLocalizations({
                    ...localizations,
                    [currentLang]: { ...localizations[currentLang], authorName: e.target.value },
                  })
                }
                placeholder={currentLang === 'ja' ? '著者名（日本語）' : 'Author Name (English)'}
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
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>source_text ({currentLang})</span>
              <input
                value={localizations[currentLang]?.sourceText || ''}
                onChange={(e) =>
                  setLocalizations({
                    ...localizations,
                    [currentLang]: { ...localizations[currentLang], sourceText: e.target.value },
                  })
                }
                placeholder={currentLang === 'ja' ? '出典情報（日本語）' : 'Source Text (English)'}
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

          <div style={{ marginTop: 20 }}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>
                quote_text ({currentLang}) <span style={{ color: '#dc3545' }}>*</span>
              </span>
              <textarea
                value={localizations[currentLang]?.quoteText || ''}
                onChange={(e) =>
                  setLocalizations({
                    ...localizations,
                    [currentLang]: { ...localizations[currentLang], quoteText: e.target.value },
                  })
                }
                required
                rows={8}
                placeholder={currentLang === 'ja' ? '名言テキストを入力（日本語）...' : 'Enter quote text (English)...'}
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
          </div>

          <div style={{ marginTop: 20 }}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>note ({currentLang})</span>
              <textarea
                value={localizations[currentLang]?.note || ''}
                onChange={(e) =>
                  setLocalizations({
                    ...localizations,
                    [currentLang]: { ...localizations[currentLang], note: e.target.value },
                  })
                }
                rows={4}
                placeholder={currentLang === 'ja' ? 'メモ（任意）' : 'Note (optional)'}
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
          </div>

          <div style={{ marginTop: 20 }}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>context ({currentLang})</span>
              <textarea
                value={localizations[currentLang]?.context || ''}
                onChange={(e) =>
                  setLocalizations({
                    ...localizations,
                    [currentLang]: { ...localizations[currentLang], context: e.target.value },
                  })
                }
                rows={3}
                placeholder={currentLang === 'ja' ? '文脈（任意）。いつ/どこでの言葉か。' : 'Context (optional). When/where was this said?'}
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
          </div>
        </section>

        {/* 送信ボタン */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <Link
            href="/admin/quotes"
            style={{
              padding: '10px 20px',
              border: '1px solid #ced4da',
              backgroundColor: '#fff',
              color: '#495057',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 500,
              transition: 'background-color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa'
              e.currentTarget.style.borderColor = '#adb5bd'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff'
              e.currentTarget.style.borderColor = '#ced4da'
            }}
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '10px 20px',
              backgroundColor: busy ? '#6c757d' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: busy ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.currentTarget.style.backgroundColor = '#0056b3'
              }
            }}
            onMouseLeave={(e) => {
              if (!busy) {
                e.currentTarget.style.backgroundColor = '#007bff'
              }
            }}
          >
            {busy ? '作成中…' : '作成'}
          </button>
        </div>
      </form>
    </main>
  )
}
