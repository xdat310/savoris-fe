import type { ReactNode } from 'react'
import { ROLE_LABEL, ROLE_TONE } from '../../lib/format'

export type Tone = 'accent' | 'info' | 'warning' | 'success' | 'danger' | 'violet' | 'neutral'

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

/** Each staff role keeps one soft colour everywhere it appears. */
export function RoleBadge({ role }: { role?: string }) {
  if (!role) return null
  return <Badge tone={ROLE_TONE[role] ?? 'neutral'}>{ROLE_LABEL[role] ?? role}</Badge>
}

export function Avatar({ name, size }: { name?: string; size?: 'sm' }) {
  const letter = (name?.trim()?.[0] ?? '?').toUpperCase()
  return <span className={`avatar${size ? ` avatar-${size}` : ''}`} aria-hidden="true">{letter}</span>
}

/** Placeholder bar shown while data loads. */
export function Skeleton({ width = '100%', height = 14, style }: { width?: number | string; height?: number; style?: React.CSSProperties }) {
  return <span className="skel" style={{ width, height, ...style }} aria-hidden="true" />
}
