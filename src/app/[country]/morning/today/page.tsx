import { redirect, notFound } from 'next/navigation'
import { isCountry } from '@/lib/tglApi'

export default function MorningTodayPage({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()
  redirect(`/${country}/daily/today`)
}
