'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { adminListQuoteTags, adminUpdateQuoteTag, clearAdminToken } from '../../../../lib/tglAdminApi'

export default function AdminTagEditPage() {
  const router = useRouter()
  const params = useParams<{ tag: string }>()
  const tag = decodeURIComponent(params?.tag || '')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagData, setTagData] = useState<{
    tag: string
    tag_name_en: string | null
    tag_name_jp: string | null
    description_en: string | null
    description_jp: string | null
    display_order: number | null
    count: number
    created_at: string
    updated_at: string
  } | null>(null)

  const [tagNameEn, setTagNameEn] = useState('')
  const [tagNameJp, setTagNameJp] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionJp, setDescriptionJp] = useState('')
  const [displayOrder, setDisplayOrder] = useState('')

  const load = async () => {
    if (!tag) {
      setError('invalid tag')
      setBusy(false)
      return
    }
    setError(null)
    setBusy(true)
    try {
      const res = await adminListQuoteTags()
      const found = res.tags.find((t) => t.tag === tag)
      if (found) {
        setTagData(found)
        setTagNameEn(found.tag_name_en || '')
        setTagNameJp(found.tag_name_jp || '')
        setDescriptionEn(found.description_en || '')
        setDescriptionJp(found.description_jp || '')
        setDisplayOrder(found.display_order !== null && found.display_order !== undefined ? String(found.display_order) : '')
      } else {
        setError('Tag not found')
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
  }, [tag])

  const save = async () => {
    setError(null)
    setBusy(true)
    try {
      await adminUpdateQuoteTag(tag, {
        tag_name_en: tagNameEn.trim() || null,
        tag_name_jp: tagNameJp.trim() || null,
        description_en: descriptionEn.trim() || null,
        description_jp: descriptionJp.trim() || null,
        display_order: displayOrder.trim() ? parseInt(displayOrder.trim(), 10) || null : null,
      })
      router.push('/admin/tags')
    } catch (err: any) {
      const msg = err?.message || '更新に失敗しました'
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
        <div>
          <Link
            href="/admin/tags"
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
            ← Tags 一覧
          </Link>
          <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>
            Edit Tag: <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{tag}</span>
          </h1>
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

      {tagData && (
        <form onSubmit={(e) => { e.preventDefault(); void save() }}>
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
                <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>tag</span>
                <input
                  value={tag}
                  disabled
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    backgroundColor: '#f8f9fa',
                    fontFamily: 'monospace',
                    cursor: 'not-allowed',
                    color: '#6c757d',
                  }}
                />
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: 4 }}>タグ名は変更できません</div>
              </label>

              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>tag_name_en</span>
                <input
                  value={tagNameEn}
                  onChange={(e) => setTagNameEn(e.target.value)}
                  placeholder="Tag Name (English)"
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
                <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>tag_name_jp</span>
                <input
                  value={tagNameJp}
                  onChange={(e) => setTagNameJp(e.target.value)}
                  placeholder="タグ名（日本語）"
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
                <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>display_order</span>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  placeholder="例: 1"
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
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: 4 }}>小さい数字が先に表示されます</div>
              </label>

              {tagData.count > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#d4edda',
                    borderRadius: '4px',
                    border: '1px solid #c3e6cb',
                    color: '#155724',
                    fontSize: '0.9rem',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>使用中:</span>
                  <span style={{ marginLeft: 8 }}>{tagData.count}件のQuoteで使用されています</span>
                </div>
              )}
            </div>
          </section>

          {/* 説明セクション */}
          <section
            style={{
              marginBottom: 24,
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '20px',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>説明</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>description_en</span>
                <textarea
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  rows={4}
                  placeholder="Description (English)"
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
                <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>description_jp</span>
                <textarea
                  value={descriptionJp}
                  onChange={(e) => setDescriptionJp(e.target.value)}
                  rows={4}
                  placeholder="説明（日本語）"
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
              href="/admin/tags"
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
              {busy ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      )}
    </main>
  )
}
