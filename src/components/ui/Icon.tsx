import type { LucideIcon, LucideProps } from 'lucide-react'

/** Standard icon sizes: inline (buttons, tables), nav (sidebar), touch (POS / kitchen big buttons). */
export const ICON_SIZE = { sm: 14, md: 16, nav: 20, touch: 24 } as const

type Props = Omit<LucideProps, 'size'> & {
  icon: LucideIcon
  size?: keyof typeof ICON_SIZE | number
  /** Give a label only when the icon carries meaning on its own; otherwise it is hidden from screen readers. */
  label?: string
}

/** The single way to draw an icon: Lucide outline, 1.5px stroke, colour from currentColor. */
export function Icon({ icon: Glyph, size = 'md', label, strokeWidth = 1.5, ...rest }: Props) {
  const px = typeof size === 'number' ? size : ICON_SIZE[size]
  return (
    <Glyph
      size={px}
      strokeWidth={strokeWidth}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
      {...rest}
    />
  )
}
