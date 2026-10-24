import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublicBranch, SiteNavItem } from '../../api/site'

const FALLBACK_NAV: SiteNavItem[] = [
  { id: 1, label: 'THỰC ĐƠN', link: '#thuc-don', order: 1, visible: true },
  { id: 4, label: 'VỀ CHÚNG TÔI', link: '#ve-chung-toi', order: 2, visible: true },
  { id: 5, label: 'LIÊN HỆ', link: '#lien-he', order: 3, visible: true },
]

interface Props {
  nav?: SiteNavItem[]
  branches?: PublicBranch[]
}

export function SiteHeader({ nav = FALLBACK_NAV }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function handler() { setScrolled(window.scrollY > 40) }
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const visibleNav = (nav.length > 0 ? nav : FALLBACK_NAV)
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order)
  const hasContactLink = visibleNav.some((item) => /lien-he|chi-nhanh|contact|location/i.test(item.link))

  return (
    <>
      <header className={`sh${scrolled ? ' sh--solid' : ''}`} role="banner">
        <div className="sh-inner">
          <Link to="/" className="sh-logo" aria-label="Savoris — trang chủ">
            <span className="sh-logo-text">SAVORIS</span>
          </Link>

          <nav className="sh-nav" aria-label="Điều hướng chính">
            {visibleNav.map((item) => (
              <a key={item.id} className="sh-nav-item" href={item.link}>
                {item.label}
              </a>
            ))}
            {!hasContactLink && <a className="sh-nav-item" href="#lien-he">ĐỊA CHỈ</a>}
            <Link className="sh-cta" to="/dat-ban" aria-label="Đặt bàn">ĐẶT BÀN</Link>
          </nav>

          <button
            className="sh-hamburger"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <div className={`sh-overlay${mobileOpen ? ' sh-overlay--open' : ''}`} aria-hidden={!mobileOpen}>
        <nav className="sh-overlay-nav" aria-label="Menu di động">
          {visibleNav.map((item) => (
            <a key={item.id} className="sh-overlay-item" href={item.link} onClick={() => setMobileOpen(false)} tabIndex={mobileOpen ? 0 : -1}>
              {item.label}
            </a>
          ))}
          {!hasContactLink && (
            <a className="sh-overlay-item" href="#lien-he" onClick={() => setMobileOpen(false)} tabIndex={mobileOpen ? 0 : -1}>
              ĐỊA CHỈ
            </a>
          )}
          <Link className="sh-overlay-cta" to="/dat-ban" onClick={() => setMobileOpen(false)} tabIndex={mobileOpen ? 0 : -1}>ĐẶT BÀN</Link>
        </nav>
      </div>
    </>
  )
}
