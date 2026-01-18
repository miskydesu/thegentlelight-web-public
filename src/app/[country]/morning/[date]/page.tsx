import { redirect, notFound } from 'next/navigation'
import { isCountry } from '@/lib/tglApi'

export default function MorningDatePage({ params }: { params: { country: string; date: string } }) {
  const { country, date } = params
  if (!isCountry(country)) return notFound()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return notFound()
  redirect(`/${country}/daily/${date}`)
}
