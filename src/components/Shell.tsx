import {
  Bell, BookOpen, ChefHat, ChevronDown,
  ExternalLink, Globe, LayoutDashboard, LogOut,
  Package, QrCode, ReceiptText, Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { STAFF, can, useAuth } from '../auth'
import { ROLE_LABEL } from '../lib/format'

const TITLES: Record<string, string> = {
  [`${STAFF}/chuoi`]:         'Toàn chuỗi',
  [`${STAFF}/chi-nhanh`]:     'Chi nhánh',
  [`${STAFF}/ban-hang`]:      'Bán hàng',
  [`${STAFF}/bep`]:           'Bếp',
  [`${STAFF}/ma-qr`]:         'Mã QR bàn',
  [`${STAFF}/kho`]:           'Kho & nhập hàng',
  [`${STAFF}/ca-cua-toi`]:    'Ca của tôi',
  [`${STAFF}/cai-dat`]:       'Cài đặt hệ thống',
  [`${STAFF}/website`]:       'Website CMS',
  [`${STAFF}/website/trang-chu`]: 'Trang chủ',
  [`${STAFF}/website/thuc-don`]:  'Thực đơn website',
  [`${STAFF}/website/lien-he`]:   'Liên hệ & Chi nhánh',
}

// CHEF and WAITER get a fullscreen kiosk layout — no sidebar
const FULLSCREEN_ROLES = ['CASHIER', 'WAITER', 'CHEF']

export function Shell() {
  const { session, role, branchId, branches, setBranchId, logout } = useAuth()
  const { pathname } = useLocation()
  const staff = session!.staff
  const branch = branches.find((b) => b.id === branchId)
  const isFullscreen = FULLSCREEN_ROLES.includes(role ?? '')
  const pageTitle = TITLES[pathname] ?? 'Savoris'

  // Swap favicon to fork-knife icon while inside staff area
  useEffect(() => {
    const el = document.getElementById('favicon-main') as HTMLLinkElement | null
    if (!el) return
    const prev = el.href
    el.href = '/favicon-staff.svg'
    el.type = 'image/svg+xml'
    return () => { el.href = prev; el.type = 'image/png' }
  }, [])

  const [branchOpen, setBranchOpen] = useState(false)
  const branchRef = useRef<HTMLDivElement>(null)

  // ── RBAC nav links per spec ──────────────────────────────────────────
  // ADMIN: dashboard (with transfer QR built-in) + branch mgmt + settings
  // BRANCH_MANAGER: branch ops + website menu editor
  const opsLinks = [
    can.owner(role)           && { to: `${STAFF}/chuoi`,     label: 'Dashboard',       Icon: LayoutDashboard },
    role === 'BRANCH_MANAGER' && { to: `${STAFF}/ban-hang`,  label: 'Bán hàng',        Icon: ReceiptText },
    role === 'BRANCH_MANAGER' && { to: `${STAFF}/bep`,       label: 'Bếp',             Icon: ChefHat },
    role === 'BRANCH_MANAGER' && { to: `${STAFF}/kho`,       label: 'Kho & nhập hàng', Icon: Package },
    role === 'BRANCH_MANAGER' && { to: `${STAFF}/ma-qr`,     label: 'Mã QR bàn',       Icon: QrCode },
    role === 'WAREHOUSE'      && { to: `${STAFF}/kho`,       label: 'Kho & nhập hàng', Icon: Package },
  ].filter(Boolean) as { to: string; label: string; Icon: typeof Users }[]

  // WEBSITE — BRANCH_MANAGER edits menu; ADMIN manages CMS only
  const cmsLinks = can.owner(role)
    ? [{ to: `${STAFF}/website/trang-chu`, label: 'Website CMS', Icon: Globe }]
    : role === 'BRANCH_MANAGER'
    ? [
        { to: `${STAFF}/website/thuc-don`, label: 'Thực đơn website', Icon: BookOpen },
        { to: `${STAFF}/website/trang-chu`, label: 'Website CMS',     Icon: Globe },
      ]
    : []

  // ── Shared top bar ───────────────────────────────────────────────────
  const TopBar = (
    <header className={`ad-top${isFullscreen ? ' ad-top--full' : ''}`}>
      {isFullscreen && <span className="ad-top-mark">Savoris</span>}
      <h1 className="ad-top-title">{pageTitle}</h1>
      <div className="ad-top-actions">
        <a className="ad-top-site" href="/" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> Xem website
        </a>
        <button className="ad-top-icon" aria-label="Thông báo"><Bell size={18} /></button>
        {isFullscreen && (
          <button className="ad-top-logout" onClick={logout} aria-label="Đăng xuất">
            <LogOut size={16} /> Thoát
          </button>
        )}
      </div>
    </header>
  )

  // ── Fullscreen layout (CHEF / WAITER / CASHIER) ──────────────────────
  if (isFullscreen) {
    return (
      <div className="ad-shell ad-shell--full">
        {TopBar}
        <main className="ad-main"><Outlet /></main>
      </div>
    )
  }

  // ── Sidebar layout ───────────────────────────────────────────────────
  return (
    <div className="ad-shell">
      <aside className="ad-rail">

        {/* Brand mark */}
        <div className="ad-rail-mark">Savoris</div>

        {/* Branch context
            - ADMIN: branch dropdown (can switch, Toàn chuỗi by default)
            - BRANCH_MANAGER: fixed to their branch (locked) */}
        {staff.branchId ? (
          <div className="ad-branch-fixed">
            <span className="ad-branch-label">Chi nhánh</span>
            <strong className="ad-branch-name">{branch?.name ?? staff.branchName ?? `#${staff.branchId}`}</strong>
          </div>
        ) : (
          <div className="ad-branch-pick" ref={branchRef}>
            <button
              className="ad-branch-btn"
              aria-expanded={branchOpen}
              onClick={() => setBranchOpen(v => !v)}
            >
              <span>
                <span className="ad-branch-label">Đang xem</span>
                <strong className="ad-branch-name">{branch?.name ?? 'Toàn chuỗi'}</strong>
              </span>
              <ChevronDown size={14} className={branchOpen ? 'ad-branch-chev--open' : ''} aria-hidden="true" />
            </button>
            {branchOpen && (
              <div className="ad-branch-drop">
                <button
                  className={`ad-branch-opt${!branchId ? ' ad-branch-opt--on' : ''}`}
                  onClick={() => { setBranchId(null); setBranchOpen(false) }}
                >
                  <span className="ad-branch-opt-code">—</span>
                  <span className="ad-branch-opt-name">Toàn chuỗi</span>
                </button>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    className={`ad-branch-opt${b.id === branchId ? ' ad-branch-opt--on' : ''}`}
                    onClick={() => { setBranchId(b.id!); setBranchOpen(false) }}
                  >
                    <span className="ad-branch-opt-code">{b.code}</span>
                    <span className="ad-branch-opt-name">{b.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VẬN HÀNH */}
        <nav className="ad-nav" aria-label="Vận hành">
          <span className="ad-nav-group">VẬN HÀNH</span>
          {opsLinks.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `ad-link${isActive ? ' ad-link--on' : ''}`}>
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* WEBSITE */}
        {cmsLinks.length > 0 && (
          <nav className="ad-nav" aria-label="Website CMS">
            <span className="ad-nav-group">WEBSITE</span>
            {cmsLinks.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `ad-link${isActive ? ' ad-link--on' : ''}`}>
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        {/* User footer */}
        <div className="ad-rail-foot">
          <div className="ad-who">
            <div className="ad-who-avatar" aria-hidden="true">
              {(staff.fullName ?? 'U')[0].toUpperCase()}
            </div>
            <div className="ad-who-info">
              <strong>{staff.fullName}</strong>
              <span>{ROLE_LABEL[staff.role ?? ''] ?? staff.role}</span>
            </div>
          </div>
          <button className="ad-logout" onClick={logout}>
            <LogOut size={14} aria-hidden="true" /> Thoát
          </button>
        </div>
      </aside>

      <div className="ad-body">
        {TopBar}
        <main className="ad-main"><Outlet /></main>
      </div>
    </div>
  )
}
