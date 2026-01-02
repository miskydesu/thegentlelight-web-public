import { adminListAiRuns } from '@/lib/tglAdminApi'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : String(n)
}

export default async function AdminAiRunsPage() {
  const { runs } = await adminListAiRuns({ limit: 100 })

  const totalRequests = runs.reduce((a, r) => a + (r.llm_requests || 0), 0)
  const totalTokens = runs.reduce((a, r) => a + (r.total_tokens || 0), 0)

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>AI Runs</h1>
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
            {runs.map((r) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


