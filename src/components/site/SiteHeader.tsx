import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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

export function SiteHeader({ nav = FALLBACK_NAV, branches = [] }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const branchRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) setBranchOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setBranchOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const visibleNav = (nav.length > 0 ? nav : FALLBACK_NAV)
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order)
  const branchList = branches.filter((branch) => Boolean(branch.slug))
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
            {branchList.length > 0 ? (
              <div className="sh-branch-wrap" ref={branchRef}>
                <button className="sh-nav-item sh-nav-item--branch" aria-expanded={branchOpen} aria-controls="sh-branch-menu" onClick={() => setBranchOpen((open) => !open)}>
                  CHI NHÁNH <ChevronDown size={13} className={branchOpen ? 'sh-chevron sh-chevron--open' : 'sh-chevron'} aria-hidden="true"/>
                </button>
                {branchOpen && <div className="sh-dropdown" id="sh-branch-menu" role="menu" aria-label="Chọn chi nhánh">
                  {branchList.map((branch) => <Link key={branch.id} className="sh-dropdown-item" role="menuitem" to={'/chi-nhanh/' + branch.slug} onClick={() => setBranchOpen(false)}>
                    <span className="sh-dropdown-name">{branch.name}</span>
                    <span className="sh-dropdown-city">{branch.city || branch.address}</span>
                  </Link>)}
                </div>}
              </div>
            ) : <a className="sh-nav-item" href="#lien-he">CHI NHÁNH</a>}
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
          {branchList.length > 0 ? <>
            <span className="sh-overlay-branch-label">CHI NHÁNH</span>
            {branchList.map((branch) => <Link key={branch.id} className="sh-overlay-item sh-overlay-item--branch" to={'/chi-nhanh/' + branch.slug} onClick={() => setMobileOpen(false)} tabIndex={mobileOpen ? 0 : -1}>
              {branch.name}{branch.city ? ' · ' + branch.city : ''}
            </Link>)}
          </> : <a className="sh-overlay-item" href="#lien-he" onClick={() => setMobileOpen(false)} tabIndex={mobileOpen ? 0 : -1}>CHI NHÁNH</a>}
          <Link className="sh-overlay-cta" to="/dat-ban" onClick={() => setMobileOpen(false)} tabIndex={mobileOpen ? 0 : -1}>ĐẶT BÀN</Link>
        </nav>
      </div>
    </>
  )
}
