import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  // 静的アセットは素通し
  const p = req.nextUrl.pathname
  if (
    p.startsWith('/_next/') ||
    p.startsWith('/api/') ||
    p === '/robots.txt' ||
    p === '/sitemap.xml' ||
    p === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // ルート以外は自動振り分けしない（既存の /jp や /us などを壊さない）
  if (p !== '/') {
    const redirect308Absolute = (target: URL) => {
      // NextResponse は環境により Location を相対化することがあるため、
      // SEO事故を避ける目的で、標準 Response で絶対URLの Location を固定して返す。
      return new Response(null, {
        status: 308,
        headers: {
          Location: target.toString(),
          // Optional: some clients still look at Refresh; keep it consistent.
          Refresh: `0;url=${target.toString()}`,
        },
      })
    }

    // 英語圏（US/CA/UK）のコラム・名言は「同一コンテンツ」運用のため、/en に恒久集約（308）
    // - /{us|ca|uk}/columns/* → /en/columns/*
    // - /{us|ca|uk}/quotes/* → /en/quotes/*
    // - クエリは「検索用」(q) と表示モード系（gentle/allow_important）のみ維持（他は捨てて一本化）
    const mEn = p.match(/^\/(us|uk|ca)\/(columns|quotes)(\/.*)?\/?$/)
    if (mEn) {
      const kind = mEn[2]
      const rest = mEn[3] || ''
      const target = new URL(`/en/${kind}${rest}`, req.url)
      const sp = req.nextUrl.searchParams
      const keep = new URLSearchParams()
      const q = sp.get('q')
      const theme = sp.get('theme')
      const gentle = sp.get('gentle')
      const allowImportant = sp.get('allow_important')
      if (q) keep.set('q', q)
      if (theme) keep.set('theme', theme)
      if (gentle) keep.set('gentle', gentle)
      if (allowImportant) keep.set('allow_important', allowImportant)
      const qs = keep.toString()
      target.search = qs ? `?${qs}` : ''
      return redirect308Absolute(target)
    }

    // 英語圏（US/CA/UK）の About も /en に恒久集約（308）
    const mEnAbout = p.match(/^\/(us|uk|ca)\/about\/?$/)
    if (mEnAbout) {
      const target = new URL(`/en/about`, req.url)
      const sp = req.nextUrl.searchParams
      const keep = new URLSearchParams()
      const gentle = sp.get('gentle')
      if (gentle) keep.set('gentle', gentle)
      const qs = keep.toString()
      target.search = qs ? `?${qs}` : ''
      return redirect308Absolute(target)
    }

    // 旧URL → 正URL の恒久集約（308）
    // - /{country}/news?category={cat} → /{country}/category/{cat}
    // - category棚を「正URL」として固定する（SEO評価の分散を防ぐ）
    // - q（検索語）がある場合は「検索結果」扱いとして /news に残す（noindex運用）
    const mNews = p.match(/^\/(us|uk|ca|jp)\/news\/?$/)
    if (mNews) {
      const sp = req.nextUrl.searchParams
      if (!sp.has('q') && sp.has('category')) {
        const country = mNews[1] as 'us' | 'uk' | 'ca' | 'jp'
        const cat = String(sp.get('category') || '').trim()
        const allowed = new Set([
          'heartwarming',
          'science_earth',
          'politics',
          'health',
          'technology',
          'arts',
          'business',
          'sports',
        ])
        if (allowed.has(cat)) {
          const target = new URL(`/${country}/category/${cat}`, req.url)
          // view系パラメータのみは維持（ユーザー意図）。それ以外は捨てて一本化。
          const gentle = sp.get('gentle')
          const allowImportant = sp.get('allow_important')
          target.search = ''
          if (gentle) target.searchParams.set('gentle', gentle)
          if (allowImportant) target.searchParams.set('allow_important', allowImportant)
          // Location を絶対URLで統一（環境差の事故を減らす）
          return redirect308Absolute(target)
        }
      }
    }

    // `/[country]/daily/today` は恒久リダイレクト専用（最終到達URLを日付URL・クエリなしに一本化）
    // - redirect() は 307 相当になりがちなので、ここで 308 を強制する
    // - gentle 等のクエリも付けない（評価分散/重複候補を減らす）
    const mDailyToday = p.match(/^\/(us|uk|ca|jp)\/daily\/today\/?$/)
    if (mDailyToday) {
      const country = mDailyToday[1] as 'us' | 'uk' | 'ca' | 'jp'
      // 公開用: USE_MOCK_DATA=1 のときは API を叩かず一覧へ
      if (process.env.USE_MOCK_DATA === '1') {
        const target = new URL(`/${country}/daily`, req.url)
        target.search = ''
        return new Response(null, {
          status: 308,
          headers: { Location: target.toString(), Refresh: `0;url=${target.toString()}` },
        })
      }
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.API_BASE_URL ||
        process.env.TGL_API_BASE_URL ||
        'http://localhost:8080'
      const normalize = (v: string) => (v && v.includes('T') ? v.slice(0, 10) : v)
      const fetchJson = async (path: string) => {
        const url = `${String(base).replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
        const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' })
        if (!res.ok) throw new Error(`API ${res.status}`)
        return res.json() as Promise<any>
      }
      try {
        const todayRes = await fetchJson(`/v1/${country}/today`)
        const today = String(todayRes?.date || '').trim()
        if (today && todayRes?.daily?.daily_id) {
          const target = new URL(`/${country}/daily/${today}`, req.url)
          target.search = ''
          return redirect308Absolute(target)
        }
        const home = await fetchJson(`/v1/${country}/home?limit=1`)
        const latestDailyDate = normalize(String(home?.daily_latest?.date_local || '').trim())
        const target = latestDailyDate || today
        const targetUrl = new URL(target ? `/${country}/daily/${target}` : `/${country}/daily`, req.url)
        targetUrl.search = ''
        return redirect308Absolute(targetUrl)
      } catch {
        const target = new URL(`/${country}/daily`, req.url)
        target.search = ''
        return redirect308Absolute(target)
      }
    }

    // guestのGentleModeはCookieを正にする（URLパラメータが無い場合は付与してSSRでも反映）
    // - 既存実装は query param を参照する箇所が多いため、cookie→URL をここでブリッジする
    const hasGentleParam = req.nextUrl.searchParams.has('gentle')
    const gentleCookie = req.cookies.get('tgl_gentle_mode')?.value
    const cookieGentleOn = gentleCookie === '1' || gentleCookie === 'true'
    if (!hasGentleParam && cookieGentleOn) {
      const url = req.nextUrl.clone()
      url.searchParams.set('gentle', '1')
      return NextResponse.redirect(url)
    }

    // 後段のServer Componentでパス判定できるように、pathnameをヘッダで渡す
    const h = new Headers(req.headers)
    h.set('x-tgl-pathname', p)
    return NextResponse.next({ request: { headers: h } })
  }

  // / は「国選択（ルート表示）」を優先する（意図して直打ちしてくる人のため）
  const res = NextResponse.next()
  // IMPORTANT: `/` はHTMLなので長期キャッシュさせない（404の強キャッシュ事故を防ぐ）
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.headers.set('Pragma', 'no-cache')
  res.headers.set('Expires', '0')
  // CDN側も明示的に抑止（Cloudflare等）
  res.headers.set('CDN-Cache-Control', 'no-store')
  res.headers.set('Surrogate-Control', 'no-store')
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}

