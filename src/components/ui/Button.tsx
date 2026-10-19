import type { LucideIcon } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Icon } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'xl'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  /** Square icon-only button; `label` becomes its accessible name and tooltip. */
  iconOnly?: boolean
  label?: string
  loading?: boolean
  block?: boolean
}

/** Glass button: primary (gold glow), secondary (neutral glass), ghost, danger. Sizes 32 / 40 / 48 / 56 px. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, iconOnly, label, loading, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  const cls = [
    'btn',
    variant !== 'secondary' && `btn-${variant}`,
    size !== 'md' && `btn-${size}`,
    iconOnly && 'btn-icon',
    block && 'btn-block',
    className,
  ].filter(Boolean).join(' ')
  const iconSize = size === 'xl' ? 'touch' : size === 'lg' ? 20 : 'md'
  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      aria-label={iconOnly ? label : rest['aria-label']}
      data-tip={iconOnly ? label : undefined}
      {...rest}
    >
      {icon && <Icon icon={icon} size={iconSize} />}
      {!iconOnly && children}
    </button>
  )
})
