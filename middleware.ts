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

  // ルートのみ自動振り分け（既存の /jp や /us などを壊さない）
  if (p !== '/') {
    // 後段のServer Componentでパス判定できるように、pathnameをヘッダで渡す
    const h = new Headers(req.headers)
    h.set('x-tgl-pathname', p)
    return NextResponse.next({ request: { headers: h } })
  }

  // 日本判定の場合は、ルートで「国と言語の選択」ページを見せたいのでリダイレクトしない
  if (isJapan(req)) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/us'
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}


