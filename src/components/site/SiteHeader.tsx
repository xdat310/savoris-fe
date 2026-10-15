import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { PublicBranch, SiteNavItem } from '../../api/site'

const FALLBACK_NAV: SiteNavItem[] = [
  { id: 1, label: 'THỰC ĐƠN',      link: '#thuc-don',    order: 1, visible: true },
  { id: 2, label: 'THƯ VIỆN',       link: '#thu-vien',    order: 2, visible: true },
  { id: 3, label: 'SỰ KIỆN',        link: '#su-kien',     order: 3, visible: true },
  { id: 4, label: 'VỀ CHÚNG TÔI',   link: '#ve-chung-toi',order: 4, visible: true },
  { id: 5, label: 'LIÊN HỆ',        link: '#lien-he',     order: 5, visible: true },
]

const FALLBACK_BRANCHES: PublicBranch[] = [
  { id: 1, code: 'HK', name: 'Savoris Hoàn Kiếm', slug: 'hoan-kiem', address: 'Tầng 5, 76 Đinh Tiên Hoàng', city: 'Hà Nội',           phone: '', email: '', hours: [] },
  { id: 2, code: 'TH', name: 'Savoris Tây Hồ',    slug: 'tay-ho',    address: '38 Đặng Thai Mai, Quảng An', city: 'Hà Nội',           phone: '', email: '', hours: [] },
  { id: 3, code: 'Q1', name: 'Savoris Quận 1',     slug: 'quan-1',    address: 'Tầng 3, 29 Lê Duẩn',        city: 'TP. Hồ Chí Minh',  phone: '', email: '', hours: [] },
  { id: 4, code: 'DN', name: 'Savoris Sơn Trà',    slug: 'son-tra',   address: '112 Võ Nguyên Giáp',         city: 'Đà Nẵng',          phone: '', email: '', hours: [] },
]

interface Props {
  nav?: SiteNavItem[]
  branches?: PublicBranch[]
  onOrderClick?: () => void
  onBookClick?: () => void
}

export function SiteHeader({ nav = FALLBACK_NAV, branches = [], onOrderClick, onBookClick }: Props) {
  const navigate = useNavigate()
  const [scrolled, setScrolled]     = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const [lang, setLang]             = useState<'VI' | 'EN'>('VI')
  const branchRef = useRef<HTMLDivElement>(null)

  const branchList = branches.length > 0 ? branches : FALLBACK_BRANCHES

  useEffect(() => {
    function handler() { setScrolled(window.scrollY > 40) }
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(e.target as Node))
        setBranchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const visibleNav = nav.filter((n) => n.visible).sort((a, b) => a.order - b.order)

  function handleNavClick(link: string) {
    setMobileOpen(false)
    if (link.startsWith('#')) {
      const el = document.getElementById(link.slice(1))
      el ? el.scrollIntoView({ behavior: 'smooth' }) : navigate(link)
    } else {
      navigate(link)
    }
  }

  function handleReserve() {
    setMobileOpen(false)
    onBookClick ? onBookClick() : onOrderClick?.()
  }

  return (
    <>
      <header className={`sh${scrolled ? ' sh--solid' : ''}`} role="banner">
        <div className="sh-inner">
          {/* Logo */}
          <Link to="/" className="sh-logo" aria-label="Savoris — trang chủ">
            <span className="sh-logo-text">SAVORIS</span>
          </Link>

          {/* Desktop nav */}
          <nav className="sh-nav" aria-label="Điều hướng chính">
            {visibleNav.map((item) => (
              <button key={item.id} className="sh-nav-item" onClick={() => handleNavClick(item.link)}>
                {item.label}
              </button>
            ))}

            {/* Branch dropdown — always visible */}
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
                  {branchList.map((b) => (
                    <button
                      key={b.id}
                      className="sh-dropdown-item"
                      role="menuitem"
                      onClick={() => { setBranchOpen(false); handleNavClick('#lien-he') }}
                    >
                      <span className="sh-dropdown-name">{b.name}</span>
                      <span className="sh-dropdown-city">{b.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language toggle */}
            <button
              className="sh-lang"
              onClick={() => setLang((l) => l === 'VI' ? 'EN' : 'VI')}
              aria-label={`Chuyển ngôn ngữ — đang dùng ${lang}`}
            >
              <span className={lang === 'VI' ? 'sh-lang--active' : ''}>VI</span>
              <span className="sh-lang-sep" aria-hidden="true">|</span>
              <span className={lang === 'EN' ? 'sh-lang--active' : ''}>EN</span>
            </button>

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

      {/* Mobile overlay */}
      <div className={`sh-overlay${mobileOpen ? ' sh-overlay--open' : ''}`} aria-hidden={!mobileOpen}>
        <nav className="sh-overlay-nav" aria-label="Menu di động">
          {visibleNav.map((item) => (
            <button key={item.id} className="sh-overlay-item" onClick={() => handleNavClick(item.link)} tabIndex={mobileOpen ? 0 : -1}>
              {item.label}
            </button>
          ))}
          <button
            className="sh-overlay-item sh-nav-item--branch"
            onClick={() => { setMobileOpen(false); handleNavClick('#lien-he') }}
            tabIndex={mobileOpen ? 0 : -1}
          >
            CHI NHÁNH
          </button>
          {branchList.map((b) => (
            <button key={b.id} className="sh-overlay-item sh-overlay-item--branch" onClick={() => { setMobileOpen(false); handleNavClick('#lien-he') }} tabIndex={mobileOpen ? 0 : -1}>
              {b.name} · {b.city}
            </button>
          ))}
          <div className="sh-overlay-lang">
            <button className={`sh-overlay-lang-btn${lang === 'VI' ? ' sh-overlay-lang-btn--on' : ''}`} onClick={() => setLang('VI')}>VI</button>
            <span aria-hidden="true">|</span>
            <button className={`sh-overlay-lang-btn${lang === 'EN' ? ' sh-overlay-lang-btn--on' : ''}`} onClick={() => setLang('EN')}>EN</button>
          </div>
          <button className="sh-overlay-cta" onClick={handleReserve} tabIndex={mobileOpen ? 0 : -1}>ĐẶT BÀN</button>
        </nav>
      </div>
    </>
  )
}
