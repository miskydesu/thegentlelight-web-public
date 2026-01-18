import { NextRequest, NextResponse } from 'next/server'

function isJapan(req: NextRequest): boolean {
  // Vercel / Cloudflare などで提供される国コードヘッダを優先
  const headerCountry =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-country-code')

  if (headerCountry && headerCountry.toUpperCase() === 'JP') return true

  // Next.js (Vercel) の geo 情報がある場合
  const geoCountry = req.geo?.country
  if (geoCountry && geoCountry.toUpperCase() === 'JP') return true

  // 最後の保険: Accept-Language に日本語が含まれていれば日本扱い
  const acceptLanguage = req.headers.get('accept-language') ?? ''
  if (/(^|,)\s*ja([-_][A-Za-z]+)?\s*(;|,|$)/i.test(acceptLanguage)) return true

  return false
}

export function middleware(req: NextRequest) {
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


