'use client'

import { useMemo, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

type Props = {
  open: boolean
  imageSrc: string | null
  onClose: () => void
  onApply: (file: File, previewUrl: string) => void
  maxWidth?: number
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
  maxWidth: number
  targetWidth: number
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

  // output size (cap by maxWidth, and allow further downscale by targetWidth; never upscale)
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

  return new File([blob], 'cover.jpg', { type: 'image/jpeg' })
}

export function CoverImageCropperModal({ open, imageSrc, onClose, onApply, maxWidth = 1200 }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aspectPreset, setAspectPreset] = useState<'3:2' | '4:3' | '1:1' | '16:9'>('3:2')
  const [targetWidth, setTargetWidth] = useState(maxWidth)

  const canApply = open && !!imageSrc && !!croppedAreaPixels && !busy

  const header = useMemo(() => {
    return `カバー画像を調整（最大横幅 ${maxWidth}px）`
  }, [maxWidth])

  const effectiveAspect = aspectPreset === '3:2' ? 3 / 2 : aspectPreset === '4:3' ? 4 / 3 : aspectPreset === '1:1' ? 1 : 16 / 9

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
            onClick={onClose}
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
              aspect={effectiveAspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              objectFit="horizontal-cover"
              // allow moving image even when zoomed out and blank margins exist
              restrictPosition={false}
            />
          ) : null}
        </div>

        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          {error ? <div style={{ color: '#b00020', whiteSpace: 'pre-wrap' }}>{error}</div> : null}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ color: '#495057', fontSize: '0.9rem', fontWeight: 700, marginRight: 6 }}>縦横比</div>
            {(
              [
                { key: '3:2', label: '3:2' },
                { key: '4:3', label: '4:3' },
                { key: '1:1', label: '1:1' },
                { key: '16:9', label: '16:9' },
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

          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ color: '#495057', fontSize: '0.9rem', fontWeight: 600 }}>ズーム</div>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
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
              onClick={onClose}
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
                  const file = await cropAndResizeToFile({
                    imageSrc,
                    cropPixels: croppedAreaPixels,
                    maxWidth,
                    targetWidth,
                  })
                  const previewUrl = URL.createObjectURL(file)
                  onApply(file, previewUrl)
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


