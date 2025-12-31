'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { isCountry, type Country } from '../../../../lib/tglApi'
import {
  adminGetTopic,
  adminMergeTopics,
  adminPatchTopic,
  adminSplitTopics,
  adminGetTopicOverride,
  adminUpdateTopicOverride,
  adminRegenerateTopicSummary,
  adminRunTopicAI,
  clearAdminToken,
} from '../../../../lib/tglAdminApi'

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

  const [overridePinnedRank, setOverridePinnedRank] = useState<number | null>(null)
  const [overrideForceHidden, setOverrideForceHidden] = useState(false)
  const [overrideManualBoost, setOverrideManualBoost] = useState(0)
  const [overrideNote, setOverrideNote] = useState('')
  const [overrideBusy, setOverrideBusy] = useState(false)

  const [splitSourceIds, setSplitSourceIds] = useState<string[]>([])
  const [splitNewTopicTitle, setSplitNewTopicTitle] = useState('')
  const [splitNewTopicCategory, setSplitNewTopicCategory] = useState('politics')
  const [splitReason, setSplitReason] = useState('')
  const [splitResult, setSplitResult] = useState<any | null>(null)

  const [regenerateBusy, setRegenerateBusy] = useState(false) // DEPRECATED（互換で残す）
  const [aiRunBusy, setAiRunBusy] = useState(false)
  const [aiRunResult, setAiRunResult] = useState<any | null>(null)

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

      // override情報を読み込む
      const overrideData = res?.overrides || null
      if (overrideData) {
        setOverridePinnedRank(overrideData.pinned_rank ?? null)
        setOverrideForceHidden(overrideData.force_hidden ?? false)
        setOverrideManualBoost(overrideData.manual_importance_boost ?? 0)
        setOverrideNote(overrideData.note ?? '')
      } else {
        setOverridePinnedRank(null)
        setOverrideForceHidden(false)
        setOverrideManualBoost(0)
        setOverrideNote('')
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
    setSplitResult(null)
    try {
      if (splitSourceIds.length === 0) {
        setError('分割するsourceを1つ以上選択してください')
        return
      }
      const res = await adminSplitTopics(country, {
        topicId,
        sourceIds: splitSourceIds,
        newTopicSeed: splitNewTopicTitle
          ? {
              title: splitNewTopicTitle,
              category: splitNewTopicCategory,
            }
          : null,
        reason: splitReason.trim() || undefined,
      })
      setSplitResult(res)
      await load()
    } catch (err: any) {
      setError(err?.message || 'splitに失敗しました')
    } finally {
      setBusy(false)
    }
  }

  const updateOverride = async () => {
    setError(null)
    setOverrideBusy(true)
    try {
      await adminUpdateTopicOverride(country, topicId, {
        pinned_rank: overridePinnedRank,
        force_hidden: overrideForceHidden,
        manual_importance_boost: overrideManualBoost,
        note: overrideNote.trim() || null,
      })
      await load()
    } catch (err: any) {
      setError(err?.message || 'override更新に失敗しました')
    } finally {
      setOverrideBusy(false)
    }
  }

  const regenerateSummary = async () => {
    // DEPRECATED: summarize単体は廃止（基本セットに統合）
    // 互換で残しているだけなので、AI再実行（force）を案内する。
    setError(null)
    setRegenerateBusy(true)
    try {
      await adminRunTopicAI(country, topicId, { force: true })
      await load()
    } catch (err: any) {
      setError(err?.message || 'AI再実行に失敗しました')
    } finally {
      setRegenerateBusy(false)
    }
  }

  const runAI = async (force: boolean) => {
    setError(null)
    setAiRunBusy(true)
    setAiRunResult(null)
    try {
      const res = await adminRunTopicAI(country, topicId, { force })
      setAiRunResult(res)
      await load()
    } catch (err: any) {
      setError(err?.message || 'AI再実行に失敗しました')
    } finally {
      setAiRunBusy(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          {data?.topic?.ai_status ? <span className="tglPill">ai:{data.topic.ai_status}</span> : null}
          {data?.topic?.ai_status === 'failed' && data?.topic?.ai_error ? (
            <span className="tglMuted" title={data.topic.ai_error} style={{ maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.topic.ai_error}
            </span>
          ) : null}
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
        <div className="tglRowMeta" style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="tglButton" onClick={() => void runAI(false)} disabled={aiRunBusy || busy}>
            {aiRunBusy ? 'AI実行中…' : 'AI再実行（基本セット）'}
          </button>
          <button className="tglButton" onClick={() => void runAI(true)} disabled={aiRunBusy || busy} style={{ background: '#f5f5f5', color: '#333' }}>
            {aiRunBusy ? 'AI実行中…' : 'AI再実行（force）'}
          </button>
          {aiRunResult ? (
            <span className="tglMuted" style={{ whiteSpace: 'pre-wrap' }}>
              result: {JSON.stringify(aiRunResult.result || aiRunResult, null, 0)}
            </span>
          ) : null}
        </div>
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

      {/* Override編集UI */}
      <section className="tglRow">
        <div className="tglRowTitle">Override（手動調整）</div>
        <div style={{ height: 8 }} />
        <div className="tglRowMeta" style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ minWidth: 120 }}>pinned_rank:</span>
            <input
              type="number"
              value={overridePinnedRank ?? ''}
              onChange={(e) => setOverridePinnedRank(e.target.value ? Number(e.target.value) : null)}
              placeholder="null (未設定)"
              style={{ width: 100 }}
            />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ minWidth: 120 }}>force_hidden:</span>
            <input
              type="checkbox"
              checked={overrideForceHidden}
              onChange={(e) => setOverrideForceHidden(e.target.checked)}
            />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ minWidth: 120 }}>manual_boost:</span>
            <input
              type="number"
              value={overrideManualBoost}
              onChange={(e) => setOverrideManualBoost(Number(e.target.value))}
              style={{ width: 100 }}
            />
          </label>
          <label>
            <span style={{ minWidth: 120, display: 'inline-block' }}>note:</span>
            <textarea
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              rows={2}
              style={{ width: '100%' }}
              placeholder="メモ（任意）"
            />
          </label>
        </div>
        <div style={{ height: 10 }} />
        <button className="tglButton" onClick={() => void updateOverride()} disabled={overrideBusy}>
          {overrideBusy ? '保存中...' : 'Overrideを保存'}
        </button>
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tglButton" onClick={() => void patch()} disabled={busy}>
            要約を保存
          </button>
          {/* summarize単体は廃止（基本セットに統合）。詳細上部の「AI再実行」を使用してください。 */}
        </div>
      </section>

      <div style={{ height: 12 }} />

      <section className="tglRow">
        <div className="tglRowTitle">参照元</div>
        <div style={{ height: 8 }} />
        {sources?.length ? (
          <div className="tglList">
            {sources.map((s: any) => (
              <label
                key={s.source_id}
                style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={splitSourceIds.includes(s.source_id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSplitSourceIds([...splitSourceIds, s.source_id])
                    } else {
                      setSplitSourceIds(splitSourceIds.filter((id) => id !== s.source_id))
                    }
                  }}
                />
                <a className="tglRow" href={s.url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                  <div className="tglRowTitle">{s.title}</div>
                  <div className="tglRowMeta">
                    {s.source_domain ? <span className="tglPill">{s.source_domain}</span> : null}
                    {s.published_at ? <span className="tglMuted">{new Date(s.published_at).toLocaleString()}</span> : null}
                  </div>
                </a>
              </label>
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
            split（選択したsourceを新topicへ移動）
          </div>
          <input
            value={splitNewTopicTitle}
            onChange={(e) => setSplitNewTopicTitle(e.target.value)}
            placeholder="新topicのタイトル（省略可、sourceから推測）"
            style={{ width: '100%' }}
          />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ minWidth: 100 }}>category:</span>
            <select value={splitNewTopicCategory} onChange={(e) => setSplitNewTopicCategory(e.target.value)}>
              <option value="world">world</option>
              <option value="economy">economy</option>
              <option value="tech">tech</option>
              <option value="society">society</option>
              <option value="culture">culture</option>
              <option value="health">health</option>
              <option value="science">science</option>
            </select>
          </label>
          <input
            value={splitReason}
            onChange={(e) => setSplitReason(e.target.value)}
            placeholder="reason（任意）"
            style={{ width: '100%' }}
          />
          <button
            className="tglButton"
            onClick={() => void doSplit()}
            disabled={busy || splitSourceIds.length === 0}
            style={{ background: splitSourceIds.length === 0 ? '#f5f5f5' : undefined }}
          >
            split 実行（{splitSourceIds.length}件のsourceを移動）
          </button>
          {splitResult ? (
            <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 10, borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)' }}>
              {JSON.stringify(splitResult, null, 2)}
            </pre>
          ) : null}
        </div>
      </section>
    </main>
  )
}


