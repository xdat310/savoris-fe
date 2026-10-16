import { AlertTriangle, HelpCircle, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Icon } from './Icon'

/** Close on Escape and keep Tab focus inside the open panel; focus returns to the opener on close. */
function useModalFocus(panel: React.RefObject<HTMLElement | null>, onCloseProp: () => void) {
  const closeRef = useRef(onCloseProp)
  useLayoutEffect(() => { closeRef.current = onCloseProp })
  useEffect(() => {
    const onClose = () => closeRef.current()
    const opener = document.activeElement as HTMLElement | null
    const el = panel.current
    const focusables = () => [...(el?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])]
      .filter((n) => !n.hasAttribute('disabled'))
    ;(el?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0])?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab') {
        const f = focusables()
        if (!f.length) return
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.() }
  }, [panel])
}

/** Centered glass dialog. */
export function Dialog({ title, children, actions, onClose, danger, icon }: {
  title: string
  children?: ReactNode
  actions?: ReactNode
  onClose: () => void
  danger?: boolean
  icon?: typeof AlertTriangle
}) {
  const panel = useRef<HTMLDivElement>(null)
  useModalFocus(panel, onClose)
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className={`dialog${danger ? ' dialog--danger' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        {icon && <div className="dialog-icon"><Icon icon={icon} size={20} /></div>}
        <h2 id="dialog-title">{title}</h2>
        {children}
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  )
}

/** Side drawer (forms that do not need a whole page). */
export function Drawer({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  useModalFocus(panel, onClose)
  return (
    <div className="backdrop backdrop--drawer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside ref={panel} className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-head">
          <h2 id="drawer-title">{title}</h2>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Đóng" onClick={onClose}><Icon icon={X} /></button>
        </div>
        {children}
      </aside>
    </div>
  )
}

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

/** Promise-based replacement for window.prompt: resolves with the text, or null when cancelled. */
export function promptDialog(o: { title: string; message?: ReactNode; label: string; confirmLabel?: string; minLength?: number; type?: string }): Promise<string | null> {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const done = (v: string | null) => { resolve(v); root.unmount(); host.remove() }
    root.render(
      <Dialog title={o.title} icon={HelpCircle} onClose={() => done(null)}>
        {o.message && <p>{o.message}</p>}
        <form
          style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}
          onSubmit={(e) => { e.preventDefault(); done(String(new FormData(e.currentTarget).get('value') ?? '')) }}
        >
          <label className="field">{o.label}
            <input className="input" name="value" type={o.type ?? 'text'} required minLength={o.minLength} data-autofocus autoComplete="new-password" />
          </label>
          <div className="dialog-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn" onClick={() => done(null)}>Huỷ</button>
            <button type="submit" className="btn btn-primary">{o.confirmLabel ?? 'Lưu'}</button>
          </div>
        </form>
      </Dialog>,
    )
  })
}

/**
 * Promise-based replacement for window.confirm, drawn as a glass dialog:
 *   if (!(await confirmDialog({ title: 'Cho Lan nghỉ việc?', danger: true }))) return
 */
export function confirmDialog(opts: ConfirmOptions | string): Promise<boolean> {
  const o: ConfirmOptions = typeof opts === 'string' ? { title: opts } : opts
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const done = (ok: boolean) => {
      resolve(ok)
      root.unmount()
      host.remove()
    }
    root.render(
      <Dialog
        title={o.title}
        danger={o.danger}
        icon={o.danger ? AlertTriangle : HelpCircle}
        onClose={() => done(false)}
        actions={
          <>
            <button type="button" className="btn" onClick={() => done(false)}>{o.cancelLabel ?? 'Huỷ'}</button>
            <button type="button" className={`btn ${o.danger ? 'btn-danger' : 'btn-primary'}`} data-autofocus onClick={() => done(true)}>
              {o.confirmLabel ?? 'Đồng ý'}
            </button>
          </>
        }
      >
        {o.message && <p>{o.message}</p>}
      </Dialog>,
    )
  })
}
