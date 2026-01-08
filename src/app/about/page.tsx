import { redirect } from 'next/navigation'

export const metadata = {
  // Root layout の title.template による重複を避けるため absolute を使用
  title: { absolute: 'このサイトについて - The Gentle Light' },
}

export default function AboutRedirect({ searchParams }: { searchParams: { gentle?: string } }) {
  const gentle = searchParams?.gentle === '1' || searchParams?.gentle === 'true'
  redirect(`/jp/about${gentle ? '?gentle=1' : ''}`)
}

