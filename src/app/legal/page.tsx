export const metadata = {
  // Root layout の title.template による重複を避けるため absolute を使用
  title: { absolute: '利用規約・プライバシーポリシー - The Gentle Light' },
}

import { redirect } from 'next/navigation'

export default function LegalRedirect({ searchParams }: { searchParams: { gentle?: string } }) {
  const gentle = searchParams?.gentle === '1' || searchParams?.gentle === 'true'
  redirect(`/jp/legal${gentle ? '?gentle=1' : ''}`)
}

