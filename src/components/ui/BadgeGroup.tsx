import { Badge } from './Badge'

export interface BadgeItem {
  type: 'tone' | 'info' | 'time'
  label: string
}

export interface BadgeGroupProps {
  items: BadgeItem[]
  className?: string
}

/**
 * BadgeGroup: tone/info/time の表示ルールを固定
 * - 最大3つまで（tone/info/time 各1つ）
 * - 順序：tone → info → time
 */
export function BadgeGroup({ items, className }: BadgeGroupProps) {
  // 順序：tone → info → time
  const sorted = items
    .filter((item) => item.type === 'tone')
    .concat(items.filter((item) => item.type === 'info'))
    .concat(items.filter((item) => item.type === 'time'))
    .slice(0, 3) // 最大3つまで

  if (sorted.length === 0) return null

  return (
    <div className={className} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {sorted.map((item, index) => (
        <Badge key={index} variant={item.type} emphasis={item.type === 'time' ? 'outline' : 'soft'}>
          {item.label}
        </Badge>
      ))}
    </div>
  )
}

