'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetchJson, clearAdminToken } from '../../lib/tglAdminApi'

export default function AdminPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any | null>(null)

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const data = await adminFetchJson<any>('/admin/v1/dashboard/stats')
      setStats(data)
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

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>管理ホーム</h1>
        <button
          onClick={() => void load()}
          disabled={busy}
          style={{
            padding: '8px 16px',
            fontSize: '0.9rem',
            backgroundColor: busy ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            transition: 'background-color 0.2s',
            boxShadow: busy ? 'none' : '0 2px 4px rgba(0,123,255,0.2)',
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
          {busy ? '更新中...' : '更新'}
        </button>
      </div>

      {error ? (
        <div
          style={{
            color: '#b00020',
            whiteSpace: 'pre-wrap',
            marginBottom: 20,
            padding: '12px 16px',
            backgroundColor: '#ffebee',
            borderRadius: '6px',
            border: '1px solid #ffcdd2',
          }}
        >
          {error}
        </div>
      ) : null}

      {busy ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>読み込み中...</div>
      ) : stats ? (
        <>
          {/* 要約未生成数（TOTALと各国別をテーブル形式で表示） */}
          <section
            style={{
              marginBottom: 32,
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>要約未生成</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.95rem',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#495057',
                        fontSize: '0.9rem',
                        backgroundColor: '#e9ecef',
                      }}
                    >
                      項目
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#495057',
                        fontSize: '0.9rem',
                        backgroundColor: '#fff3cd',
                      }}
                    >
                      TOTAL
                    </th>
                    {stats.countries?.map((c: any) => (
                      <th
                        key={c.country}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#495057',
                          fontSize: '0.9rem',
                        }}
                      >
                        {c.country.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* 未評価行 */}
                  <tr
                    style={{
                      backgroundColor: '#fff',
                      borderBottom: '1px solid #e9ecef',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e7f3ff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff'
                    }}
                  >
                    <td
                      style={{
                        padding: '12px 16px',
                        fontWeight: 500,
                        color: '#212529',
                        backgroundColor: '#f8f9fa',
                      }}
                    >
                      未評価
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        color: '#856404',
                        fontSize: '1rem',
                        fontWeight: 600,
                        backgroundColor: '#fff3cd',
                      }}
                    >
                      {stats.total?.unevaluated ?? 0}
                    </td>
                    {stats.countries?.map((c: any, index: number) => (
                      <td
                        key={c.country}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          color: '#495057',
                          backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                        }}
                      >
                        {c.unevaluated ?? 0}
                      </td>
                    ))}
                  </tr>
                  {/* 要約待ち（評価済み）行 */}
                  <tr
                    style={{
                      backgroundColor: '#f8f9fa',
                      borderBottom: '1px solid #e9ecef',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e7f3ff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa'
                    }}
                  >
                    <td
                      style={{
                        padding: '12px 16px',
                        fontWeight: 500,
                        color: '#212529',
                        backgroundColor: '#f1f3f5',
                      }}
                    >
                      要約待ち（評価済み）
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        color: '#856404',
                        fontSize: '1rem',
                        fontWeight: 600,
                        backgroundColor: '#fff3cd',
                      }}
                    >
                      {stats.total?.pendingSummary ?? 0}
                    </td>
                    {stats.countries?.map((c: any, index: number) => (
                      <td
                        key={c.country}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          color: '#495057',
                          backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#fff',
                        }}
                      >
                        {c.pendingSummary ?? 0}
                      </td>
                    ))}
                  </tr>
                  {/* 合計行 */}
                  <tr
                    style={{
                      backgroundColor: '#fff3cd',
                      fontWeight: 600,
                      borderTop: '2px solid #ffc107',
                      borderBottom: '2px solid #ffc107',
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#856404',
                        fontSize: '1rem',
                        backgroundColor: '#ffeaa7',
                      }}
                    >
                      合計
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        color: '#856404',
                        fontSize: '1.05rem',
                        backgroundColor: '#ffeaa7',
                      }}
                    >
                      {(stats.total?.unevaluated ?? 0) + (stats.total?.pendingSummary ?? 0)}
                    </td>
                    {stats.countries?.map((c: any) => (
                      <td
                        key={c.country}
                        style={{
                          padding: '14px 16px',
                          textAlign: 'right',
                          color: '#856404',
                          fontSize: '1.05rem',
                          backgroundColor: '#fff3cd',
                        }}
                      >
                        {(c.unevaluated ?? 0) + (c.pendingSummary ?? 0)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* failed日報 */}
          <section
            style={{
              marginBottom: 32,
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>失敗した日報</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.95rem',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#495057',
                        fontSize: '0.9rem',
                        backgroundColor: '#e9ecef',
                      }}
                    >
                      項目
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#495057',
                        fontSize: '0.9rem',
                        backgroundColor: '#f8d7da',
                      }}
                    >
                      TOTAL
                    </th>
                    {stats.countries?.map((c: any) => (
                      <th
                        key={c.country}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#495057',
                          fontSize: '0.9rem',
                        }}
                      >
                        {c.country.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* 件数行 */}
                  <tr
                    style={{
                      backgroundColor: '#f8d7da',
                      fontWeight: 600,
                      borderTop: '2px solid #dc3545',
                      borderBottom: '2px solid #dc3545',
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#721c24',
                        fontSize: '1rem',
                        backgroundColor: '#f5c6cb',
                      }}
                    >
                      件数
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        color: '#721c24',
                        fontSize: '1.05rem',
                        backgroundColor: '#f5c6cb',
                      }}
                    >
                      {stats.total?.failedDailyCount ?? 0}
                    </td>
                    {stats.countries?.map((c: any) => {
                      const hasFailed = (c.failedDailyCount ?? 0) > 0
                      return (
                        <td
                          key={c.country}
                          style={{
                            padding: '14px 16px',
                            textAlign: 'right',
                            color: hasFailed ? '#dc3545' : '#495057',
                            fontSize: hasFailed ? '1.05rem' : '1rem',
                            fontWeight: hasFailed ? 600 : 400,
                            backgroundColor: '#f8d7da',
                          }}
                        >
                          {c.failedDailyCount ?? 0}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            {/* 詳細リスト */}
            {stats.failed_daily_digests?.length > 0 && (
              <div style={{ padding: '16px 20px', backgroundColor: '#fff3cd', borderTop: '1px solid #ffc107' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 12, fontWeight: 600, color: '#856404' }}>詳細（最新10件）</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {stats.failed_daily_digests.map((d: any) => (
                    <div
                      key={d.daily_id}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        padding: '8px 12px',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        border: '1px solid #ffc107',
                      }}
                    >
                      <span
                        className="tglPill"
                        style={{
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        {d.country.toUpperCase()}
                      </span>
                      <span style={{ fontWeight: 500, color: '#212529' }}>{d.date_local}</span>
                      {d.generated_at ? (
                        <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                          {new Date(d.generated_at).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 最近の監査ログ */}
          <section
            style={{
              marginBottom: 32,
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>最近の監査ログ</h2>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {stats.recent_audit_logs?.length > 0 ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {stats.recent_audit_logs.map((log: any, index: number) => (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        padding: '10px 12px',
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                        borderRadius: '4px',
                        border: '1px solid #e9ecef',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e7f3ff'
                        e.currentTarget.style.borderColor = '#007bff'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f8f9fa'
                        e.currentTarget.style.borderColor = '#e9ecef'
                      }}
                    >
                      <span style={{ color: '#6c757d', fontSize: '0.9rem', minWidth: '160px' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      <span
                        className="tglPill"
                        style={{
                          backgroundColor: '#007bff',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                        }}
                      >
                        {log.action}
                      </span>
                      <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>{log.target_type}</span>
                      {log.target_id ? (
                        <Link
                          href={`/admin/topics/${log.target_id}`}
                          style={{
                            color: '#007bff',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none'
                          }}
                        >
                          {log.target_id.slice(0, 8)}...
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>なし</div>
              )}
            </div>
          </section>

          <div style={{ height: 20 }} />
          <div className="tglRow">
            <div className="tglRowTitle">その他の操作</div>
            <div className="tglRowMeta">
              <Link href="/admin/topics">Topics 一覧</Link>
              <span className="tglMuted">|</span>
              <Link href="/admin/columns">Columns 一覧</Link>
              <span className="tglMuted">|</span>
              <Link href="/admin/quotes">Quotes 一覧</Link>
            </div>
          </div>
        </>
      ) : null}
    </main>
  )
}

