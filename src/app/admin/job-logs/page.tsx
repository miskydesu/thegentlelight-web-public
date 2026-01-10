'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetchJson, clearAdminToken } from '@/lib/tglAdminApi'
import type { Country } from '@/lib/tglApi'

type JobLogItem = {
  kind: 'ai' | 'news'
  id: string
  country: Country | null
  name: string
  status: string
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  summary: string | null
  meta: any
}

type JobLogsResponse = {
  items: JobLogItem[]
  meta: { generated_at: string; limit: number; country: Country | null; kind: string }
  as_text: string
}

const COUNTRIES: Array<Country | 'all'> = ['all', 'jp', 'us', 'uk', 'ca']
const KINDS = ['all', 'ai', 'news'] as const

export default function AdminJobLogsPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [country, setCountry] = useState<Country | 'all'>('all')
  const [kind, setKind] = useState<(typeof KINDS)[number]>('all')
  const [limit, setLimit] = useState<number>(200)
  const [data, setData] = useState<JobLogsResponse | null>(null)

  const NUMERIC_STYLE: React.CSSProperties = {
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum"',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  }

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const sp = new URLSearchParams()
      sp.set('limit', String(limit))
      if (country !== 'all') sp.set('country', country)
      if (kind !== 'all') sp.set('kind', kind)
      const r = await adminFetchJson<JobLogsResponse>(`/admin/v1/job-logs?${sp.toString()}`)
      setData(r)
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

  const fmtJst = (iso: string | null | undefined) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) return '-'
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d)
  }

  const asTextJst = useMemo(() => {
    const items = data?.items || []
    const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length))
    const fmtMs = (ms: number | null) => (typeof ms === 'number' && Number.isFinite(ms) ? `${ms}ms` : '-')
    return items
      .map((r) => {
        const ts = fmtJst(r.started_at)
        const c = (r.country ?? '-').toUpperCase()
        return [
          ts,
          pad(c, 2),
          pad(r.kind, 4),
          pad(r.status, 9),
          pad(fmtMs(r.duration_ms), 10),
          r.name,
          r.summary ? `| ${r.summary}` : '',
        ]
          .filter(Boolean)
          .join(' ')
          .trim()
      })
      .join('\n')
  }, [data])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 8, fontWeight: 600, color: '#1a1a1a' }}>ジョブログ</h1>
          <div className="tglMuted">ジョブの開始/完了（DBログ）をまとめて確認できます。下のテキストはそのまま貼り付けOKです。</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="tglMuted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            country
            <select value={country} onChange={(e) => setCountry(e.target.value as any)} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)' }}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {String(c).toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="tglMuted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            kind
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)' }}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="tglMuted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            limit
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value || 0))}
              min={1}
              max={500}
              style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', width: 110 }}
            />
          </label>
          <button className="tglButton" onClick={() => void load()} disabled={busy}>
            {busy ? '読み込み中…' : '更新'}
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 14, whiteSpace: 'pre-wrap', color: '#b00020', background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: 10, padding: 12 }}>
          {error}
        </div>
      ) : null}

      <section style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>貼り付け用テキスト</h2>
          <button className="tglButton" onClick={() => void copy(asTextJst)} disabled={!asTextJst}>
            Copy
          </button>
        </div>
        <textarea
          value={asTextJst}
          readOnly
          spellCheck={false}
          style={{
            marginTop: 10,
            width: '100%',
            minHeight: 220,
            padding: 12,
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: '#fff',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace',
            fontSize: 12.5,
          }}
        />
        <div className="tglMuted" style={{ marginTop: 8, fontSize: 12 }}>
          generated_at(JST): <span style={NUMERIC_STYLE}>{data?.meta?.generated_at ? fmtJst(data.meta.generated_at) : '-'}</span>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>一覧</h2>
        {busy ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>読み込み中...</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table className="tglTable" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">started</th>
                  <th align="left">country</th>
                  <th align="left">kind</th>
                  <th align="left">status</th>
                  <th align="right">ms</th>
                  <th align="left">name</th>
                  <th align="left">summary</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      データがありません
                    </td>
                  </tr>
                ) : (
                  (data?.items || []).map((r) => (
                    <tr key={`${r.kind}:${r.id}`}>
                      <td style={NUMERIC_STYLE}>{fmtJst(r.started_at)}</td>
                      <td>{r.country ?? '-'}</td>
                      <td>{r.kind}</td>
                      <td>{r.status}</td>
                      <td align="right" style={NUMERIC_STYLE}>
                        {typeof r.duration_ms === 'number' ? r.duration_ms.toLocaleString() : '-'}
                      </td>
                      <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace', fontSize: 12.5 }}>
                        {r.name}
                      </td>
                      <td>{r.summary ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}


