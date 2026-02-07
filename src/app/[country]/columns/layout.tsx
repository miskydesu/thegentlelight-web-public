import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { isCountry } from '@/lib/tglApi'
import { getCountrySeoMeta } from '@/lib/seo'

export const runtime = 'edge'

export function generateMetadata({ params }: { params: { country: string } }): Metadata {
  const country = isCountry(params.country) ? params.country : null
  const isJa = params.country === 'jp'
  const countrySuffix = country ? getCountrySeoMeta(country).titleSuffix : ''

  // Columns はタイトルが長くなりがちなので、columns配下だけブランド表記を短縮（TGL）する
  // - 親layout（/[country]/layout.tsx）の template を上書き
  // - 国差分（titleSuffix）は維持して、重複扱いされにくい形を保つ
  return {
    title: {
      default: isJa ? 'TGL' : 'TGL',
      template: isJa ? `%s | やさしいニュース TGL${countrySuffix}` : `%s | TGL${countrySuffix}`,
    },
  }
}

export default function CountryColumnsLayout({ children }: { children: ReactNode }) {
  return children
}

