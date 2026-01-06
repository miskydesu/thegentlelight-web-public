'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { adminListQuotes, adminDeleteQuote, adminListQuoteTags, clearAdminToken } from '../../../lib/tglAdminApi'

export default function AdminQuotesPage() {
  const router = useRouter()
  const [lang, setLang] = useState<string>('all') // デフォルトはすべて
  const [q, setQ] = useState('')
  const [isPublished, setIsPublished] = useState<boolean | undefined>(undefined)
  const [tag, setTag] = useState('')
  const [limit, setLimit] = useState(50)
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [meta, setMeta] = useState<{ total: number; counts?: { published: number; unpublished: number } } | null>(null)
  const [availableTags, setAvailableTags] = useState<Array<{ tag: string; tag_name_en: string | null; tag_name_jp: string | null; display_order: number | null }>>([])
  const [loadingTags, setLoadingTags] = useState(false)

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const cursor = (page - 1) * limit
      const res = await adminListQuotes(lang === 'all' ? null : lang, q.trim() || undefined, isPublished, tag.trim() || undefined, limit, cursor)
      setRows(res.quotes || [])
      setMeta({
        total: Number(res?.meta?.total ?? 0),
        counts: res?.meta?.counts ? { published: Number(res.meta.counts.published ?? 0), unpublished: Number(res.meta.counts.unpublished ?? 0) } : undefined,
      })
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
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit])

  // フィルタリング
  const filteredRows = useMemo(() => {
    return rows
  }, [rows])

  const formatDateTime = (dateTime: string | null | undefined): React.ReactNode => {
    if (!dateTime) return '-'
    const date = new Date(dateTime)
    const dateStr = date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' })
    const timeStr = date.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: 'numeric', minute: '2-digit', hour12: false })
    return (
      <>
        {dateStr}
        <br />
        {timeStr}
      </>
    )
  }

  const handleDelete = async (quoteId: string, authorName: string | null, quoteText: string | null) => {
    const displayText = authorName || quoteText?.substring(0, 30) || quoteId
    if (!confirm(`以下のQuoteを削除しますか？\n\n${displayText}\n\nこの操作は取り消せません。`)) {
      return
    }

    setError(null)
    setBusy(true)
    try {
      await adminDeleteQuote(quoteId)
      await load() // 一覧を再読み込み
    } catch (err: any) {
      const msg = err?.message || '削除に失敗しました'
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
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>Quotes 一覧</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            href="/admin/tags"
            style={{
              padding: '10px 16px',
              backgroundColor: '#6f42c1',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5a32a3'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6f42c1'
            }}
            title="タグ（Quote Tags）の管理"
          >
            タグ管理
          </Link>
          <Link
            href="/admin/quotes/new-gpt"
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#218838'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#28a745'
            }}
          >
            New Quote (GPT)和英
          </Link>
          <Link
            href="/admin/quotes/new-gpt-en"
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#218838'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#28a745'
            }}
          >
            New Quote (GPT)英和
          </Link>
          <Link
            href="/admin/quotes/new"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0056b3'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#007bff'
            }}
          >
            New Quote
          </Link>
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

      {/* フィルタ */}
      <section
        style={{
          marginBottom: 24,
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '20px',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>フィルタ</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '12px',
              backgroundColor: '#fff',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
            }}
          >
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>言語</span>
            <select
              value={lang}
              onChange={(e) => {
                setLang(e.target.value)
                setPage(1)
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="all">すべて</option>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </label>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '12px',
              backgroundColor: '#fff',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
            }}
          >
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>検索</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="著者名、名言で検索…"
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: '#fff',
              }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '12px',
              backgroundColor: '#fff',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
            }}
          >
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>公開状態</span>
            <select
              value={isPublished === undefined ? '' : String(isPublished)}
              onChange={(e) => {
                setIsPublished(e.target.value === '' ? undefined : e.target.value === 'true')
                setPage(1)
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="">すべて</option>
              <option value="true">公開済み</option>
              <option value="false">未公開</option>
            </select>
          </label>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '12px',
              backgroundColor: '#fff',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
            }}
          >
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>タグ</span>
            <select
              value={tag}
              onChange={(e) => {
                setTag(e.target.value)
                setPage(1)
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: '#fff',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              <option value="">すべて</option>
              {loadingTags ? (
                <option disabled>読み込み中...</option>
              ) : (
                availableTags
                  .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
                  .map((t) => {
                    const displayName = t.tag_name_jp
                      ? `${t.tag_name_jp}${t.tag_name_en ? ` (${t.tag_name_en})` : ''}`
                      : t.tag
                    return (
                      <option key={t.tag} value={t.tag}>
                        {displayName}
                      </option>
                    )
                  })
              )}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => void load()}
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
            {busy ? '更新中…' : '更新'}
          </button>
        </div>
      </section>

      {/* 統計情報 */}
      {meta && (
        <div
          style={{
            marginBottom: 24,
            padding: '16px 20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ color: '#495057', fontSize: '0.9rem' }}>
            合計: <span style={{ fontWeight: 700, color: '#000' }}>{meta.total}</span>件
          </div>
          {meta.counts ? (
            <>
              <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                公開: <span style={{ fontWeight: 700, color: '#000' }}>{meta.counts.published}</span>件
              </div>
              <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                未公開: <span style={{ fontWeight: 700, color: '#000' }}>{meta.counts.unpublished}</span>件
              </div>
            </>
          ) : null}
          <div style={{ color: '#495057', fontSize: '0.9rem' }}>
            表示中: <span style={{ fontWeight: 600, color: '#000' }}>{filteredRows.length}</span>件
          </div>
          <div style={{ color: '#495057', fontSize: '0.9rem' }}>
            {meta.total > 0
              ? (
                <>
                  全<span style={{ fontWeight: 700, color: '#000' }}>{meta.total}</span>件中 {Math.min((page - 1) * limit + 1, meta.total)}-
                  {Math.min(page * limit, meta.total)}件を表示
                </>
              )
              : '全0件'}
          </div>
        </div>
      )}

      {/* ページング */}
      {meta ? (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#495057', fontSize: '0.9rem' }}>表示件数</span>
            <select
              value={limit}
              onChange={(e) => {
                const v = Number(e.target.value || '50')
                setLimit(v)
                setPage(1)
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '0.9rem',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
              disabled={busy}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page === 1 || busy}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: page === 1 || busy ? '#e9ecef' : '#fff',
                color: page === 1 || busy ? '#adb5bd' : '#495057',
                cursor: page === 1 || busy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {'<<'}
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || busy}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: page === 1 || busy ? '#e9ecef' : '#fff',
                color: page === 1 || busy ? '#adb5bd' : '#495057',
                cursor: page === 1 || busy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {'<'}
            </button>
            <div style={{ color: '#495057', fontSize: '0.9rem' }}>
              {page} / {Math.max(1, Math.ceil((meta.total || 0) / limit))}
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil((meta.total || 0) / limit) || busy}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: page >= Math.ceil((meta.total || 0) / limit) || busy ? '#e9ecef' : '#fff',
                color: page >= Math.ceil((meta.total || 0) / limit) || busy ? '#adb5bd' : '#495057',
                cursor: page >= Math.ceil((meta.total || 0) / limit) || busy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {'>'}
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.max(1, Math.ceil((meta.total || 0) / limit)))}
              disabled={page >= Math.ceil((meta.total || 0) / limit) || busy}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: page >= Math.ceil((meta.total || 0) / limit) || busy ? '#e9ecef' : '#fff',
                color: page >= Math.ceil((meta.total || 0) / limit) || busy ? '#adb5bd' : '#495057',
                cursor: page >= Math.ceil((meta.total || 0) / limit) || busy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {'>>'}
            </button>
          </div>
        </div>
      ) : null}

      {/* 一覧テーブル */}
      {filteredRows.length > 0 ? (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    著者
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    名言
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    出典
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    タグ
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    公開状態
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    更新日時
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((item, index) => (
                  <tr
                    key={item.quote_id}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                      borderBottom: '1px solid #e9ecef',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e9ecef'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f8f9fa'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: '#212529' }}>
                      <div>
                        {item.localizations?.ja?.author_name || item.localizations?.en?.author_name || item.author_name || '-'}
                        {item.localizations?.ja?.author_name && item.localizations?.en?.author_name && item.localizations.ja.author_name !== item.localizations.en.author_name && (
                          <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: 4 }}>
                            ({item.localizations.en.author_name})
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: '#212529', maxWidth: '400px' }}>
                      <div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.localizations?.ja?.quote_text || item.localizations?.en?.quote_text || item.quote_text || '(no quote)'}
                        </div>
                        {item.localizations?.ja?.quote_text && item.localizations?.en?.quote_text && (
                          <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: 8, fontStyle: 'italic' }}>
                            {item.localizations.en.quote_text.substring(0, 80) + (item.localizations.en.quote_text.length > 80 ? '...' : '')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6c757d', maxWidth: '200px' }}>
                      <div>
                        {item.localizations?.ja?.source_text || item.localizations?.en?.source_text || item.source_text || '-'}
                        {item.localizations?.ja?.source_text && item.localizations?.en?.source_text && item.localizations.ja.source_text !== item.localizations.en.source_text && (
                          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: 4, fontStyle: 'italic' }}>
                            ({item.localizations.en.source_text})
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#212529' }}>
                      {item.tags && item.tags.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {item.tags.slice(0, 3).map((t: string) => (
                            <span
                              key={t}
                              style={{
                                padding: '2px 8px',
                                backgroundColor: '#e7f3ff',
                                color: '#0066cc',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                              }}
                            >
                              {t}
                            </span>
                          ))}
                          {item.tags.length > 3 && (
                            <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>+{item.tags.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.85rem' }}>
                      {item.is_published ? (
                        <span
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#d4edda',
                            color: '#155724',
                            borderRadius: '4px',
                            fontWeight: 500,
                          }}
                        >
                          公開
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#f8d7da',
                            color: '#721c24',
                            borderRadius: '4px',
                            fontWeight: 500,
                          }}
                        >
                          未公開
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.85rem', color: '#6c757d' }}>
                      {formatDateTime(item.updated_at)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <Link
                          href={`/admin/quotes/${item.quote_id}?lang=ja`}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#007bff',
                            color: '#fff',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#0056b3'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#007bff'
                          }}
                        >
                          編集
                        </Link>
                        <button
                          onClick={() => void handleDelete(item.quote_id, item.author_name, item.quote_text)}
                          disabled={busy}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: busy ? '#6c757d' : '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: busy ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!busy) {
                              e.currentTarget.style.backgroundColor = '#c82333'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!busy) {
                              e.currentTarget.style.backgroundColor = '#dc3545'
                            }
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '40px 20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center',
            color: '#6c757d',
          }}
        >
          <div style={{ fontSize: '1rem', marginBottom: 8 }}>Quotes がありません</div>
          <div style={{ fontSize: '0.9rem' }}>フィルタ条件を変えるか、新規作成してください。</div>
        </div>
      )}
    </main>
  )
}
