import { ArrowUpRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cloudinaryDeliveryUrl } from '../../lib/cloudinary'

export interface StorySectionItem {
  id?: string | number
  kicker?: string
  title?: string
  body?: string
  imageUrl?: string
  imageAlt?: string
  imageStyle?: 'FEATHERED' | 'ON_BLACK'
  linkText?: string
  linkUrl?: string
  visible?: boolean
  sortOrder?: number
}

function StoryRow({ item, index }: { item: StorySectionItem; index: number }) {
  const row = useRef<HTMLElement>(null)
  const media = useRef<HTMLDivElement>(null)
  const reversed = index % 2 === 1
  useEffect(() => {
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const element = row.current
    if (!element) return
    if (reduce || !('IntersectionObserver' in window)) { element.classList.add('story-editorial--visible'); return }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { element.classList.add('story-editorial--visible'); observer.unobserve(element) }
    }), { threshold: .12 })
    observer.observe(element)
    if (media.current) {
      const target = media.current
      const onScroll = () => {
        const rect = element.getBoundingClientRect()
        const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - (rect.top + rect.height / 2)) / window.innerHeight))
        target.style.setProperty('--story-parallax', `${progress * -24}px`)
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      onScroll()
      return () => { observer.disconnect(); window.removeEventListener('scroll', onScroll) }
    }
    return () => observer.disconnect()
  }, [])
  const href = item.linkUrl?.trim()
  const linkValid = href && !/^(javascript|data|vbscript):/i.test(href)
  return <article ref={row} className={`story-editorial${reversed ? ' story-editorial--reverse' : ''}`}>
    {item.imageUrl && <div ref={media} className={`story-editorial__media story-editorial__media--${item.imageStyle === 'ON_BLACK' ? 'black' : 'feathered'}`}>
      <img src={cloudinaryDeliveryUrl(item.imageUrl, 'f_auto,q_auto,w_1400')} alt={item.imageAlt || item.title || ''} loading={index === 0 ? 'eager' : 'lazy'} decoding="async"/>
    </div>}
    <div className="story-editorial__copy"><span className="story-editorial__number">{String(index + 1).padStart(2, '0')}</span>
      {item.kicker && <p className="story-editorial__kicker">{item.kicker}</p>}
      {item.title && <h2>{item.title.split('\n').map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br/>}{line}</span>)}</h2>}
      {item.body && <p className="story-editorial__body">{item.body}</p>}
      {item.linkText && linkValid && <a className="story-editorial__link" href={href}>{item.linkText}<ArrowUpRight size={16}/></a>}
    </div>
  </article>
}

export function StorySections({ items = [], id = 've-chung-toi' }: { items?: StorySectionItem[]; id?: string }) {
  const sections = (Array.isArray(items) ? items : []).filter(item => item.visible !== false && (item.title || item.body || item.imageUrl))
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
  if (!sections.length) return null
  return <section className="story-editorial-list" id={id} aria-label="Câu chuyện Savoris">
    {sections.map((item, index) => <StoryRow key={item.id ?? index} item={item} index={index}/>) }
  </section>
}
