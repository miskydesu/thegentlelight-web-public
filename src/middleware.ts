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
      // NextResponse.redirect() は環境により Location を相対化することがあるため、
      // SEO事故を避ける目的で Location を絶対URLに固定して返す。
      return new NextResponse(null, {
        status: 308,
        headers: {
          Location: target.toString(),
        },
      })
    }

    // 旧URL → 正URL の恒久集約（308）
    // - /{country}/news?category={cat} → /{country}/category/{cat}
    // - Googleが旧URLに触れた瞬間に正URLへ寄せて、重複を掃除する
    const mNews = p.match(/^\/(us|uk|ca|jp)\/news\/?$/)
    if (mNews) {
      const keys = Array.from(req.nextUrl.searchParams.keys())
      // safety: category だけが付いている場合のみ寄せる（q/cursor等が混ざる検索はそのまま）
      if (keys.length === 1 && keys[0] === 'category') {
        const country = mNews[1] as 'us' | 'uk' | 'ca' | 'jp'
        const cat = String(req.nextUrl.searchParams.get('category') || '').trim()
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
          target.search = ''
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
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}

