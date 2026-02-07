export const metadata = {
  // Root layout の title.template による重複を避けるため absolute を使用
  title: { absolute: '利用規約・プライバシーポリシー - The Gentle Light' },
}

import { permanentRedirect } from 'next/navigation'

export default function LegalRedirect() {
  permanentRedirect('/jp/legal')
}

