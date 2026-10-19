import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'

/**
 * Drop-in for `<div className="tabs" role="tablist">`: keeps the existing `.tab[aria-selected]` buttons and
 * slides one glass pill under whichever tab is selected. Overflowing rows scroll sideways with faded edges.
 */
export function TabList({ children, label, className, style }: {
  children: ReactNode
  label?: string
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const list = ref.current
    const pill = pillRef.current
    if (!list || !pill) return

    let first = true
    const place = () => {
      const tab = list.querySelector<HTMLElement>('.tab[aria-selected="true"]')
      list.classList.toggle('tabs--overflow', list.scrollWidth > list.clientWidth + 1)
      if (!tab) { pill.style.opacity = '0'; return }
      // offsetLeft is relative to the list (position: relative), so scrolling does not move the pill off its tab
      pill.style.opacity = '1'
      pill.style.width = `${tab.offsetWidth}px`
      pill.style.transform = `translateX(${tab.offsetLeft}px)`
      if (first) { pill.style.transition = 'none'; void pill.offsetWidth; pill.style.transition = ''; first = false }
      const { left, right } = tab.getBoundingClientRect()
      const box = list.getBoundingClientRect()
      if (left < box.left || right > box.right) tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }

    list.classList.add('tabs--pill')
    place()
    const mo = new MutationObserver(place)
    mo.observe(list, { subtree: true, attributes: true, attributeFilter: ['aria-selected'], childList: true })
    const ro = new ResizeObserver(place)
    ro.observe(list)
    document.fonts?.ready.then(place).catch(() => {})
    return () => { mo.disconnect(); ro.disconnect() }
  }, [])

  return (
    <div ref={ref} className={`tabs${className ? ` ${className}` : ''}`} role="tablist" aria-label={label} style={style}>
      <span ref={pillRef} className="tab-pill" aria-hidden="true" />
      {children}
    </div>
  )
}
