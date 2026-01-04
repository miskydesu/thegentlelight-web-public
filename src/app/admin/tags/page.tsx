'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { adminListQuoteTags, adminDeleteQuoteTag, clearAdminToken } from '../../../lib/tglAdminApi'

export default function AdminTagsPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tags, setTags] = useState<
    Array<{
      tag: string
      tag_name_en: string | null
      tag_name_jp: string | null
      description_en: string | null
      description_jp: string | null
      display_order: number | null
      count: number
      created_at: string
      updated_at: string
    }>
  >([])
  const [meta, setMeta] = useState<{ total_tags: number; total_quotes: number } | null>(null)
  
  // フィルタ状態
  const [q, setQ] = useState('')
  const [prefix, setPrefix] = useState('')
  const [orderBy, setOrderBy] = useState<'display_order' | 'tag' | 'count' | 'created_at'>('display_order')

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await adminListQuoteTags()
      setTags(res.tags || [])
      setMeta(res.meta || null)
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
  }, [])

  // 利用可能なprefixを抽出
  const availablePrefixes = useMemo(() => {
    const prefixes = new Set<string>()
    tags.forEach((tag) => {
      if (tag.tag.includes(':')) {
        prefixes.add(tag.tag.split(':')[0])
      }
    })
    return Array.from(prefixes).sort()
  }, [tags])

  // フィルタリングとソート
  const filteredAndSortedTags = useMemo(() => {
    let filtered = tags

    // 検索フィルタ
    if (q.trim()) {
      const query = q.trim().toLowerCase()
      filtered = filtered.filter(
        (tag) =>
          tag.tag.toLowerCase().includes(query) ||
          tag.tag_name_en?.toLowerCase().includes(query) ||
          tag.tag_name_jp?.toLowerCase().includes(query) ||
          tag.description_en?.toLowerCase().includes(query) ||
          tag.description_jp?.toLowerCase().includes(query)
      )
    }

    // prefixフィルタ
    if (prefix) {
      filtered = filtered.filter((tag) => tag.tag.startsWith(prefix + ':'))
    }

    // ソート
    const sorted = [...filtered].sort((a, b) => {
      switch (orderBy) {
        case 'display_order':
          // display_orderが設定されているものを優先、その後アルファベット順
          if (a.display_order !== null && a.display_order !== undefined) {
            if (b.display_order !== null && b.display_order !== undefined) {
              if (a.display_order !== b.display_order) return a.display_order - b.display_order
            } else {
              return -1
            }
          } else if (b.display_order !== null && b.display_order !== undefined) {
            return 1
          }
          return a.tag.localeCompare(b.tag)
        case 'tag':
          return a.tag.localeCompare(b.tag)
        case 'count':
          return b.count - a.count
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

    return sorted
  }, [tags, q, prefix, orderBy])

  const handleDelete = async (tag: string) => {
    if (!confirm(`タグ "${tag}" を削除しますか？\n（使用中のquotesからは削除されません）`)) return

    setError(null)
    setBusy(true)
    try {
      await adminDeleteQuoteTag(tag)
      await load()
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

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>Tags 一覧</h1>
        <Link
          href="/admin/tags/new"
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
          New Tag
        </Link>
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

        {/* 検索・絞り込みフィルタ */}
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>検索</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="tag名、表示名、説明で検索…"
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>Prefix</span>
            <select
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
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
              {availablePrefixes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
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
            総タグ数: <span style={{ fontWeight: 600, color: '#000' }}>{meta.total_tags}</span>
          </div>
          <div style={{ color: '#495057', fontSize: '0.9rem' }}>
            総Quote数: <span style={{ fontWeight: 600, color: '#000' }}>{meta.total_quotes}</span>
          </div>
          <div style={{ color: '#495057', fontSize: '0.9rem' }}>
            表示中: <span style={{ fontWeight: 600, color: '#000' }}>{filteredAndSortedTags.length}</span>件
          </div>
        </div>
      )}

      {/* 一覧テーブル */}
      {filteredAndSortedTags.length > 0 ? (
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
                    並び替え
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    Tag
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    表示名 (EN)
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    表示名 (JP)
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    説明 (EN)
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    説明 (JP)
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    使用数
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTags.map((item, index) => (
                  <tr
                    key={item.tag}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                      borderBottom: '1px solid #e9ecef',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e7f3ff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f8f9fa'
                    }}
                  >
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6c757d', fontSize: '0.85rem' }}>
                      {item.display_order !== null && item.display_order !== undefined ? item.display_order : '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/admin/quotes?tag=${encodeURIComponent(item.tag)}`}
                        style={{
                          color: '#007bff',
                          textDecoration: 'none',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = 'none'
                        }}
                      >
                        {item.tag}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.tag_name_en || ''}>
                      {item.tag_name_en || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.tag_name_jp || ''}>
                      {item.tag_name_jp || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description_en || ''}>
                      {item.description_en || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description_jp || ''}>
                      {item.description_jp || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: item.count > 0 ? '#d4edda' : '#e9ecef',
                          color: item.count > 0 ? '#155724' : '#495057',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                        }}
                      >
                        {item.count}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <Link
                          href={`/admin/tags/${encodeURIComponent(item.tag)}`}
                          style={{
                            padding: '4px 12px',
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
                          onClick={() => void handleDelete(item.tag)}
                          disabled={busy || item.count > 0}
                          style={{
                            padding: '4px 12px',
                            border: '1px solid #dc3545',
                            backgroundColor: item.count > 0 ? '#f5f5f5' : '#fff',
                            color: item.count > 0 ? '#999' : '#dc3545',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: item.count > 0 ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                          title={item.count > 0 ? '使用中のタグは削除できません' : '削除'}
                          onMouseEnter={(e) => {
                            if (!item.count && !busy) {
                              e.currentTarget.style.backgroundColor = '#dc3545'
                              e.currentTarget.style.color = '#fff'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!item.count && !busy) {
                              e.currentTarget.style.backgroundColor = '#fff'
                              e.currentTarget.style.color = '#dc3545'
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

          {/* フッター（並び替え） */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #e9ecef',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ color: '#495057', fontSize: '0.9rem' }}>
              全<span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#000' }}>{filteredAndSortedTags.length}</span>件を表示
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                border: '1px solid #ced4da',
              }}
            >
              <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>並び替え:</span>
              <select
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as 'display_order' | 'tag' | 'count' | 'created_at')}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#495057',
                }}
              >
                <option value="display_order">表示順（昇順）</option>
                <option value="tag">Tag名（昇順）</option>
                <option value="count">使用数（降順）</option>
                <option value="created_at">作成日時（降順）</option>
              </select>
            </label>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#6c757d',
          }}
        >
          <div style={{ fontSize: '1.1rem', marginBottom: 8 }}>タグがありません</div>
          <Link
            href="/admin/tags/new"
            style={{
              color: '#007bff',
              textDecoration: 'none',
            }}
          >
            新規タグを作成
          </Link>
        </div>
      )}
    </main>
  )
}
