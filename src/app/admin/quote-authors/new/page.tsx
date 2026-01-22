'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateQuoteAuthor, adminUploadImage, adminUploadTempImage, clearAdminToken } from '../../../../lib/tglAdminApi'
import { TiptapMarkdownEditor } from '@/components/admin/TiptapMarkdownEditor'

function slugify(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_]+/g, '')
    .replace(/[\s\-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminQuoteAuthorNewPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeLang, setActiveLang] = useState<'ja' | 'en'>('ja')

  const [canonicalKey, setCanonicalKey] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [displayNameJa, setDisplayNameJa] = useState('')
  const [displayNameEn, setDisplayNameEn] = useState('')
  const [aliasesTextJa, setAliasesTextJa] = useState('')
  const [aliasesTextEn, setAliasesTextEn] = useState('')
  const [oneLinerJa, setOneLinerJa] = useState('')
  const [oneLinerEn, setOneLinerEn] = useState('')
  const [type, setType] = useState('philosopher')
  const [detailJa, setDetailJa] = useState('')
  const [detailEn, setDetailEn] = useState('')
  const [seoTitleJa, setSeoTitleJa] = useState('')
  const [seoTitleEn, setSeoTitleEn] = useState('')
  const [seoDescJa, setSeoDescJa] = useState('')
  const [seoDescEn, setSeoDescEn] = useState('')
  const [imageKey, setImageKey] = useState('')
  const [linksJsonJa, setLinksJsonJa] = useState('')
  const [linksJsonEn, setLinksJsonEn] = useState('')
  const [uploadSessionId] = useState(() => (Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 32))
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || ''

  const buildImageUrl = (key: string) => {
    if (!imageBase || !key) return ''
    const b = imageBase.replace(/\/+$/, '')
    const k = key.replace(/^\/+/, '')
    return `${b}/${k}`
  }

  const uploadAuthorImage = async (file: File) => {
    setImageBusy(true)
    try {
      const res = await adminUploadImage(file)
      setImageKey(res.key)
      setImageUrl(res.url || buildImageUrl(res.key))
    } finally {
      setImageBusy(false)
    }
  }

  useEffect(() => {
    if (!canonicalKey) {
      const base = displayNameEn || displayNameJa
      const slug = slugify(base)
      if (slug) setCanonicalKey(slug)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayNameEn, displayNameJa])

  const normalizeAliases = (input: string) =>
    input
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean)

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      const mergedAliases = [...normalizeAliases(aliasesTextJa), ...normalizeAliases(aliasesTextEn)]
      const dedupedAliases = Array.from(
        new Map(
          mergedAliases
            .map((v) => v.trim())
            .filter(Boolean)
            .map((v) => [v.toLowerCase(), v]),
        ).values(),
      )
      let linksJa: any = null
      let linksEn: any = null
      if (linksJsonJa.trim()) {
        linksJa = JSON.parse(linksJsonJa)
      }
      if (linksJsonEn.trim()) {
        linksEn = JSON.parse(linksJsonEn)
      }
      const res = await adminCreateQuoteAuthor({
        canonical_key: canonicalKey,
        is_published: isPublished,
        display_name_ja: displayNameJa,
        display_name_en: displayNameEn,
        aliases: dedupedAliases,
        one_liner_ja: oneLinerJa || null,
        one_liner_en: oneLinerEn || null,
        type: type || null,
        detail_md_ja: detailJa || null,
        detail_md_en: detailEn || null,
        links_ja: linksJa || null,
        links_en: linksEn || null,
        seo_title_ja: seoTitleJa || null,
        seo_title_en: seoTitleEn || null,
        seo_description_ja: seoDescJa || null,
        seo_description_en: seoDescEn || null,
        image_key: imageKey || null,
      })
      router.push(`/admin/quote-authors/${encodeURIComponent(res.author.author_id)}`)
    } catch (err: any) {
      const msg = err?.message || '作成に失敗しました'
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

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>名言著者 新規作成</h1>
        <Link href="/admin/quote-authors" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 700 }}>
          一覧へ戻る
        </Link>
      </div>

      {error ? (
        <div style={{ marginBottom: 16, padding: '12px 16px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 6, border: '1px solid #f5c6cb', whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}

      <section style={{ backgroundColor: '#fff', borderRadius: 8, padding: 20, marginBottom: 16, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>基本情報</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label>
              公開状態
              <select
                value={isPublished ? 'published' : 'draft'}
                onChange={(e) => setIsPublished(e.target.value === 'published')}
                style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6, marginTop: 6 }}
              >
                <option value="published">公開</option>
                <option value="draft">非公開</option>
              </select>
            </label>
            <label>
              人物タイプ
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6, marginTop: 6 }}>
                <option value="philosopher">哲学者</option>
                <option value="writer">作家</option>
                <option value="poet">詩人</option>
                <option value="scientist">科学者</option>
                <option value="politician">政治家</option>
                <option value="activist">活動家</option>
                <option value="artist">芸術家</option>
                <option value="historian">歴史家</option>
                <option value="educator">教育者</option>
                <option value="spiritual">宗教家/精神的指導者</option>
                <option value="other">その他</option>
              </select>
            </label>
          </div>
          <label>
            著者画像
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  void uploadAuthorImage(f)
                  e.currentTarget.value = ''
                }}
              />
              <button
                type="button"
                disabled={imageBusy}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  backgroundColor: '#f8f9fa',
                  fontWeight: 700,
                  cursor: imageBusy ? 'not-allowed' : 'pointer',
                }}
              >
                {imageBusy ? 'アップロード中…' : '画像を選択'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageKey('')
                  setImageUrl(null)
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  backgroundColor: '#fff',
                }}
              >
                クリア
              </button>
            </div>
            {imageUrl ? (
              <div style={{ marginTop: 10 }}>
                <img src={imageUrl} alt="" style={{ maxWidth: 240, width: '100%', borderRadius: 8 }} />
              </div>
            ) : null}
          </label>
          <label>
            画像キー（手入力）
            <input
              value={imageKey}
              onChange={(e) => {
                const next = e.target.value
                setImageKey(next)
                const u = buildImageUrl(next)
                setImageUrl(u || null)
              }}
              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
            />
          </label>
          <label>
            正規化キー（URL）
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={canonicalKey} onChange={(e) => setCanonicalKey(e.target.value)} style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
              <button type="button" onClick={() => setCanonicalKey(slugify(displayNameEn || displayNameJa))} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', backgroundColor: '#f8f9fa' }}>
                生成
              </button>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#6c757d', marginTop: 6 }}>
              例: albert-einstein / mary-oliver。URLと一致判定に使う固定キーです（英小文字・ハイフン推奨）。
              <br />
              ※別名表記ゆれがあっても、正規化キーのURLにまとめることが出来ます。
            </div>
          </label>
        </div>
      </section>

      <section style={{ backgroundColor: '#fff', borderRadius: 8, padding: 20, marginBottom: 16, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>言語別コンテンツ</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setActiveLang('ja')}
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid #ccc',
              backgroundColor: activeLang === 'ja' ? '#212529' : '#f8f9fa',
              color: activeLang === 'ja' ? '#fff' : '#333',
              fontWeight: 700,
            }}
          >
            日本語
          </button>
          <button
            type="button"
            onClick={() => setActiveLang('en')}
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid #ccc',
              backgroundColor: activeLang === 'en' ? '#212529' : '#f8f9fa',
              color: activeLang === 'en' ? '#fff' : '#333',
              fontWeight: 700,
            }}
          >
            English
          </button>
        </div>
        {activeLang === 'ja' ? (
          <>
            <label>
              表示名（日本語）
              <input value={displayNameJa} onChange={(e) => setDisplayNameJa(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
            </label>
            <div style={{ height: 12 }} />
            <label>
              別名/表記ゆれ（日本語）
              <textarea value={aliasesTextJa} onChange={(e) => setAliasesTextJa(e.target.value)} rows={3} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
              <div style={{ fontSize: '0.82rem', color: '#6c757d', marginTop: 6 }}>
                ※英語側と統合して一致判定に使われます。
              </div>
            </label>
            <div style={{ height: 12 }} />
            <label>
              短い紹介（日本語）
              <input value={oneLinerJa} onChange={(e) => setOneLinerJa(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
            </label>
            <div style={{ height: 12 }} />
            <label>
              SEO title（日本語）
              <input value={seoTitleJa} onChange={(e) => setSeoTitleJa(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
            </label>
            <div style={{ height: 12 }} />
            <label>
              SEO description（日本語）
              <textarea value={seoDescJa} onChange={(e) => setSeoDescJa(e.target.value)} rows={3} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
            </label>
            <div style={{ height: 12 }} />
            <label>
              代表リンク（日本語 / JSON）
              <textarea
                value={linksJsonJa}
                onChange={(e) => setLinksJsonJa(e.target.value)}
                rows={3}
                placeholder='例: [{"label":"Wikipedia","url":"https://..."}]'
                style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6, fontFamily: 'monospace' }}
              />
            </label>
            <div style={{ height: 16 }} />
            <div style={{ fontWeight: 700, marginBottom: 8 }}>詳細本文（Markdown）</div>
            <TiptapMarkdownEditor
              value={detailJa}
              onChange={setDetailJa}
              placeholder="日本語の詳細本文を入力…"
              uploadImage={async (file) => {
                const res = await adminUploadTempImage(file, uploadSessionId)
                return { url: res.url }
              }}
            />
          </>
        ) : (
          <>
            <label>
              表示名（英語）
              <input value={displayNameEn} onChange={(e) => setDisplayNameEn(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
            </label>
            <div style={{ height: 12 }} />
            <label>
              別名/表記ゆれ（英語）
              <textarea value={aliasesTextEn} onChange={(e) => setAliasesTextEn(e.target.value)} rows={3} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
              <div style={{ fontSize: '0.82rem', color: '#6c757d', marginTop: 6 }}>
                ※日本語側と統合して一致判定に使われます。
              </div>
            </label>
            <div style={{ height: 12 }} />
            <label>
              短い紹介（英語）
              <input value={oneLinerEn} onChange={(e) => setOneLinerEn(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
            </label>
            <div style={{ height: 12 }} />
            <label>
              SEO title（英語）
              <input value={seoTitleEn} onChange={(e) => setSeoTitleEn(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
            </label>
            <div style={{ height: 12 }} />
            <label>
              SEO description（英語）
              <textarea value={seoDescEn} onChange={(e) => setSeoDescEn(e.target.value)} rows={3} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
            </label>
            <div style={{ height: 12 }} />
            <label>
              代表リンク（英語 / JSON）
              <textarea
                value={linksJsonEn}
                onChange={(e) => setLinksJsonEn(e.target.value)}
                rows={3}
                placeholder='例: [{"label":"Wikipedia","url":"https://..."}]'
                style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6, fontFamily: 'monospace' }}
              />
            </label>
            <div style={{ height: 16 }} />
            <div style={{ fontWeight: 700, marginBottom: 8 }}>詳細本文（Markdown）</div>
            <TiptapMarkdownEditor
              value={detailEn}
              onChange={setDetailEn}
              placeholder="English author profile…"
              uploadImage={async (file) => {
                const res = await adminUploadTempImage(file, uploadSessionId)
                return { url: res.url }
              }}
            />
          </>
        )}
      </section>



      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          style={{
            padding: '10px 18px',
            backgroundColor: busy ? '#6c757d' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 800,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? '保存中…' : '保存'}
        </button>
      </div>
    </main>
  )
}
