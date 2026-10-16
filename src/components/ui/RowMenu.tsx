import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'

export interface RowMenuItem {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

/** The "⋯" button that holds a table row's secondary actions. Keyboard: Enter/Space opens, arrows move, Esc closes. */
export function RowMenu({ items, label = 'Thêm thao tác' }: { items: RowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); btn.current?.focus() }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const all = [...(wrap.current?.querySelectorAll<HTMLButtonElement>('.menu-item:not(:disabled)') ?? [])]
        const i = all.indexOf(document.activeElement as HTMLButtonElement)
        all[(i + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length]?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    wrap.current?.querySelector<HTMLButtonElement>('.menu-item:not(:disabled)')?.focus()
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  function toggle() {
    // open upwards when the row sits near the bottom of the window
    const r = btn.current?.getBoundingClientRect()
    setUp(!!r && window.innerHeight - r.bottom < 56 + items.length * 40)
    setOpen((v) => !v)
  }

  return (
    <div className="menu-wrap" ref={wrap}>
      <button
        ref={btn}
        type="button"
        className="btn btn-ghost btn-icon btn-sm"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
      >
        <Icon icon={MoreHorizontal} />
      </button>
      {open && (
        <div id={menuId} className={`menu-pop${up ? ' menu-pop--up' : ''}`} role="menu">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              className={`menu-item${it.danger ? ' menu-item--danger' : ''}`}
              disabled={it.disabled}
              onClick={() => { setOpen(false); it.onSelect() }}
            >
              {it.icon && <Icon icon={it.icon} />}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
