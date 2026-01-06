'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  adminCleanupColumnTmpImages,
  adminScanColumnTmpImages,
  adminDeleteColumn,
  adminDeleteColumnImages,
  adminListColumns,
  adminScanUnusedColumnImages,
  clearAdminToken,
  type AdminColumnsTmpCleanupResult,
  type AdminColumnsTmpScanResult,
  type AdminColumnsUnusedImagesScanResult,
} from '../../../lib/tglAdminApi'
import { swalClose, swalConfirm, swalError, swalLoading, swalSuccess } from '../../../lib/adminSwal'

export default function AdminColumnsPage() {
  const router = useRouter()
  const [lang, setLang] = useState('ja')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(50)
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [meta, setMeta] = useState<{ total: number } | null>(null)

  const [scanBusy, setScanBusy] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<AdminColumnsUnusedImagesScanResult | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({})
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ deleted: number; failed: number } | null>(null)
  const [rowDeleteBusyId, setRowDeleteBusyId] = useState<string | null>(null)

  const [tmpBusy, setTmpBusy] = useState(false)
  const [tmpError, setTmpError] = useState<string | null>(null)
  const [tmpHours, setTmpHours] = useState(72)
  const [tmpScanResult, setTmpScanResult] = useState<AdminColumnsTmpScanResult | null>(null)
  const [tmpResult, setTmpResult] = useState<AdminColumnsTmpCleanupResult | null>(null)

  const load = async () => {
    setError(null)
    setBusy(true)
    try {
      const cursor = (page - 1) * limit
      const res = await adminListColumns(lang, q.trim() || undefined, status.trim() || undefined, undefined, limit, cursor)
      setRows(res.columns || [])
      setMeta({ total: Number(res?.meta?.total ?? 0) })
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

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit])

  const runScan = async () => {
    setScanError(null)
    setDeleteResult(null)
    setScanBusy(true)
    try {
      await swalLoading('スキャン中…', '未使用のR2画像をチェックしています')
      const res = await adminScanUnusedColumnImages(2000)
      setScanResult(res)
      const init: Record<string, boolean> = {}
      for (const o of res.unused_objects || []) init[o.key] = false
      setSelectedKeys(init)
    } catch (err: any) {
      const msg = err?.message || 'スキャンに失敗しました'
      if (String(msg).includes(' 401 ') || String(msg).includes(' 403 ')) {
        clearAdminToken()
        router.push('/admin/login')
        return
      }
      setScanError(msg)
      await swalError(msg, 'スキャン失敗（Scan failed）')
    } finally {
      setScanBusy(false)
      await swalClose()
    }
  }

  const runTmpScan = async () => {
    setTmpError(null)
    setTmpBusy(true)
    try {
      await swalLoading('調査中…', 'columns/tmp/ の削除候補を調べています')
      const r = await adminScanColumnTmpImages(tmpHours, 2000)
      setTmpScanResult(r)
      await swalSuccess(
        `older=${r.older}, candidates=${r.delete_candidates}, skipped(ref)=${r.skipped_referenced}`,
        '調査完了（Scan done）'
      )
    } catch (err: any) {
      const msg = err?.message || 'tmp調査に失敗しました'
      if (String(msg).includes(' 401 ') || String(msg).includes(' 403 ')) {
        clearAdminToken()
        router.push('/admin/login')
        return
      }
      setTmpError(msg)
      await swalError(msg, 'tmp調査失敗（Failed）')
    } finally {
      setTmpBusy(false)
      await swalClose()
    }
  }

  const runTmpCleanup = async () => {
    if (!tmpScanResult) {
      await swalError('先に「調査」を実行してください', '実行できません（Invalid）')
      return
    }
    if ((tmpScanResult.delete_candidates || 0) <= 0) {
      await swalSuccess('削除候補がありません（candidates=0）', '実行不要（No-op）')
      return
    }

    const ok = await swalConfirm({
      title: 'tmpクリーンアップを実行しますか？',
      text: `older=${tmpScanResult.older}\ncandidates=${tmpScanResult.delete_candidates}\nskipped(ref)=${tmpScanResult.skipped_referenced}\n\n※この操作は取り消せません。`,
      confirmText: '削除実行',
      cancelText: 'キャンセル',
    })
    if (!ok) return

    setTmpError(null)
    setTmpBusy(true)
    try {
      await swalLoading('クリーンアップ中…', '古い columns/tmp/ 画像を削除しています')
      const r = await adminCleanupColumnTmpImages(tmpHours, 2000)
      setTmpResult(r)
      await swalSuccess(`deleted=${r.deleted}, skipped_referenced=${r.skipped_referenced}, failed=${r.failed}`, 'tmpクリーンアップ完了')
      // 実行後は再調査して最新化（候補が減った状態に更新）
      const nextScan = await adminScanColumnTmpImages(tmpHours, 2000)
      setTmpScanResult(nextScan)
    } catch (err: any) {
      const msg = err?.message || 'tmpクリーンアップに失敗しました'
      if (String(msg).includes(' 401 ') || String(msg).includes(' 403 ')) {
        clearAdminToken()
        router.push('/admin/login')
        return
      }
      setTmpError(msg)
      await swalError(msg, 'tmpクリーンアップ失敗（Failed）')
    } finally {
      setTmpBusy(false)
      await swalClose()
    }
  }

  const runDeleteSelected = async () => {
    if (!scanResult) return
    const keys = Object.entries(selectedKeys)
      .filter(([, v]) => v)
      .map(([k]) => k)
    if (keys.length === 0) {
      setScanError('削除対象が選択されていません')
      await swalError('削除対象が選択されていません', '入力不足（Invalid）')
      return
    }
    const ok = await swalConfirm({
      title: '未使用画像を削除しますか？',
      text: `削除件数: ${keys.length}\n※この操作は取り消せません。`,
      confirmText: '削除',
      cancelText: 'キャンセル',
    })
    if (!ok) return

    setScanError(null)
    setDeleteBusy(true)
    try {
      await swalLoading('削除中…', 'R2から未使用画像を削除しています')
      const r = await adminDeleteColumnImages(keys)
      setDeleteResult({ deleted: r.deleted, failed: r.failed })
      // 再スキャンして最新化
      await runScan()
      await swalSuccess(`deleted=${r.deleted}, failed=${r.failed}`, '削除完了（Done）')
    } catch (err: any) {
      const msg = err?.message || '削除に失敗しました'
      if (String(msg).includes(' 401 ') || String(msg).includes(' 403 ')) {
        clearAdminToken()
        router.push('/admin/login')
        return
      }
      setScanError(msg)
      await swalError(msg, '削除失敗（Delete failed）')
    } finally {
      setDeleteBusy(false)
      await swalClose()
    }
  }

  const deleteColumn = async (col: any) => {
    const id = String(col?.column_id || '')
    const title = String(col?.title || '')
    if (!id) return
    const ok = await swalConfirm({
      title: 'コラムを削除しますか？',
      text: `id: ${id}\ntitle: ${title || '(no title)'}\n\nこの操作は取り消せません。`,
      confirmText: '削除',
      cancelText: 'キャンセル',
    })
    if (!ok) return

    setRowDeleteBusyId(id)
    setError(null)
    try {
      await swalLoading('削除中…', 'コラムを削除しています')
      await adminDeleteColumn(id)
      await load()
      await swalSuccess('削除しました', '完了（Done）')
    } catch (err: any) {
      const msg2 = err?.message || '削除に失敗しました'
      if (String(msg2).includes(' 401 ') || String(msg2).includes(' 403 ')) {
        clearAdminToken()
        router.push('/admin/login')
        return
      }
      setError(msg2)
      await swalError(msg2, '削除失敗（Delete failed）')
    } finally {
      setRowDeleteBusyId(null)
      await swalClose()
    }
  }

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 600, color: '#1a1a1a' }}>コラム一覧（Columns）</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            href="/admin/columns/new"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0056b3'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#007bff'
            }}
          >
            新規コラム作成（New Column / EN+JA）
          </Link>
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
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
        </div>
      ) : null}

      {/* R2 未使用画像削除ツール */}
      <section
        style={{
          marginBottom: 24,
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '20px',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 600, color: '#1a1a1a' }}>
          未使用R2画像の削除（Columns本文用）
        </h2>
        <div style={{ color: '#6c757d', fontSize: '0.9rem', marginBottom: 12, lineHeight: 1.6 }}>
          - 対象: R2の <code>columns/</code> 配下（ただし <code>columns/covers/</code> は除外）<br />
          - 判定: 全コラムの <code>body_md</code> と <code>cover_image_key</code> 参照に存在しないものを「未使用」として表示<br />
          - 削除は選択したものだけ実行します（取り消し不可）
        </div>

        {scanError ? <div style={{ color: '#b00020', whiteSpace: 'pre-wrap', marginBottom: 10 }}>{scanError}</div> : null}
        {deleteResult ? (
          <div style={{ color: '#155724', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 6, padding: '10px 12px', marginBottom: 10 }}>
            削除結果: deleted={deleteResult.deleted}, failed={deleteResult.failed}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => void runScan()}
            disabled={scanBusy || deleteBusy}
            style={{
              padding: '10px 16px',
              backgroundColor: scanBusy ? '#6c757d' : '#343a40',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: scanBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {scanBusy ? 'スキャン中…' : '未使用画像をスキャン'}
          </button>
          <button
            onClick={() => void runDeleteSelected()}
            disabled={deleteBusy || scanBusy || !scanResult}
            style={{
              padding: '10px 16px',
              backgroundColor: deleteBusy ? '#6c757d' : '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: deleteBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {deleteBusy ? '削除中…' : '選択した未使用画像を削除'}
          </button>
          {scanResult ? (
            <div style={{ color: '#495057', fontSize: '0.9rem' }}>
              scanned={scanResult.scanned} / candidates={scanResult.candidates} / used={scanResult.used} / unused={scanResult.unused}
            </div>
          ) : null}
        </div>

        {scanResult && scanResult.unused_objects?.length ? (
          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={Object.values(selectedKeys).length > 0 && Object.values(selectedKeys).every(Boolean)}
                      onChange={(e) => {
                        const v = e.target.checked
                        const next: Record<string, boolean> = {}
                        for (const k of Object.keys(selectedKeys)) next[k] = v
                        setSelectedKeys(next)
                      }}
                    />{' '}
                    選択
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>key</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>url</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>size</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>lastModified</th>
                </tr>
              </thead>
              <tbody>
                {scanResult.unused_objects.slice(0, 500).map((o) => (
                  <tr key={o.key} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <input
                        type="checkbox"
                        checked={!!selectedKeys[o.key]}
                        onChange={(e) => setSelectedKeys((p) => ({ ...p, [o.key]: e.target.checked }))}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{o.key}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>
                      <a href={o.url} target="_blank" rel="noreferrer">
                        {o.url}
                      </a>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {typeof o.size === 'number' ? o.size : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{o.lastModified || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {scanResult.unused_objects.length > 500 ? (
              <div style={{ marginTop: 8, color: '#6c757d', fontSize: '0.85rem' }}>
                表示は先頭500件までです（対象が多い場合は削除を分割してください）
              </div>
            ) : null}
          </div>
        ) : scanResult ? (
          <div style={{ marginTop: 12, color: '#6c757d' }}>未使用画像は見つかりませんでした。</div>
        ) : null}
      </section>

      {/* R2 tmp クリーンアップ */}
      <section
        style={{
          marginBottom: 24,
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '20px',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 600, color: '#1a1a1a' }}>
          tmp画像クリーンアップ（columns/tmp/）
        </h2>
        <div style={{ color: '#6c757d', fontSize: '0.9rem', marginBottom: 12, lineHeight: 1.6 }}>
          未保存の新規コラムで一時的にアップロードされた画像（<code>columns/tmp/</code>）を、指定時間より古いものだけ削除します。<br />
          誤削除防止のため、DB（ja/en含む全コラムの本文）で参照されているtmpキーは削除しません。
        </div>

        {tmpError ? <div style={{ color: '#b00020', whiteSpace: 'pre-wrap', marginBottom: 10 }}>{tmpError}</div> : null}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#495057', fontSize: '0.9rem', fontWeight: 700 }}>閾値（時間）</span>
            <input
              type="number"
              min={1}
              max={24 * 30}
              value={tmpHours}
              onChange={(e) => setTmpHours(Number(e.target.value))}
              style={{ width: 120, padding: '8px 10px', border: '1px solid #ced4da', borderRadius: 6 }}
            />
          </label>
          <button
            onClick={() => void runTmpScan()}
            disabled={tmpBusy}
            style={{
              padding: '10px 16px',
              backgroundColor: tmpBusy ? '#6c757d' : '#343a40',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: tmpBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {tmpBusy ? '調査中…' : '調査（削除候補を算出）'}
          </button>
          <button
            onClick={() => void runTmpCleanup()}
            disabled={tmpBusy || !tmpScanResult || (tmpScanResult.delete_candidates || 0) <= 0}
            style={{
              padding: '10px 16px',
              backgroundColor: tmpBusy || !tmpScanResult || (tmpScanResult.delete_candidates || 0) <= 0 ? '#6c757d' : '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: tmpBusy || !tmpScanResult || (tmpScanResult.delete_candidates || 0) <= 0 ? 'not-allowed' : 'pointer',
            }}
            title={!tmpScanResult ? '先に調査してください' : (tmpScanResult.delete_candidates || 0) <= 0 ? '削除候補がありません' : '削除実行'}
          >
            {tmpBusy ? '実行中…' : 'クリーンアップ実行（削除）'}
          </button>
          {tmpScanResult ? (
            <div style={{ color: '#495057', fontSize: '0.9rem' }}>
              older={tmpScanResult.older} / candidates={tmpScanResult.delete_candidates} / skipped(ref)={tmpScanResult.skipped_referenced}
            </div>
          ) : null}
        </div>

        {tmpScanResult ? (
          <div style={{ marginTop: 10, color: '#6c757d', fontSize: '0.85rem' }}>
            cutoff: {tmpScanResult.cutoff} / scanned: {tmpScanResult.scanned} / referenced_in_db: {tmpScanResult.referenced_in_db}
          </div>
        ) : null}

        {tmpScanResult?.candidate_keys?.length ? (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer', color: '#495057', fontWeight: 700 }}>
              削除候補（先頭 {Math.min(tmpScanResult.candidate_keys.length, 500)} 件）を表示
            </summary>
            <div style={{ marginTop: 8, maxHeight: 240, overflow: 'auto', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 8, padding: 10 }}>
              <pre style={{ margin: 0, fontSize: '0.82rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                {tmpScanResult.candidate_keys.join('\n')}
              </pre>
            </div>
          </details>
        ) : null}

        {tmpResult ? (
          <div style={{ marginTop: 10, color: '#495057', fontSize: '0.9rem' }}>
            実行結果: deleted={tmpResult.deleted}, failed={tmpResult.failed}, skipped(ref)={tmpResult.skipped_referenced}
          </div>
        ) : null}
      </section>

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
        <h2 style={{ fontSize: '1.1rem', marginBottom: 20, fontWeight: 600, color: '#1a1a1a' }}>絞り込み（Filter）</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>言語（lang）</span>
            <select
              value={lang}
              onChange={(e) => {
                setLang(e.target.value)
                setPage(1)
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="ja">日本語（ja）</option>
              <option value="en">English（en）</option>
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>検索（q）</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="title / excerpt に含まれる文字…"
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
            <span style={{ color: '#495057', fontSize: '0.85rem', fontWeight: 500 }}>状態（status）</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="">すべて（all）</option>
              <option value="draft">下書き（draft）</option>
              <option value="published">公開（published）</option>
              <option value="archived">アーカイブ（archived）</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => void load()}
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
              if (!busy) e.currentTarget.style.backgroundColor = '#0056b3'
            }}
            onMouseLeave={(e) => {
              if (!busy) e.currentTarget.style.backgroundColor = '#007bff'
            }}
          >
            {busy ? '更新中…' : '更新'}
          </button>
        </div>
      </section>

      {/* 統計 */}
      <div
        style={{
          marginBottom: 24,
          padding: '16px 20px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ color: '#495057', fontSize: '0.9rem' }}>
          合計: <span style={{ fontWeight: 700, color: '#000' }}>{meta?.total ?? 0}</span>件（lang={lang}）
        </div>
        <div style={{ color: '#495057', fontSize: '0.9rem' }}>
          {meta && meta.total > 0
            ? (
              <>
                全<span style={{ fontWeight: 700, color: '#000' }}>{meta.total}</span>件中 {Math.min((page - 1) * limit + 1, meta.total)}-{Math.min(page * limit, meta.total)}件を表示
              </>
            )
            : '全0件'}
        </div>
      </div>

      {/* ページング */}
      {meta ? (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#495057', fontSize: '0.9rem' }}>表示件数</span>
            <select
              value={limit}
              onChange={(e) => {
                const v = Number(e.target.value || '50')
                setLimit(v)
                setPage(1)
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '0.9rem',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
              disabled={busy}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page === 1 || busy}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: page === 1 || busy ? '#e9ecef' : '#fff',
                color: page === 1 || busy ? '#adb5bd' : '#495057',
                cursor: page === 1 || busy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {'<<'}
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || busy}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: page === 1 || busy ? '#e9ecef' : '#fff',
                color: page === 1 || busy ? '#adb5bd' : '#495057',
                cursor: page === 1 || busy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {'<'}
            </button>
            <div style={{ color: '#495057', fontSize: '0.9rem' }}>
              {page} / {Math.max(1, Math.ceil((meta.total || 0) / limit))}
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil((meta.total || 0) / limit) || busy}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: page >= Math.ceil((meta.total || 0) / limit) || busy ? '#e9ecef' : '#fff',
                color: page >= Math.ceil((meta.total || 0) / limit) || busy ? '#adb5bd' : '#495057',
                cursor: page >= Math.ceil((meta.total || 0) / limit) || busy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {'>'}
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.max(1, Math.ceil((meta.total || 0) / limit)))}
              disabled={page >= Math.ceil((meta.total || 0) / limit) || busy}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: page >= Math.ceil((meta.total || 0) / limit) || busy ? '#e9ecef' : '#fff',
                color: page >= Math.ceil((meta.total || 0) / limit) || busy ? '#adb5bd' : '#495057',
                cursor: page >= Math.ceil((meta.total || 0) / limit) || busy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {'>>'}
            </button>
          </div>
        </div>
      ) : null}

      {/* 一覧テーブル */}
      {rows.length > 0 ? (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    カバー（cover）
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    タイトル（title）
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    状態（status）
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    スラッグ（slug）
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    公開日時（published）
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    更新日時（updated）
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#495057', fontSize: '0.85rem' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c: any, index) => (
                  <tr
                    key={c.column_id}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                      borderBottom: '1px solid #e9ecef',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e9ecef'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f8f9fa'
                    }}
                  >
                    <td style={{ padding: '10px 12px', textAlign: 'center', width: 92 }}>
                      {c.cover_image_url ? (
                        <a href={c.cover_image_url} target="_blank" rel="noreferrer" title="open cover image">
                          <img
                            src={c.cover_image_url}
                            alt="cover"
                            style={{
                              width: 64,
                              height: 64,
                              objectFit: 'cover',
                              borderRadius: 8,
                              border: '1px solid #e9ecef',
                              backgroundColor: '#f8f9fa',
                            }}
                          />
                        </a>
                      ) : (
                        <span style={{ color: '#adb5bd', fontSize: '0.8rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.95rem', color: '#212529', minWidth: 320 }}>
                      <div style={{ fontWeight: 600 }}>{c.title || '(no title)'}</div>
                      {c.excerpt ? (
                        <div style={{ marginTop: 6, fontSize: '0.85rem', color: '#6c757d' }}>
                          {String(c.excerpt).length > 90 ? `${String(c.excerpt).slice(0, 90)}...` : String(c.excerpt)}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#212529' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          backgroundColor: c.status === 'published' ? '#d4edda' : c.status === 'archived' ? '#e2e3e5' : '#fff3cd',
                          color: c.status === 'published' ? '#155724' : c.status === 'archived' ? '#383d41' : '#856404',
                          borderRadius: '999px',
                          fontWeight: 600,
                          fontFamily: 'monospace',
                        }}
                      >
                        {c.status === 'published' ? '公開（published）' : c.status === 'archived' ? 'アーカイブ（archived）' : '下書き（draft）'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6c757d', fontFamily: 'monospace' }}>
                      {c.slug ? `/${c.slug}` : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.85rem', color: '#6c757d' }}>
                      {c.published_at ? new Date(c.published_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.85rem', color: '#6c757d' }}>
                      {c.updated_at ? new Date(c.updated_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <Link
                          href={`/admin/columns/${c.column_id}?lang=${lang}`}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#007bff',
                            color: '#fff',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#0056b3'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#007bff'
                          }}
                        >
                          編集
                        </Link>
                        <button
                          type="button"
                          onClick={() => void deleteColumn(c)}
                          disabled={busy || rowDeleteBusyId === c.column_id}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: rowDeleteBusyId === c.column_id ? '#6c757d' : '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: rowDeleteBusyId === c.column_id ? 'not-allowed' : 'pointer',
                          }}
                          title="コラムを削除"
                        >
                          {rowDeleteBusyId === c.column_id ? '削除中…' : '削除'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '40px 20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center',
            color: '#6c757d',
          }}
        >
          <div style={{ fontSize: '1rem', marginBottom: 8 }}>コラムがありません</div>
          <div style={{ fontSize: '0.9rem' }}>条件を変えるか、新規作成してください。</div>
        </div>
      )}
    </main>
  )
}

