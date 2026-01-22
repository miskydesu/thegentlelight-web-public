'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './adminNav.module.css'

type NavItem = { href: string; label: string; muted?: boolean }

const NAV: NavItem[] = [
  { href: '/admin', label: 'ホーム' },
  { href: '/admin/summary', label: 'サマリー' },
  { href: '/admin/topics', label: 'トピック' },
  { href: '/admin/quotes', label: '名言' },
  { href: '/admin/quote-authors', label: '名言著者' },
  { href: '/admin/writers', label: 'ライター' },
  { href: '/admin/column-names', label: 'コラム名' },
  { href: '/admin/columns', label: 'コラム' },
  { href: '/admin/jobs', label: 'ジョブ' },
  { href: '/admin/ai-runs', label: 'AI実行ログ' },
  { href: '/admin/job-logs', label: 'ジョブログ' },
]

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminNav() {
  const pathname = usePathname() || ''

  return (
    <nav className={styles.nav} aria-label="Admin navigation">
      {NAV.map((item) => {
        const active = isActivePath(pathname, item.href)
        const className = [
          styles.link,
          active ? styles.active : '',
          item.muted ? styles.muted : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <Link
            key={item.href}
            href={item.href}
            className={className}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

