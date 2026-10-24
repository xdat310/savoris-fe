import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SiteMilestone } from '../../api/site'
import { Md } from '../../lib/md'

const PER_PAGE_DESKTOP = 3
const PER_PAGE_MOBILE = 1

interface Props { milestones?: SiteMilestone[] }

export function SiteTimeline({ milestones }: Props) {
  const data = [...(milestones ?? [])].sort((a, b) => a.order - b.order)

  const [idx, setIdx] = useState(0)
  const [mobile, setMobile] = useState(false)
  const startX = useRef<number | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 720)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const perPage = mobile ? PER_PAGE_MOBILE : PER_PAGE_DESKTOP
  const maxIdx = Math.max(0, data.length - perPage)
  const canPrev = idx > 0
  const canNext = idx < maxIdx
  const visible = data.slice(idx, idx + perPage)

  function prev() { setIdx((i) => Math.max(0, i - 1)) }
  function next() { setIdx((i) => Math.min(maxIdx, i + 1)) }

  // Keyboard
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    const el = trackRef.current
    el?.addEventListener('keydown', handler)
    return () => el?.removeEventListener('keydown', handler)
  })

  if (data.length === 0) return null

  // Touch swipe
  function onPointerDown(e: React.PointerEvent) { startX.current = e.clientX }
  function onPointerUp(e: React.PointerEvent) {
    if (startX.current === null) return
    const dx = e.clientX - startX.current
    if (dx < -40) next()
    if (dx > 40) prev()
    startX.current = null
  }

  return (
    <section className="tl-wrap" aria-label="Hành trình của chúng tôi">
      <div className="tl-head">
        <h2 className="tl-title">Hành trình</h2>
        <div className="tl-controls">
          <button className="tl-arrow" onClick={prev} disabled={!canPrev} aria-label="Lùi">
            <ChevronLeft size={20} />
          </button>
          <button className="tl-arrow" onClick={next} disabled={!canNext} aria-label="Tiến">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="tl-track-wrap">
        {/* Gold horizontal line */}
        <div className="tl-line" aria-hidden="true" />

        <div
          className="tl-track"
          ref={trackRef}
          tabIndex={0}
          aria-label="Dòng thời gian — dùng phím ← → để điều hướng"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {visible.map((m) => (
            <div key={m.id} className="tl-item">
              <p className="tl-year">{m.year}</p>
              <div className="tl-dot" aria-hidden="true" />
              <strong className="tl-item-title">{m.title}</strong>
              <Md className="tl-desc">{m.description}</Md>
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="tl-indicators" aria-hidden="true">
        {Array.from({ length: maxIdx + 1 }).map((_, i) => (
          <button
            key={i}
            className={`tl-dot-ind${i === idx ? ' tl-dot-ind--on' : ''}`}
            onClick={() => setIdx(i)}
            aria-label={`Trang ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
