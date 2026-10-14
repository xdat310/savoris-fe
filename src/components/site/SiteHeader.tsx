import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { PublicBranch, SiteNavItem } from '../../api/site'

// ── Fallback nav when API is unavailable ────────────────────────────────
const FALLBACK_NAV: SiteNavItem[] = [
  { id: 1, label: 'MENU', link: '#thuc-don', order: 1, visible: true },
  { id: 2, label: 'ĐẶT BÀN', link: '#dat-ban', order: 2, visible: true },
  { id: 3, label: 'SỰ KIỆN RIÊNG', link: '#su-kien', order: 3, visible: true },
  { id: 4, label: 'THƯ VIỆN ẢNH', link: '#thu-vien', order: 4, visible: true },
  { id: 5, label: 'VỀ CHÚNG TÔI', link: '#ve-chung-toi', order: 5, visible: true },
  { id: 6, label: 'LIÊN HỆ', link: '#lien-he', order: 6, visible: true },
]

interface Props {
  nav?: SiteNavItem[]
  branches?: PublicBranch[]
  onOrderClick?: () => void
}

export function SiteHeader({ nav = FALLBACK_NAV, branches = [], onOrderClick }: Props) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const branchRef = useRef<HTMLDivElement>(null)

  // Scroll detection
  useEffect(() => {
    function handler() { setScrolled(window.scrollY > 40) }
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close branch dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setBranchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const visibleNav = nav.filter((n) => n.visible).sort((a, b) => a.order - b.order)

  function handleNavClick(link: string) {
    setMobileOpen(false)
    if (link.startsWith('#')) {
      const el = document.getElementById(link.slice(1))
      if (el) { el.scrollIntoView({ behavior: 'smooth' }) } else { navigate(link) }
    } else {
      navigate(link)
    }
  }

  function handleReserve() {
    setMobileOpen(false)
    onOrderClick?.()
  }

  return (
    <>
      <header className={`sh${scrolled ? ' sh--solid' : ''}`} role="banner">
        <div className="sh-inner">
          {/* Logo / Wordmark */}
          <Link to="/" className="sh-logo" aria-label="Savoris — trang chủ">
            <span className="sh-logo-dine">Savoris</span>
          </Link>

          {/* Desktop nav */}
          <nav className="sh-nav" aria-label="Điều hướng chính">
            {visibleNav.map((item) => (
              <button key={item.id} className="sh-nav-item" onClick={() => handleNavClick(item.link)}>
                {item.label}
              </button>
            ))}

            {/* Branch dropdown */}
            {branches.length > 0 && (
              <div className="sh-branch-wrap" ref={branchRef}>
                <button
                  className="sh-nav-item sh-nav-item--branch"
                  aria-expanded={branchOpen}
                  aria-haspopup="true"
                  onClick={() => setBranchOpen((v) => !v)}
                >
                  CHI NHÁNH <ChevronDown size={13} className={`sh-chevron${branchOpen ? ' sh-chevron--open' : ''}`} aria-hidden="true" />
                </button>
                {branchOpen && (
                  <div className="sh-dropdown" role="menu" aria-label="Chi nhánh">
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        className="sh-dropdown-item"
                        role="menuitem"
                        onClick={() => { setBranchOpen(false); handleNavClick(`#lien-he`) }}
                      >
                        <span className="sh-dropdown-name">{b.name}</span>
                        {b.city && <span className="sh-dropdown-city">{b.city}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button className="sh-cta" onClick={handleReserve} aria-label="Đặt bàn">ĐẶT BÀN</button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="sh-hamburger"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* ── Mobile overlay ── */}
      <div className={`sh-overlay${mobileOpen ? ' sh-overlay--open' : ''}`} aria-hidden={!mobileOpen}>
        <nav className="sh-overlay-nav" aria-label="Menu di động">
          {visibleNav.map((item) => (
            <button key={item.id} className="sh-overlay-item" onClick={() => handleNavClick(item.link)} tabIndex={mobileOpen ? 0 : -1}>
              {item.label}
            </button>
          ))}
          {branches.map((b) => (
            <button key={b.id} className="sh-overlay-item sh-overlay-item--branch" onClick={() => { setMobileOpen(false); handleNavClick('#lien-he') }} tabIndex={mobileOpen ? 0 : -1}>
              {b.name}
            </button>
          ))}
          <button className="sh-overlay-cta" onClick={handleReserve} tabIndex={mobileOpen ? 0 : -1}>ĐẶT BÀN</button>
        </nav>
      </div>
    </>
  )
}
