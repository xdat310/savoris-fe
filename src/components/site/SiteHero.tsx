import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { HeroConfig } from '../../api/site'
import { Md } from '../../lib/md'

const FALLBACK: HeroConfig = {
  type: 'image',
  media: [],
  overlay_opacity: 0.45,
  badge_enabled: false,
  badge_line1: 'ĐƯỢC YÊU THÍCH',
  badge_line2: '2026',
  description: 'Ẩm thực tinh hoa — Không gian đẳng cấp — Trải nghiệm khó quên.',
  cta_text: 'ĐẶT BÀN',
  cta_link: '#dat-ban',
}

// Cloudinary responsive URL helper
function cdnUrl(url: string, width: number) {
  if (!url.includes('cloudinary.com')) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
}

interface Props {
  config?: HeroConfig | null
  onCtaClick?: () => void
  onBookClick?: () => void
}

export function SiteHero({ config, onCtaClick, onBookClick }: Props) {
  const c = config ?? FALLBACK
  const [active, setActive] = useState(0)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hasMedia = c.media.length > 0
  const isSlideshow = c.type === 'slideshow' && c.media.length > 1
  const isVideo = c.type === 'video' && c.media.length > 0

  // Slideshow auto-advance
  useEffect(() => {
    if (!isSlideshow) return
    timerRef.current = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setActive((i) => (i + 1) % c.media.length)
        setFading(false)
      }, 700)
    }, 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isSlideshow, c.media.length])

  function scrollDown() {
    const hero = document.querySelector('.sh-hero')
    if (hero) {
      const next = hero.nextElementSibling as HTMLElement | null
      next?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  function handleCta() {
    if (c.cta_link.startsWith('#')) {
      const el = document.getElementById(c.cta_link.slice(1))
      if (el) { el.scrollIntoView({ behavior: 'smooth' }); return }
    }
    onCtaClick?.()
  }

  const overlayStyle = { '--hero-opacity': c.overlay_opacity } as React.CSSProperties

  return (
    <section className="sh-hero" style={overlayStyle} aria-label="Hero">

      {/* ── Background ── */}
      {isVideo ? (
        <video
          className="sh-hero-bg"
          src={c.media[0].url}
          autoPlay muted loop playsInline
          aria-hidden="true"
        />
      ) : hasMedia ? (
        <>
          {isSlideshow ? (
            c.media.map((m, i) => (
              <img
                key={m.public_id}
                className={`sh-hero-bg sh-hero-slide${i === active ? ' sh-hero-slide--active' : ''}${i === active && fading ? ' sh-hero-slide--fade' : ''}`}
                src={cdnUrl(m.url, 1920)}
                srcSet={`${cdnUrl(m.url, 960)} 960w, ${cdnUrl(m.url, 1440)} 1440w, ${cdnUrl(m.url, 1920)} 1920w`}
                sizes="100vw"
                alt={m.alt ?? ''}
                loading={i === 0 ? 'eager' : 'lazy'}
                aria-hidden="true"
              />
            ))
          ) : (
            <img
              className="sh-hero-bg"
              src={cdnUrl(c.media[0].url, 1920)}
              srcSet={`${cdnUrl(c.media[0].url, 960)} 960w, ${cdnUrl(c.media[0].url, 1440)} 1440w, ${cdnUrl(c.media[0].url, 1920)} 1920w`}
              sizes="100vw"
              alt={c.media[0].alt ?? ''}
              loading="eager"
              aria-hidden="true"
            />
          )}
        </>
      ) : (
        <div className="sh-hero-bg sh-hero-bg--fallback" aria-hidden="true" />
      )}

      {/* Overlay */}
      <div className="sh-hero-overlay" aria-hidden="true" />

      {/* ── Content ── */}
      <div className="sh-hero-content">
        {/* Optional wine-red badge */}
        {c.badge_enabled && (
          <div className="sh-hero-badge" aria-label={`${c.badge_line1} ${c.badge_line2}`}>
            <span>{c.badge_line1}</span>
            <span>{c.badge_line2}</span>
          </div>
        )}

<Md className="sh-hero-desc">{c.description}</Md>

        <div className="sh-hero-cta-wrap">
          <div className="sh-hero-rule" aria-hidden="true" />
          <button className="sh-hero-cta" onClick={handleCta}>{c.cta_text}</button>
          <button className="sh-hero-cta sh-hero-cta--ghost" onClick={onBookClick}>ĐẶT BÀN TRỰC TUYẾN</button>
          <div className="sh-hero-rule" aria-hidden="true" />
        </div>
      </div>

      {/* ── Scroll chevron ── */}
      <button className="sh-hero-chevron" onClick={scrollDown} aria-label="Cuộn xuống">
        <ChevronDown size={28} />
      </button>
    </section>
  )
}
