import { redirect } from 'next/navigation'

export const metadata = {
  title: 'このサイトについて - The Gentle Light',
}

export default function AboutRedirect({ searchParams }: { searchParams: { gentle?: string } }) {
  const gentle = searchParams?.gentle === '1' || searchParams?.gentle === 'true'
  redirect(`/jp/about${gentle ? '?gentle=1' : ''}`)
}

