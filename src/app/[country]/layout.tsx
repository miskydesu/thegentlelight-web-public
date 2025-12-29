import type { ReactNode } from 'react'
import { isCountry } from '../../lib/tglApi'
import { Header } from '../../components/layout/Header'

export default function CountryLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { country: string }
}) {
  const country = isCountry(params.country) ? params.country : null

  return (
    <>
      <Header country={country} />
      <div className="max-w-[1100px] mx-auto px-5 py-5">{children}</div>
    </>
  )
}


