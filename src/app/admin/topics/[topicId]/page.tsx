'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { isCountry, type Country } from '../../../../lib/tglApi'
import { adminGetTopic, adminMergeTopics, adminPatchTopic, adminSplitTopics, clearAdminToken } from '../../../../lib/tglAdminApi'

export default function AdminTopicDetailPage() {
  const router = useRouter()
  const params = useParams<{ topicId: string }>()
  const sp = useSearchParams()

  const topicId = params.topicId
  const countryParam = sp.get('country') || 'us'
  const country: Country = isCountry(countryParam) ? countryParam : 'us'

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  const [soft, setSoft] = useState('')
  const [calm, setCalm] = useState('')
  const [near, setNear] = useState('')
  const [status, setStatus] = useState('active')

  const [mergeTo, setMergeTo] = useState('')
  const [mergeReason, setMergeReason] = useState('')
  const [mergeMoveSources, setMergeMoveSources] = useState(true)
  const [mergeResult, setMergeResult] = useState<any | null>(null)

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await adminGetTopic(country, topicId)
      setData(res)
      const t = res?.topic
      setStatus(t?.status || 'active')
      setSoft(t?.summaries?.soft ?? '')
      setCalm(t?.summaries?.calm ?? '')
      setNear(t?.summaries?.near ?? '')
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

  const patch = async () => {
    setError(null)
    setBusy(true)
    try {
      await adminPatchTopic(country, topicId, {
        status,
        summaries: { soft, calm, near },
      })
      await load()
    } catch (err: any) {
      setError(err?.message || '更新に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  const doMerge = async () => {
    setError(null)
    setBusy(true)
    setMergeResult(null)
    try {
      const res = await adminMergeTopics(country, {
        fromTopicId: topicId,
        toTopicId: mergeTo.trim(),
        moveSources: mergeMoveSources,
        reason: mergeReason.trim() || undefined,
      })
      setMergeResult(res)
      await load()
    } catch (err: any) {
      setError(err?.message || 'mergeに失敗しました')
    } finally {
      setBusy(false)
    }
  }

  const doSplit = async () => {
    setError(null)
    setBusy(true)
    try {
      await adminSplitTopics(country, {})
    } catch (err: any) {
      setError(err?.message || 'splitに失敗しました（未実装の可能性）')
    } finally {
      setBusy(false)
    }
  }

  const title = useMemo(() => data?.topic?.title ?? '(loading)', [data])
  const sources = data?.sources || []
  const overrides = data?.overrides || null
  const alias = data?.alias || null

  return (
    <main>
      <div className="tglMuted" style={{ marginBottom: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href={`/admin/topics?country=${country}`}>← topics</Link>
        <button className="tglButton" onClick={() => void load()} disabled={busy}>
          {busy ? '読み込み中…' : '再読み込み'}
        </button>
      </div>

      <h1 style={{ fontSize: '1.35rem', lineHeight: 1.25 }}>{title}</h1>
      <div style={{ height: 10 }} />

      {error ? <div style={{ color: '#b00020', whiteSpace: 'pre-wrap' }}>{error}</div> : null}

      <div style={{ height: 12 }} />

      <section className="tglRow">
        <div className="tglRowTitle">状態</div>
        <div className="tglRowMeta" style={{ alignItems: 'center' }}>
          <span className="tglMuted">country:</span> <span className="tglPill">{country.toUpperCase()}</span>
          <span className="tglMuted">topicId:</span> <span className="tglPill">{topicId}</span>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="tglMuted">status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">active</option>
              <option value="hidden">hidden</option>
            </select>
          </label>
          <button className="tglButton" onClick={() => void patch()} disabled={busy}>
            保存
          </button>
        </div>
        {overrides ? (
          <div className="tglRowMeta" style={{ marginTop: 8 }}>
            <span className="tglMuted">override:</span>
            {overrides.force_hidden ? <span className="tglPill">force_hidden</span> : null}
            {overrides.pinned_rank ? <span className="tglPill">pinned_rank={overrides.pinned_rank}</span> : null}
            {overrides.manual_importance_boost ? <span className="tglPill">boost={overrides.manual_importance_boost}</span> : null}
          </div>
        ) : null}
        {alias ? (
          <div className="tglRowMeta" style={{ marginTop: 8 }}>
            <span className="tglMuted">alias:</span>
            <span className="tglPill">
              {alias.old_topic_id} → {alias.new_topic_id}
            </span>
          </div>
        ) : null}
      </section>

      <div style={{ height: 12 }} />

      <section className="tglRow">
        <div className="tglRowTitle">要約（3段階）</div>
        <div style={{ height: 8 }} />
        <div className="tglRowMeta" style={{ display: 'grid', gap: 10 }}>
          <label>
            <div className="tglMuted">soft</div>
            <textarea value={soft} onChange={(e) => setSoft(e.target.value)} rows={4} style={{ width: '100%' }} />
          </label>
          <label>
            <div className="tglMuted">calm</div>
            <textarea value={calm} onChange={(e) => setCalm(e.target.value)} rows={4} style={{ width: '100%' }} />
          </label>
          <label>
            <div className="tglMuted">near</div>
            <textarea value={near} onChange={(e) => setNear(e.target.value)} rows={4} style={{ width: '100%' }} />
          </label>
        </div>
        <div style={{ height: 10 }} />
        <button className="tglButton" onClick={() => void patch()} disabled={busy}>
          要約を保存
        </button>
      </section>

      <div style={{ height: 12 }} />

      <section className="tglRow">
        <div className="tglRowTitle">参照元</div>
        <div style={{ height: 8 }} />
        {sources?.length ? (
          <div className="tglList">
            {sources.map((s: any) => (
              <a key={s.source_id} className="tglRow" href={s.url} target="_blank" rel="noreferrer">
                <div className="tglRowTitle">{s.title}</div>
                <div className="tglRowMeta">
                  {s.source_domain ? <span className="tglPill">{s.source_domain}</span> : null}
                  {s.published_at ? <span className="tglMuted">{new Date(s.published_at).toLocaleString()}</span> : null}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="tglRowMeta">sources がありません（include=sources が返っていない可能性もあります）</div>
        )}
      </section>

      <div style={{ height: 12 }} />

      <section className="tglRow">
        <div className="tglRowTitle">merge / split</div>
        <div style={{ height: 8 }} />

        <div className="tglRowMeta" style={{ display: 'grid', gap: 8 }}>
          <div className="tglMuted">merge（from = この topicId → to を入力）</div>
          <input value={mergeTo} onChange={(e) => setMergeTo(e.target.value)} placeholder="toTopicId" />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={mergeMoveSources} onChange={(e) => setMergeMoveSources(e.target.checked)} />
            <span>moveSources（参照元も移す）</span>
          </label>
          <input value={mergeReason} onChange={(e) => setMergeReason(e.target.value)} placeholder="reason（任意）" />
          <button className="tglButton" onClick={() => void doMerge()} disabled={busy || !mergeTo.trim()}>
            merge 実行
          </button>

          {mergeResult ? (
            <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 10, borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)' }}>
              {JSON.stringify(mergeResult, null, 2)}
            </pre>
          ) : null}

          <div className="tglMuted" style={{ marginTop: 6 }}>
            split（MVPではAPI側が501）
          </div>
          <button className="tglButton" onClick={() => void doSplit()} disabled={busy}>
            split 実行（未実装）
          </button>
        </div>
      </section>
    </main>
  )
}


