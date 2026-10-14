import { useEffect, useRef } from 'react'

interface Props {
  quote?: string
  author?: string
  authorTitle?: string
}

const SEED = {
  quote: 'Tôi không mở nhà hàng để bán thức ăn —\ntôi tạo ra nơi mà con người\ncảm thấy được trân trọng.',
  author: 'Nguyễn Minh Khôi',
  authorTitle: 'Nhà sáng lập',
}

export function SiteManifesto({ quote, author, authorTitle }: Props) {
  const q = quote ?? SEED.quote
  const a = author ?? SEED.author
  const t = authorTitle ?? SEED.authorTitle
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('sc-visible'); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} className="mfst-wrap sc-fade" aria-label="Triết lý">
      <div className="mfst-inner">
        <span className="mfst-open-mark" aria-hidden="true">"</span>
        <blockquote className="mfst-quote">
          {q.split('\n').map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </blockquote>
        <footer className="mfst-attr">
          <div className="mfst-rule" aria-hidden="true" />
          <div className="mfst-attr-text">
            <strong className="mfst-name">{a}</strong>
            <span className="mfst-title">{t}</span>
          </div>
        </footer>
      </div>
    </section>
  )
}
