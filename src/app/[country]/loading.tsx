import { headers } from 'next/headers'
import { isCountry } from '@/lib/tglApi'
import { getLocaleForCountry } from '@/lib/i18n'

export default function Loading() {
  const h = headers()
  const pathname = h.get('x-tgl-pathname') || ''
  const m = pathname.match(/^\/([^/]+)/)
  const country = m?.[1]
  const isJa = country && isCountry(country) ? getLocaleForCountry(country) === 'ja' : false
  return (
    <div className="tglRow">
      <div className="tglRowTitle">{isJa ? '読み込み中…' : 'Loading…'}</div>
      <div className="tglRowMeta">{isJa ? '少し待ってください' : 'Please wait a moment.'}</div>
    </div>
  )
}


