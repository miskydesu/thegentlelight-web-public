'use client'

import { useMemo, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

type Props = {
  open: boolean
  imageSrc: string | null
  aspect?: number // if set, fixed aspect (no presets UI)
  enableAspectPresets?: boolean // only works when aspect is not set
  maxWidth?: number // hard cap
  defaultWidth?: number // initial target width
  title?: string
  onClose: () => void
  onApply: (file: File) => void | Promise<void>
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (e) => reject(e))
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}

async function cropAndResizeToFile(opts: {
  imageSrc: string
  cropPixels: Area
  targetWidth: number
  maxWidth: number
}): Promise<File> {
  const img = await createImage(opts.imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas context is null')

  // NOTE:
  // When zoomed out and blank margins exist, react-easy-crop can return negative x/y.
  // We must preserve that "padding" (otherwise it becomes left/top aligned).
  const sx0 = Math.floor(opts.cropPixels.x)
  const sy0 = Math.floor(opts.cropPixels.y)
  const sw = Math.max(1, Math.floor(opts.cropPixels.width))
  const sh = Math.max(1, Math.floor(opts.cropPixels.height))

  const cappedTarget = Math.min(opts.targetWidth, opts.maxWidth)
  const outW = Math.max(1, Math.min(sw, Math.floor(cappedTarget)))
  const scale = outW / sw
  const outH = Math.max(1, Math.floor(sh * scale))

  canvas.width = outW
  canvas.height = outH
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // JPEG has no alpha; fill background to avoid black/transparent artifacts
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, outW, outH)

  // Compute src rect inside image and destination offset for padding.
  const leftPad = Math.max(0, -sx0)
  const topPad = Math.max(0, -sy0)
  const rightOver = Math.max(0, sx0 + sw - img.width)
  const bottomOver = Math.max(0, sy0 + sh - img.height)

  const srcX = Math.max(0, sx0)
  const srcY = Math.max(0, sy0)
  const srcW = Math.max(1, sw - leftPad - rightOver)
  const srcH = Math.max(1, sh - topPad - bottomOver)

  const destX = Math.floor(leftPad * scale)
  const destY = Math.floor(topPad * scale)
  const destW = Math.floor(srcW * scale)
  const destH = Math.floor(srcH * scale)

  ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH)

  const blob: Blob = await new Promise((resolve, reject) => {
    const mimeType = 'image/jpeg'
    const quality = 0.88
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), mimeType, quality as any)
  })

  return new File([blob], `image.jpg`, { type: 'image/jpeg' })
}

export function ImageCropperModal({
  open,
  imageSrc,
  aspect,
  enableAspectPresets = true,
  maxWidth = 1200,
  defaultWidth = 1200,
  title,
  onClose,
  onApply,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [targetWidth, setTargetWidth] = useState(defaultWidth)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aspectPreset, setAspectPreset] = useState<'free' | '16:9' | '4:3' | '1:1'>('free')
  const ignoreCloseUntilRef = useRef<number>(0)

  const canApply = open && !!imageSrc && !!croppedAreaPixels && !busy
  const header = useMemo(() => title || `画像をクロップ/縮小（最大横幅 ${maxWidth}px）`, [title, maxWidth])
  const effectiveAspect: number | undefined =
    typeof aspect === 'number'
      ? aspect
      : enableAspectPresets
        ? aspectPreset === '16:9'
          ? 16 / 9
          : aspectPreset === '4:3'
            ? 4 / 3
            : aspectPreset === '1:1'
              ? 1
              : undefined
        : undefined

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onPointerDown={(e) => {
        // Prevent any "click-through" to underlying UI (can cause unexpected navigation/unmount)
        e.stopPropagation()
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <div
        style={{ width: 'min(980px, 100%)', background: '#fff', borderRadius: 12, overflow: 'hidden' }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700 }}>{header}</div>
          <button
            type="button"
            onClick={() => {
              // Drag終了直後のclick誤爆で閉じるのを防ぐ
              if (Date.now() < ignoreCloseUntilRef.current) return
              onClose()
            }}
            style={{ border: '1px solid #ced4da', background: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 600 }}
          >
            閉じる
          </button>
        </div>

        <div style={{ position: 'relative', height: 520, background: '#111' }}>
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              {...(typeof effectiveAspect === 'number' ? { aspect: effectiveAspect } : {})}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              onInteractionStart={() => {
                // interaction中は閉じ操作を無効化（mouseup clickがボタンに乗る誤爆対策）
                ignoreCloseUntilRef.current = Date.now() + 10_000
              }}
              onInteractionEnd={() => {
                // interaction直後は短時間だけ閉じ操作を無効化
                ignoreCloseUntilRef.current = Date.now() + 300
              }}
              objectFit="horizontal-cover"
              // allow moving image even when zoomed out and blank margins exist
              restrictPosition={false}
            />
          ) : null}
        </div>

        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          {error ? <div style={{ color: '#b00020', whiteSpace: 'pre-wrap' }}>{error}</div> : null}

          {typeof aspect !== 'number' && enableAspectPresets ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ color: '#495057', fontSize: '0.9rem', fontWeight: 700, marginRight: 6 }}>縦横比</div>
              {(
                [
                  { key: 'free', label: 'Free' },
                  { key: '16:9', label: '16:9' },
                  { key: '4:3', label: '4:3' },
                  { key: '1:1', label: '1:1' },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setAspectPreset(p.key)}
                  disabled={busy}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #ced4da',
                    background: aspectPreset === p.key ? '#007bff' : '#fff',
                    color: aspectPreset === p.key ? '#fff' : '#212529',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          ) : null}

          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ color: '#495057', fontSize: '0.9rem', fontWeight: 600 }}>ズーム</div>
            <input type="range" min={0.3} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ color: '#495057', fontSize: '0.9rem', fontWeight: 600 }}>出力横幅（px）</div>
            <input
              type="range"
              min={240}
              max={maxWidth}
              step={10}
              value={Math.min(targetWidth, maxWidth)}
              onChange={(e) => setTargetWidth(Number(e.target.value))}
            />
            <div style={{ color: '#6c757d', fontSize: '0.85rem' }}>width: {Math.min(targetWidth, maxWidth)}px（最大 {maxWidth}px）</div>
          </label>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                if (Date.now() < ignoreCloseUntilRef.current) return
                onClose()
              }}
              disabled={busy}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #ced4da',
                background: '#fff',
                cursor: busy ? 'not-allowed' : 'pointer',
                fontWeight: 700,
              }}
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={!canApply}
              onClick={async () => {
                if (!imageSrc || !croppedAreaPixels) return
                setError(null)
                setBusy(true)
                try {
                  const mimeType = imageSrc.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
                  const file = await cropAndResizeToFile({
                    imageSrc,
                    cropPixels: croppedAreaPixels,
                    targetWidth,
                    maxWidth,
                  })
                  await onApply(file)
                  onClose()
                } catch (e: any) {
                  setError(e?.message || 'クロップに失敗しました')
                } finally {
                  setBusy(false)
                }
              }}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: 'none',
                background: canApply ? '#007bff' : '#6c757d',
                color: '#fff',
                cursor: canApply ? 'pointer' : 'not-allowed',
                fontWeight: 800,
              }}
              title="この内容で確定（最大横幅1200px）"
            >
              {busy ? '処理中…' : '適用'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


