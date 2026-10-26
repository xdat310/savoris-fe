import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { HeroConfig } from '../../api/site'
import { Md } from '../../lib/md'
import { cloudinaryDeliveryUrl } from '../../lib/cloudinary'
import { Link } from 'react-router-dom'

const FALLBACK: HeroConfig = {
  type: 'image',
  media: [],
  overlay_opacity: 0.45,
  badge_enabled: false,
  badge_line1: 'ĐƯỢC YÊU THÍCH',
  badge_line2: '2026',
  brand_name: 'SAVORIS',
  description: '',
  cta_text: 'ĐẶT BÀN',
  cta_link: '#dat-ban',
}

// Serve a high-quality source for large and high-density displays.
function cdnUrl(url: string, width: number) {
  return cloudinaryDeliveryUrl(url, `f_auto,q_auto:best,w_${width}`)
}

function heroSrcSet(url: string) {
  return `${cdnUrl(url, 1280)} 1280w, ${cdnUrl(url, 1920)} 1920w, ${cdnUrl(url, 2560)} 2560w`
}

interface Props {
  config?: HeroConfig | null
}

export function SiteHero({ config }: Props) {
  const c = config ?? FALLBACK
  const description = c.description.trim()
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
                srcSet={heroSrcSet(m.url)}
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
              srcSet={heroSrcSet(c.media[0].url)}
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
        {c.badge_enabled && (c.badge_line1 || c.badge_line2) && (
          <div className="sh-hero-badge">{c.badge_line1 && <span>{c.badge_line1}</span>}{c.badge_line2 && <span>{c.badge_line2}</span>}</div>
        )}
        <h1 className="sh-hero-brand">{c.brand_name?.trim() || 'SAVORIS'}</h1>
        <Md className="sh-hero-desc">{description}</Md>

        <div className="sh-hero-cta-wrap">
          <div className="sh-hero-rule" aria-hidden="true" />
          <Link className="sh-hero-cta" to="/dat-ban">Đặt bàn</Link>
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
