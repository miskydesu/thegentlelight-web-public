'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { COUNTRIES, type Country } from '../../../lib/tglApi'
import { adminListTopics, clearAdminToken } from '../../../lib/tglAdminApi'

export default function AdminTopicsPage() {
  const router = useRouter()
  const [selectedCountries, setSelectedCountries] = useState<Country[]>(['us', 'uk', 'ca', 'jp']) // デフォルトは全選択
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [aiStatus, setAiStatus] = useState('')
  const [aiError, setAiError] = useState('')
  const [importanceTier, setImportanceTier] = useState<string[]>(['S', 'A', 'B', 'C'])
  const [confidenceTier, setConfidenceTier] = useState<string[]>(['S', 'A', 'B', 'C'])
  const [glScoreMin, setGlScoreMin] = useState(0)
  const [heartScoreMin, setHeartScoreMin] = useState(0)
  const [orderBy, setOrderBy] = useState<'updated_at' | 'created_at' | 'gentle_light_score' | 'heartwarming_score'>('updated_at')
  const [limit, setLimit] = useState(20)
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)

  const formatAiStatus = (status: string | null | undefined): string => {
    const s = String(status || '')
    if (s === 'ready') return '要約完了'
    if (s === 'pending') return '要約待ち'
    if (s === 'skipped') return 'スキップ'
    if (s === 'failed') return '失敗'
    return s || '-'
  }

  const formatTier = (tier: string | null | undefined): string => {
    return tier || '-'
  }

  const getCountryTimezone = (country: string): string => {
    switch (country) {
      case 'us':
        return 'America/New_York'
      case 'ca':
        return 'America/Toronto'
      case 'uk':
        return 'Europe/London'
      case 'jp':
        return 'Asia/Tokyo'
      default:
        return 'Asia/Tokyo' // デフォルトは日本時間
    }
  }

  const formatLastSeenAt = (lastSeenAt: string | null | undefined, country: string): React.ReactNode => {
    if (!lastSeenAt) return '-'
    const timezone = getCountryTimezone(country)
    const date = new Date(lastSeenAt)
    // タイムゾーン変換のために、一度UTCで取得してからタイムゾーンで変換
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(date)
    const year = parts.find((p) => p.type === 'year')?.value
    const month = parts.find((p) => p.type === 'month')?.value
    const day = parts.find((p) => p.type === 'day')?.value
    const hour = parts.find((p) => p.type === 'hour')?.value
    const minute = parts.find((p) => p.type === 'minute')?.value
    return (
      <>
        {year}/{month}/{day}
        <br />
        {hour}:{minute} {country}
      </>
    )
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

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      // 全ての国が選択されている場合は'all'、それ以外は最初の国を渡す（暫定）
      const countryParam = selectedCountries.length === COUNTRIES.length ? 'all' : selectedCountries[0] || 'all'
      const cursor = (page - 1) * limit
      const res = await adminListTopics(
        countryParam as any,
        q.trim(),
        category.trim(),
        aiStatus.trim(),
        aiError.trim(),
        orderBy,
        limit,
        cursor,
        importanceTier,
        confidenceTier,
        glScoreMin,
        heartScoreMin
      )
      setRows(res.topics || [])
      setTotalCount(res.meta?.total_count ?? null)
    } catch (err: any) {
      const msg = err?.message || '取得に失敗しました'
      // 401/403 の場合はログインへ
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
    setPage(1) // フィルタ変更時は1ページ目に戻す
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountries, orderBy, q, category, aiStatus, aiError, importanceTier, confidenceTier, glScoreMin, heartScoreMin])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit])

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>Topics 一覧</h1>
        <Link
          href="/admin/login"
          style={{
            color: '#6c757d',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          ログインへ →
        </Link>
      </div>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>国</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {COUNTRIES.map((c) => (
                <label key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(c.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCountries([...selectedCountries, c.code])
                      } else {
                        setSelectedCountries(selectedCountries.filter((code) => code !== c.code))
                      }
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#495057' }}>{c.label}</span>
                </label>
              ))}
            </div>
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>タイトル</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="タイトル検索…"
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>カテゴリ</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
              <option value="heartwarming">heartwarming</option>
              <option value="politics">politics</option>
              <option value="business">business</option>
              <option value="technology">technology</option>
              <option value="health">health</option>
              <option value="science_earth">science_earth</option>
              <option value="arts">arts</option>
              <option value="sports">sports</option>
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>AI状態(要約状態)</span>
            <select
              value={aiStatus}
              onChange={(e) => setAiStatus(e.target.value)}
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
              <option value="ready">要約完了</option>
              <option value="pending">要約待ち</option>
              <option value="skipped">スキップ</option>
              <option value="failed">失敗</option>
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>重要Tier</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {['S', 'A', 'B', 'C'].map((tier) => (
                <label key={tier} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={importanceTier.includes(tier)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setImportanceTier([...importanceTier, tier])
                      } else {
                        setImportanceTier(importanceTier.filter((t) => t !== tier))
                      }
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#495057' }}>{tier}</span>
                </label>
              ))}
            </div>
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>信頼Tier</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {['S', 'A', 'B', 'C'].map((tier) => (
                <label key={tier} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={confidenceTier.includes(tier)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setConfidenceTier([...confidenceTier, tier])
                      } else {
                        setConfidenceTier(confidenceTier.filter((t) => t !== tier))
                      }
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#495057' }}>{tier}</span>
                </label>
              ))}
            </div>
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>GL Score</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={glScoreMin}
                onChange={(e) => setGlScoreMin(Number(e.target.value) || 0)}
                min="0"
                max="100"
                placeholder="0"
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  width: '80px',
                  backgroundColor: '#fff',
                }}
              />
              <span style={{ color: '#6c757d', fontSize: '0.85rem' }}>以上</span>
            </div>
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>Heart Score</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={heartScoreMin}
                onChange={(e) => setHeartScoreMin(Number(e.target.value) || 0)}
                min="0"
                max="100"
                placeholder="0"
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  width: '80px',
                  backgroundColor: '#fff',
                }}
              />
              <span style={{ color: '#6c757d', fontSize: '0.85rem' }}>以上</span>
            </div>
          </label>
        </div>
        
        {/* 更新ボタン */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e9ecef' }}>
          <button
            onClick={() => void load()}
            disabled={busy}
            style={{
              padding: '10px 20px',
              backgroundColor: busy ? '#ccc' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              fontSize: '0.9rem',
              minWidth: '100px',
            }}
          >
            {busy ? '更新中…' : '更新'}
          </button>
        </div>
        {error ? (
          <div
            style={{
              marginTop: 16,
              color: '#b00020',
              whiteSpace: 'pre-wrap',
              padding: '12px 16px',
              backgroundColor: '#ffebee',
              borderRadius: '6px',
              border: '1px solid #ffcdd2',
            }}
          >
            {error}
          </div>
        ) : null}
      </section>

      {/* テーブル */}
      {rows.length ? (
        <section
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          {/* ページング（上側） */}
          {totalCount !== null && totalCount > 0 && (
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #e9ecef',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                  全<span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#000' }}>{totalCount}</span>件中 {Math.min((page - 1) * limit + 1, totalCount)}-{Math.min(page * limit, totalCount)}件を表示
                </div>
                
                {/* 並び替え */}
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
                    onChange={(e) => setOrderBy(e.target.value as 'updated_at' | 'created_at' | 'gentle_light_score' | 'heartwarming_score')}
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
                    <option value="updated_at">更新日時（降順）</option>
                    <option value="created_at">作成日時（降順）</option>
                    <option value="gentle_light_score">GL Score（降順）</option>
                    <option value="heartwarming_score">Heart Score（降順）</option>
                  </select>
                </label>
                
                {/* 表示件数 */}
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
                  <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>表示件数:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value))
                      setPage(1) // 件数変更時は1ページ目に戻す
                    }}
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
                    <option value="10">10件</option>
                    <option value="20">20件</option>
                    <option value="50">50件</option>
                    <option value="100">100件</option>
                    <option value="500">500件</option>
                    <option value="1000">1000件</option>
                  </select>
                </label>
              </div>
              
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1 || busy}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: page === 1 || busy ? '#e9ecef' : '#fff',
                    color: page === 1 || busy ? '#adb5bd' : '#495057',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    cursor: page === 1 || busy ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  最初
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || busy}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: page === 1 || busy ? '#e9ecef' : '#fff',
                    color: page === 1 || busy ? '#adb5bd' : '#495057',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    cursor: page === 1 || busy ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  前へ
                </button>
                <span style={{ color: '#495057', fontSize: '0.9rem', minWidth: '80px', textAlign: 'center' }}>
                  {page} / {Math.ceil(totalCount / limit)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(totalCount / limit) || busy}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: page >= Math.ceil(totalCount / limit) || busy ? '#e9ecef' : '#fff',
                    color: page >= Math.ceil(totalCount / limit) || busy ? '#adb5bd' : '#495057',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    cursor: page >= Math.ceil(totalCount / limit) || busy ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  次へ
                </button>
                <button
                  onClick={() => setPage(Math.ceil(totalCount / limit))}
                  disabled={page >= Math.ceil(totalCount / limit) || busy}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: page >= Math.ceil(totalCount / limit) || busy ? '#e9ecef' : '#fff',
                    color: page >= Math.ceil(totalCount / limit) || busy ? '#adb5bd' : '#495057',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    cursor: page >= Math.ceil(totalCount / limit) || busy ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  最後
                </button>
              </div>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    Topic ID
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    国
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    カテゴリ
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem', minWidth: '100px' }}>
                    AI状態
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    タイトル
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    重要
                    <br />
                    Tier
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    信頼
                    <br />
                    Tier
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    GL
                    <br />
                    Score
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    Heart
                    <br />
                    Score
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    悲惨度
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    刺激度
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    記事時間
                    <br />
                    (対象国時間)
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    作成日時
                    <br />
                    (日本時間)
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    更新日時
                    <br />
                    (日本時間)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t: any, index: number) => (
                  <tr
                    key={t.topic_id}
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
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/admin/topics/${t.topic_id}${selectedCountries.length === 1 ? `?country=${selectedCountries[0]}` : `?country=${t.country}`}`}
                        style={{
                          color: '#007bff',
                          textDecoration: 'none',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = 'none'
                        }}
                      >
                        {t.topic_id.slice(0, 12)}...
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{t.country.toUpperCase()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: '#e9ecef',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                        }}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', minWidth: '100px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          backgroundColor:
                            t.ai_status === 'ready'
                              ? '#d4edda'
                              : t.ai_status === 'pending'
                                ? '#fff3cd'
                                : t.ai_status === 'failed'
                                  ? '#f8d7da'
                                  : '#e9ecef',
                          color:
                            t.ai_status === 'ready'
                              ? '#155724'
                              : t.ai_status === 'pending'
                                ? '#856404'
                                : t.ai_status === 'failed'
                                  ? '#721c24'
                                  : '#495057',
                        }}
                      >
                        {formatAiStatus(t.ai_status)}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        maxWidth: '400px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={t.title}
                    >
                      {t.title}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                      {formatTier(t.topic_importance_tier)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                      {formatTier(t.topic_confidence_tier)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {t.gentle_light_score !== null ? t.gentle_light_score : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {t.heartwarming_score !== null ? t.heartwarming_score : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {t.distress_score !== null ? t.distress_score : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {t.high_arousal ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: '#fff3cd',
                            color: '#856404',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                          }}
                        >
                          高
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: '#e9ecef',
                            color: '#495057',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                          }}
                        >
                          低
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6c757d', fontSize: '0.85rem' }}>
                      {formatLastSeenAt(t.last_seen_at, t.country)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6c757d', fontSize: '0.85rem' }}>
                      {formatDateTime(t.created_at)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6c757d', fontSize: '0.85rem' }}>
                      {formatDateTime(t.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* ページング */}
          {totalCount !== null && totalCount > 0 && (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                  全<span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#000' }}>{totalCount}</span>件中 {Math.min((page - 1) * limit + 1, totalCount)}-{Math.min(page * limit, totalCount)}件を表示
                </div>
                
                {/* 並び替え */}
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
                    onChange={(e) => setOrderBy(e.target.value as 'updated_at' | 'created_at' | 'gentle_light_score' | 'heartwarming_score')}
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
                    <option value="updated_at">更新日時（降順）</option>
                    <option value="created_at">作成日時（降順）</option>
                    <option value="gentle_light_score">GL Score（降順）</option>
                    <option value="heartwarming_score">Heart Score（降順）</option>
                  </select>
                </label>
                
                {/* 表示件数 */}
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
                  <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>表示件数:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value))
                      setPage(1) // 件数変更時は1ページ目に戻す
                    }}
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
                    <option value="10">10件</option>
                    <option value="20">20件</option>
                    <option value="50">50件</option>
                    <option value="100">100件</option>
                    <option value="500">500件</option>
                    <option value="1000">1000件</option>
                  </select>
                </label>
              </div>
              
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1 || busy}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: page === 1 || busy ? '#e9ecef' : '#fff',
                    color: page === 1 || busy ? '#adb5bd' : '#495057',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    cursor: page === 1 || busy ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  最初
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || busy}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: page === 1 || busy ? '#e9ecef' : '#fff',
                    color: page === 1 || busy ? '#adb5bd' : '#495057',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    cursor: page === 1 || busy ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  前へ
                </button>
                <span style={{ color: '#495057', fontSize: '0.9rem', minWidth: '80px', textAlign: 'center' }}>
                  {page} / {Math.ceil(totalCount / limit)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(totalCount / limit) || busy}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: page >= Math.ceil(totalCount / limit) || busy ? '#e9ecef' : '#fff',
                    color: page >= Math.ceil(totalCount / limit) || busy ? '#adb5bd' : '#495057',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    cursor: page >= Math.ceil(totalCount / limit) || busy ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  次へ
                </button>
                <button
                  onClick={() => setPage(Math.ceil(totalCount / limit))}
                  disabled={page >= Math.ceil(totalCount / limit) || busy}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: page >= Math.ceil(totalCount / limit) || busy ? '#e9ecef' : '#fff',
                    color: page >= Math.ceil(totalCount / limit) || busy ? '#adb5bd' : '#495057',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    cursor: page >= Math.ceil(totalCount / limit) || busy ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  最後
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            color: '#6c757d',
          }}
        >
          Topics がありません。フィルタ条件を変えるか、ジョブ実行後に再読み込みしてください。
        </div>
      )}
    </main>
  )
}


