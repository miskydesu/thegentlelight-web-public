'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetchJson, clearAdminToken } from '@/lib/tglAdminApi'
import type { Country } from '@/lib/tglApi'
import { swalClose, swalConfirm, swalError, swalLoading, swalSuccess } from '@/lib/adminSwal'

type JobsResult = { status: string; result?: any; error?: string; message?: string }

type NewsQueuesResponse = {
  items: Array<{
    queue_id: string
    provider_id: string
    is_degraded: boolean
    degraded_reasons: string[]
    last_success_at: string | null
    success_rate_1h: number
    avg_duration_ms_1h: number
    items_fetched_1h: number
    items_inserted_1h: number
    items_updated_1h: number
    retry_count_1h: number
  }>
  meta: { generated_at: string }
}

const COUNTRIES: Country[] = ['jp', 'us', 'uk', 'ca']

export default function AdminJobsPage() {
  const router = useRouter()
  // 国選択（全体共通）
  const [countries, setCountries] = useState<Country[]>(['jp'])
  const prevCountriesRef = useRef<Country[]>(['jp'])

  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<any | null>(null)

  // topicize
  const [topicizeLimit, setTopicizeLimit] = useState<number>(200)

  // evaluate
  const [evalLimit, setEvalLimit] = useState<number>(100)
  const [evalForce, setEvalForce] = useState<boolean>(false)

  // summarize
  const [sumLimit, setSumLimit] = useState<number>(50)
  const [sumForce, setSumForce] = useState<boolean>(false)

  // daily generate
  const [dateLocal, setDateLocal] = useState<string>(() => {
    // default: today (JST) as YYYY-MM-DD (good enough for admin UI)
    const d = new Date()
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    return ymd
  })

  // news queues
  const [queues, setQueues] = useState<NewsQueuesResponse['items']>([])
  const [queueId, setQueueId] = useState<string>('')
  // NOTE: 重いジョブなので明示confirmを挟む（checkboxではなくダイアログで）

  const primaryCountry: Country = countries[0] ?? 'jp'

  const describeQueue = (qid: string): string => {
    const q = String(qid || '')
    if (!q) return ''
    if (/^eventregistry_top_pool:(us|uk|ca|jp)$/.test(q)) {
      return 'トップ候補プール（幅広い主要ニュースの取り込み）'
    }
    if (/^eventregistry_shelf:(us|uk|ca|jp):all$/.test(q)) {
      return '棚（all）（カテゴリ別に広めに取り込み）'
    }
    if (/^eventregistry_shelf:(us|uk|ca|jp):fastlane$/.test(q)) {
      return '棚（fastlane）（新しさ優先の速い枠）'
    }
    if (/^eventregistry_sports_small:(us|uk)$/.test(q)) {
      return 'スポーツ小枠（スポーツはメイン棚ではなく“小さく静かに”）'
    }
    if (/^eventregistry_smoke:(us|uk|ca|jp)$/.test(q)) {
      return 'スモークテスト用（疎通・検証向け。通常運用では基本使いません）'
    }
    if (/^eventregistry_heartwarming:(us|uk|ca|jp)$/.test(q)) {
      return '心温まる話（キーワード枠の取り込み）'
    }
    return '（不明なキュー種別）'
  }

  const describeQueueForOption = (qid: string): string => {
    const q = String(qid || '')
    if (!q) return ''
    // セレクトボックス内は短く、括弧が二重にならない表記にする
    if (/^eventregistry_top_pool:(us|uk|ca|jp)$/.test(q)) return 'トップ候補プール：幅広い主要ニュース'
    if (/^eventregistry_shelf:(us|uk|ca|jp):all$/.test(q)) return '棚all：カテゴリ別に広め'
    if (/^eventregistry_shelf:(us|uk|ca|jp):fastlane$/.test(q)) return '棚fastlane：新しさ優先'
    if (/^eventregistry_sports_small:(us|uk)$/.test(q)) return 'スポーツ小枠：小さく静かに'
    if (/^eventregistry_smoke:(us|uk|ca|jp)$/.test(q)) return 'スモーク：疎通/検証用'
    if (/^eventregistry_heartwarming:(us|uk|ca|jp)$/.test(q)) return '心温まる話：keyword枠'
    return '不明'
  }

  const getQueueKindOrder = (qid: string): number => {
    const q = String(qid || '')
    if (/^eventregistry_top_pool:(us|uk|ca|jp)$/.test(q)) return 10
    if (/^eventregistry_shelf:(us|uk|ca|jp):all$/.test(q)) return 20
    if (/^eventregistry_shelf:(us|uk|ca|jp):fastlane$/.test(q)) return 30
    if (/^eventregistry_sports_small:(us|uk)$/.test(q)) return 40
    if (/^eventregistry_smoke:(us|uk|ca|jp)$/.test(q)) return 50
    if (/^eventregistry_heartwarming:(us|uk|ca|jp)$/.test(q)) return 60
    return 999
  }

  const getQueueCountryOrder = (qid: string): number => {
    // queueId format: kind:{country}(:...) so take the 2nd token
    const parts = String(qid || '').split(':')
    const c = parts[1]
    if (c === 'jp') return 10
    if (c === 'us') return 20
    if (c === 'uk') return 30
    if (c === 'ca') return 40
    return 999
  }

  const filteredQueues = useMemo(() => {
    const prefix = `eventregistry_`
    return queues
      .filter((q) => {
        if (!q.queue_id.includes(prefix)) return false
        // queue_id format: something:{country}...
        // News queueは国別選択に紐づけず、全候補を出す（queueIdが国を含むため）
        return true
      })
      .sort((a, b) => {
        const k = getQueueKindOrder(a.queue_id) - getQueueKindOrder(b.queue_id)
        if (k !== 0) return k
        const c = getQueueCountryOrder(a.queue_id) - getQueueCountryOrder(b.queue_id)
        if (c !== 0) return c
        return a.queue_id.localeCompare(b.queue_id)
      })
  }, [queues])

  const loadQueues = async () => {
    try {
      const data = await adminFetchJson<NewsQueuesResponse>('/admin/v1/news/queues')
      setQueues(data.items ?? [])
      // 初回は国に合うものを自動選択
      const first = (data.items ?? []).find((x) => x.queue_id.includes(`:${primaryCountry}`))
      if (first && !queueId) setQueueId(first.queue_id)
      return {
        status: 'ok',
        kind: 'news_queues',
        count: (data.items ?? []).length,
        generated_at: data?.meta?.generated_at ?? null,
        example: first?.queue_id ?? (data.items?.[0]?.queue_id ?? null),
      }
    } catch (err: any) {
      const msg = err?.message || '取得に失敗しました'
      if (String(msg).includes(' 401 ') || String(msg).includes(' 403 ')) {
        clearAdminToken()
        router.push('/admin/login')
        return { status: 'redirected', kind: 'news_queues', message: msg }
      }
      setError(msg)
      return { status: 'error', kind: 'news_queues', message: msg }
    }
  }

  useEffect(() => {
    void loadQueues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // 国切替時に候補を自動選択
    const first = filteredQueues[0]
    if (first) setQueueId(first.queue_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryCountry, filteredQueues.length])

  const run = async (key: string, fn: () => Promise<any>) => {
    if (busyKey) return
    setError(null)
    setLastResult(null)
    setBusyKey(key)

    const jobLabel = (() => {
      if (key === 'queue') return 'News Queue 実行'
      if (key === 'reloadQueues') return 'キュー一覧の更新'
      if (key === 'topicize') return 'Topicize 実行'
      if (key === 'evaluate') return 'Evaluate 実行'
      if (key === 'summarize') return 'Summarize 実行'
      if (key === 'daily') return '朝刊生成'
      return 'ジョブ実行'
    })()

    await swalLoading('実行中…', jobLabel)
    try {
      const r = await fn()
      if (r?.status === 'skipped') {
        await swalClose()
        const reason = String(r?.reason || r?.message || '')
        await swalError(reason || 'スキップされました（すでに実行中の可能性があります）', `${jobLabel}（SKIPPED）`)
        setLastResult(r)
        return
      }
      setLastResult(r)
      await swalClose()
      await swalSuccess('完了しました', jobLabel)
    } catch (err: any) {
      const msg = err?.message || '実行に失敗しました'
      if (String(msg).includes(' 401 ') || String(msg).includes(' 403 ')) {
        await swalClose()
        clearAdminToken()
        router.push('/admin/login')
        return
      }
      setError(msg)
      await swalClose()
      await swalError(msg, jobLabel)
    } finally {
      setBusyKey(null)
    }
  }

  const toggleCountryIn = (setter: React.Dispatch<React.SetStateAction<Country[]>>, c: Country) => {
    setter((prev) => {
      const has = prev.includes(c)
      const next = has ? prev.filter((x) => x !== c) : [...prev, c]
      // 空は許さず、最低1つは残す
      return next.length ? next : prev
    })
  }

  const isAllCountries = countries.length === COUNTRIES.length
  const toggleAllCountries = () => {
    if (!isAllCountries) {
      prevCountriesRef.current = countries.length ? countries : ['jp']
      setCountries([...COUNTRIES])
      return
    }
    const restored = prevCountriesRef.current?.length ? prevCountriesRef.current : (['jp'] as Country[])
    setCountries(restored)
  }

  const runForCountries = async (key: string, countries: Country[], fn: (c: Country) => Promise<any>) => {
    const cs: Country[] = countries.length ? countries : (['jp'] as Country[])
    return await run(key, async () => {
      const results: Array<{ country: Country; ok: boolean; result?: any; error?: string }> = []
      for (const c of cs) {
        try {
          const r = await fn(c)
          results.push({ country: c, ok: true, result: r })
        } catch (e: any) {
          results.push({ country: c, ok: false, error: e?.message || String(e) })
        }
      }
      return { status: 'ok', countries: cs, results }
    })
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>ジョブ実行</h1>
          <div className="tglMuted" style={{ marginTop: 6 }}>
            管理者が手動で必要なジョブをまとめて実行できます（国・件数・言語など指定可）。
          </div>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 14, whiteSpace: 'pre-wrap', color: '#b00020', background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: 10, padding: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
        {/* News queue */}
        <section className="tglRow">
          <div className="tglRowTitle">News Queue（fetch+ingest+topicize）</div>
          <div className="tglRowMeta">
            <span>キューを指定して取り込み〜topicizeまで</span>
            <span>（実行は重いので confirm が必要）</span>
          </div>

          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
              <select value={queueId} onChange={(e) => setQueueId(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
                {filteredQueues.length ? (
                  filteredQueues.map((q) => (
                    <option key={q.queue_id} value={q.queue_id}>
                      {q.queue_id}（{describeQueueForOption(q.queue_id)}）
                    </option>
                  ))
                ) : (
                  <option value="">（該当キューなし）</option>
                )}
              </select>
              <button
                className="tglButton"
                disabled={busyKey === 'queue' || !queueId}
                onClick={() =>
                  void (async () => {
                    const ok = await swalConfirm({
                      title: 'News Queue を実行しますか？',
                      text: 'fetch + ingest + topicize を実行します（重い処理です）',
                      confirmText: '実行（OK）',
                      cancelText: 'キャンセル',
                    })
                    if (!ok) return

                    await run('queue', async () => {
                      const parts = String(queueId).split(':')
                      const qCountry = parts[1] as Country | undefined
                      const qId = String(queueId)
                      const path = `/admin/v1/${encodeURIComponent(qCountry || primaryCountry)}/news/queues/${encodeURIComponent(qId)}/run-admin`
                      return await adminFetchJson<JobsResult>(path, { method: 'POST', body: JSON.stringify({ confirm: true }) })
                    })
                  })()
                }
              >
                {busyKey === 'queue' ? '実行中…' : '実行'}
              </button>
            </div>

            {queueId ? (
              <div className="tglMuted" style={{ fontSize: 13 }}>
                説明: {describeQueue(queueId)}
              </div>
            ) : null}

            <div className="tglMuted" style={{ fontSize: 13 }}>実行前に確認ダイアログが出ます</div>

            <button className="tglButton" disabled={busyKey === 'reloadQueues'} onClick={() => void run('reloadQueues', loadQueues)} style={{ width: 'fit-content' }}>
              {busyKey === 'reloadQueues' ? '更新中…' : 'キュー一覧を更新'}
            </button>
          </div>
        </section>

        {/* Country (global) */}
        <section
          className="tglRow"
          style={{
            border: '2px solid var(--border)',
            background: 'linear-gradient(180deg, rgba(255, 240, 246, 0.55), rgba(255, 255, 255, 0.95))',
            boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
          }}
        >
          <div className="tglRowTitle" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            対象国（全体）
            <span className="tglPill" style={{ fontWeight: 700 }}>
              {isAllCountries ? 'ALL' : countries.map((c) => c.toUpperCase()).join(', ')}
            </span>
          </div>
          <div className="tglRowMeta">
            <span>Topicize / Evaluate / Summarize / 朝刊生成は、この国選択が共通で適用されます</span>
            <span>（News Queue は queue_id 内の国が適用されます）</span>
          </div>

          <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: 800,
                padding: '8px 10px',
                border: '1px solid var(--border)',
                borderRadius: 12,
                background: '#fff',
              }}
            >
              <input type="checkbox" checked={isAllCountries} onChange={toggleAllCountries} />
              ALL（4カ国）
            </label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {COUNTRIES.map((c) => (
                <label
                  key={c}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--text)',
                    fontSize: 13,
                    padding: '6px 10px',
                    border: '1px solid var(--border)',
                    borderRadius: 999,
                    background: countries.includes(c) ? '#fff' : 'transparent',
                  }}
                >
                  <input type="checkbox" checked={countries.includes(c)} onChange={() => toggleCountryIn(setCountries, c)} />
                  {c.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Topicize */}
        <section className="tglRow">
          <div className="tglRowTitle">Topicize</div>
          <div className="tglRowMeta">
            <span>source_articles から topics/topic_sources を作成・更新</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>limit</span>
              <input
                type="number"
                value={topicizeLimit}
                onChange={(e) => setTopicizeLimit(Number(e.target.value || 0))}
                style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', width: 120 }}
                min={1}
                max={5000}
              />
            </label>
            <button
              className="tglButton"
              disabled={busyKey === 'topicize'}
              onClick={() =>
                void runForCountries('topicize', countries, async (c) => {
                  return await adminFetchJson<JobsResult>(`/admin/v1/${c}/jobs/topicize`, {
                    method: 'POST',
                    body: JSON.stringify({ limit: topicizeLimit }),
                  })
                })
              }
            >
              {busyKey === 'topicize' ? '実行中…' : '実行'}
            </button>
          </div>
        </section>

        {/* Evaluate */}
        <section className="tglRow">
          <div className="tglRowTitle">Evaluate</div>
          <div className="tglRowMeta">
            <span>評価（tier/score/arousal等）を更新</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>limit</span>
              <input type="number" value={evalLimit} onChange={(e) => setEvalLimit(Number(e.target.value || 0))} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', width: 120 }} min={1} max={5000} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
              <input type="checkbox" checked={evalForce} onChange={(e) => setEvalForce(e.target.checked)} />
              force（強制再評価）
            </label>

            <button
              className="tglButton"
              disabled={busyKey === 'evaluate'}
              onClick={() =>
                void runForCountries('evaluate', countries, async (c) => {
                  return await adminFetchJson<JobsResult>(`/admin/v1/${c}/jobs/evaluate`, {
                    method: 'POST',
                    body: JSON.stringify({ limit: evalLimit, force: evalForce }),
                  })
                })
              }
            >
              {busyKey === 'evaluate' ? '実行中…' : '実行'}
            </button>
          </div>
          <div className="tglMuted" style={{ marginTop: 8, fontSize: 13 }}>
            force は「すでに評価済みでも、上書きで再評価する」オプションです（通常はOFF推奨）。
          </div>
        </section>

        {/* Summarize */}
        <section className="tglRow">
          <div className="tglRowTitle">Summarize</div>
          <div className="tglRowMeta">
            <span>要約生成（pending/failed対象）</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>limit</span>
              <input type="number" value={sumLimit} onChange={(e) => setSumLimit(Number(e.target.value || 0))} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', width: 120 }} min={1} max={5000} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
              <input type="checkbox" checked={sumForce} onChange={(e) => setSumForce(e.target.checked)} />
              force（強制再要約）
            </label>

            <button
              className="tglButton"
              disabled={busyKey === 'summarize'}
              onClick={() =>
                void runForCountries('summarize', countries, async (c) => {
                  return await adminFetchJson<JobsResult>(`/admin/v1/${c}/jobs/summarize`, {
                    method: 'POST',
                    body: JSON.stringify({ limit: sumLimit, force: sumForce }),
                  })
                })
              }
            >
              {busyKey === 'summarize' ? '実行中…' : '実行'}
            </button>
          </div>
          <div className="tglMuted" style={{ marginTop: 8, fontSize: 13 }}>
            force は「すでに要約済みでも、上書きで再要約する」オプションです（通常はOFF推奨）。
          </div>
        </section>

        {/* Daily generate */}
        <section className="tglRow">
          <div className="tglRowTitle">朝刊生成（Daily）</div>
          <div className="tglRowMeta">
            <span>指定日の朝刊を生成（LLM同期）</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>dateLocal</span>
              <input type="text" value={dateLocal} onChange={(e) => setDateLocal(e.target.value)} placeholder="YYYY-MM-DD" style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', width: 140 }} />
            </label>
            <button
              className="tglButton"
              disabled={busyKey === 'daily'}
              onClick={() =>
                void runForCountries('daily', countries, async (c) => {
                  return await adminFetchJson<JobsResult>(`/admin/v1/${c}/daily/${encodeURIComponent(dateLocal)}/generate-admin`, {
                    method: 'POST',
                  })
                })
              }
            >
              {busyKey === 'daily' ? '実行中…' : '生成'}
            </button>
          </div>
        </section>
      </div>

      <section style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>直近の結果</h2>
          {busyKey ? <span className="tglMuted">実行中: {busyKey}</span> : null}
        </div>
        <pre style={{ marginTop: 10, padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: '#fff', overflowX: 'auto' }}>
          {lastResult ? JSON.stringify(lastResult, null, 2) : '（まだありません）'}
        </pre>
      </section>
    </main>
  )
}


