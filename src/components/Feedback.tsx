import { AlertCircle, Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icon } from './ui/Icon'
import { Skeleton } from './ui/Badge'

/** Skeleton rows while data loads; the label is kept for screen readers. */
export function Loading({ label = 'Đang tải…', rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div className="loading-skel" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="loading-skel-row">
          <Skeleton width={`${28 + ((i * 17) % 20)}%`} />
          <Skeleton width={`${18 + ((i * 11) % 14)}%`} />
          <Skeleton width="12%" />
        </div>
      ))}
    </div>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice notice-bad" role="alert">
      <Icon icon={AlertCircle} />
      <div>
        {message}
        {onRetry && (
          <>
            {' '}
            <button className="btn btn-sm btn-ghost" onClick={onRetry}>Thử lại</button>
          </>
        )}
      </div>
    </div>
  )
}

/** Empty state: icon + one sentence + optional action. */
export function Empty({ title, children, icon = Inbox, action }: {
  title: string
  children?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon icon={icon} size="touch" /></span>
      <strong>{title}</strong>
      {children && <div>{children}</div>}
      {action}
    </div>
  )
}
