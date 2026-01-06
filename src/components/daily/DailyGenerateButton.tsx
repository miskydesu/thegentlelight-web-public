'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, userFetchJson } from '@/lib/userAuth'

export function DailyGenerateButton(props: { country: string; dateLocal: string; dailyStatus: string }) {
  const { country, dateLocal, dailyStatus } = props
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const s = await getSession()
        setRole(s.user?.role ?? null)
      } catch {
        setRole(null)
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [])

  const isAllowedUser = (role || '').toLowerCase() === 'admin'
  // pending中は二重実行を避ける（それ以外は再生成OK）
  const canGenerate = dailyStatus !== 'pending'

  const label = useMemo(() => {
    const isMissing = dailyStatus === 'missing'
    if (country === 'jp') return isMissing ? '朝刊を生成' : '朝刊を再生成'
    return isMissing ? 'Generate morning briefing' : 'Regenerate morning briefing'
  }, [country, dailyStatus])

  if (loading) return null
  if (!isAllowedUser) return null
  if (!canGenerate) return null

  const onClick = async () => {
    setError(null)
    setBusy(true)
    try {
      await userFetchJson(`/v1/${encodeURIComponent(country)}/daily/${encodeURIComponent(dateLocal)}/generate`, {
        method: 'POST',
        body: JSON.stringify({}),
        timeoutMs: 180000, // 管理者用：LLM生成完了まで待つ
      })
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: busy ? '#f3f3f3' : 'var(--surface)',
          color: 'var(--text)',
          fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer',
        }}
      >
        {busy ? (country === 'jp' ? '生成中…' : 'Generating…') : label}
      </button>
      {error ? (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{error}</div>
      ) : null}
    </div>
  )
}


