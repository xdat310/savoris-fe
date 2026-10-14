import { useRef } from 'react'
import type { SiteFounder as FounderData } from '../../api/site'

const SEED: FounderData = {
  portrait_url: '',
  portrait_public_id: '',
  name: 'Nguyễn Minh Khôi',
  title: 'Nhà sáng lập kiêm Giám đốc Điều hành',
  quote: 'Tôi không mở nhà hàng để bán thức ăn — tôi tạo ra nơi mà con người cảm thấy được trân trọng.',
  bio: 'Với hơn 20 năm trong ngành F&B tại Việt Nam và châu Á, Minh Khôi đã từng làm việc cùng các đầu bếp Michelin tại Tokyo và Singapore trước khi trở về Hà Nội để xây dựng Savoris. Triết lý của ông là đơn giản: nguyên liệu tốt nhất, kỹ thuật tốt nhất, và sự chăm chú không ngừng vào từng chi tiết nhỏ nhất.',
}

function useFadeIn(ref: React.RefObject<Element | null>) {
  const done = useRef(false)
  if (typeof window !== 'undefined' && !done.current) {
    const check = () => {
      const el = ref.current
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { el.classList.add('sc-visible'); obs.disconnect() } },
        { threshold: 0.12 }
      )
      obs.observe(el)
      done.current = true
    }
    // Defer to after mount
    setTimeout(check, 0)
  }
}

interface Props { founder?: FounderData | null }

export function SiteFounder({ founder }: Props) {
  const d = founder ?? SEED
  const ref = useRef<HTMLElement>(null)
  useFadeIn(ref as React.RefObject<Element>)

  return (
    <section ref={ref} className="fdr-wrap sc-fade" aria-label="Người sáng lập" id="ve-chung-toi">
      {/* Portrait */}
      <div className="fdr-portrait">
        {d.portrait_url
          ? <img src={d.portrait_url} alt={`Chân dung ${d.name}`} loading="lazy" />
          : <div className="fdr-portrait-ph" aria-hidden="true" />}
      </div>

      {/* Content */}
      <div className="fdr-content">
        <p className="fdr-eyebrow">NGƯỜI SÁNG LẬP</p>
        <h2 className="fdr-name">{d.name}</h2>
        <p className="fdr-title-text">{d.title}</p>

        <blockquote className="fdr-quote">
          <span className="fdr-quote-mark" aria-hidden="true">"</span>
          {d.quote}
          <span className="fdr-quote-mark fdr-quote-mark--close" aria-hidden="true">"</span>
        </blockquote>

        <p className="fdr-bio">{d.bio}</p>

        {d.signature_url && (
          <img className="fdr-sig" src={d.signature_url} alt={`Chữ ký ${d.name}`} loading="lazy" />
        )}
      </div>
    </section>
  )
}
