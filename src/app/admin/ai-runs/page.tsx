'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminListAiRuns, clearAdminToken } from '@/lib/tglAdminApi'

function fmt(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : String(n)
}

export default function AdminAiRunsPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runs, setRuns] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      setError(null)
      setBusy(true)
      try {
        const { runs: data } = await adminListAiRuns({ limit: 100 })
        setRuns(data)
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
    void load()
  }, [router])

  const totalRequests = runs.reduce((a, r) => a + (r.llm_requests || 0), 0)
  const totalTokens = runs.reduce((a, r) => a + (r.total_tokens || 0), 0)

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: 24, fontWeight: 600, color: '#1a1a1a' }}>AI Runs</h1>

      {error ? (
        <div
          style={{
            color: '#b00020',
            whiteSpace: 'pre-wrap',
            marginBottom: 16,
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
      ) : (
        <>
          <div className="tglMuted" style={{ marginBottom: '0.75rem' }}>
            recent: {runs.length} runs / total requests: {fmt(totalRequests)} / total tokens: {fmt(totalTokens)}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="tglTable" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">started</th>
                  <th align="left">country</th>
                  <th align="left">mode</th>
                  <th align="left">status</th>
                  <th align="right">topics</th>
                  <th align="right">auto</th>
                  <th align="right">req</th>
                  <th align="right">tokens</th>
                  <th align="left">model</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      データがありません
                    </td>
                  </tr>
                ) : (
                  runs.map((r) => (
                    <tr key={r.run_id}>
                      <td>{r.started_at ? new Date(r.started_at).toLocaleString() : '-'}</td>
                      <td>{r.country ?? '-'}</td>
                      <td>{r.mode}</td>
                      <td>{r.status}</td>
                      <td align="right">
                        {fmt(r.topics_processed)} ({fmt(r.topics_succeeded)}/{fmt(r.topics_failed)})
                      </td>
                      <td align="right">{fmt(r.auto_marked_ready)}</td>
                      <td align="right">{fmt(r.llm_requests)}</td>
                      <td align="right">{fmt(r.total_tokens)}</td>
                      <td>{r.model ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}


