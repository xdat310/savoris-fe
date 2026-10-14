import {
  Bell, BookOpen, CalendarClock, ChefHat, ChevronDown,
  ExternalLink, Globe, Image, LayoutDashboard, LogOut,
  Package, QrCode, ReceiptText, Search, Settings, Users,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { STAFF, can, useAuth } from '../auth'
import { ROLE_LABEL } from '../lib/format'

// ── Page title from path ─────────────────────────────────────────────────
const TITLES: Record<string, string> = {
  [`${STAFF}/chuoi`]:    'Toàn chuỗi',
  [`${STAFF}/ban-hang`]: 'Bán hàng',
  [`${STAFF}/bep`]:      'Bếp',
  [`${STAFF}/quan-ly`]:  'Quản lý chi nhánh',
  [`${STAFF}/ma-qr`]:    'Mã QR bàn',
  [`${STAFF}/kho`]:      'Kho & nhập hàng',
  [`${STAFF}/ca-cua-toi`]: 'Ca của tôi',
}

// ── Full-screen roles (tablet / kiosk — no sidebar) ──────────────────────
const FULLSCREEN_ROLES = ['CASHIER', 'WAITER', 'CHEF']

export function Shell() {
  const { session, role, branchId, branches, setBranchId, logout } = useAuth()
  const { pathname } = useLocation()
  const staff = session!.staff
  const branch = branches.find((b) => b.id === branchId)
  const isFullscreen = FULLSCREEN_ROLES.includes(role ?? '')
  const pageTitle = TITLES[pathname] ?? 'Savoris'

  // ── Branch dropdown (admin) ──────────────────────────────────────────
  const [branchOpen, setBranchOpen] = useState(false)
  const branchRef = useRef<HTMLDivElement>(null)

  // ── Nav links ────────────────────────────────────────────────────────
  const opsLinks = [
    can.owner(role)  && { to: `${STAFF}/chuoi`,    label: 'Toàn chuỗi',       Icon: LayoutDashboard },
    can.manage(role) && { to: `${STAFF}/quan-ly`,  label: 'Chi nhánh',         Icon: Users },
    can.manage(role) && { to: `${STAFF}/ma-qr`,    label: 'Mã QR bàn',         Icon: QrCode },
    can.stock(role)  && { to: `${STAFF}/kho`,      label: 'Kho & nhập hàng',   Icon: Package },
    can.pos(role)    && { to: `${STAFF}/ban-hang`, label: 'Bán hàng',           Icon: ReceiptText },
    can.kitchen(role)&& { to: `${STAFF}/bep`,      label: 'Bếp',               Icon: ChefHat },
    can.shifts(role) && { to: `${STAFF}/ca-cua-toi`, label: 'Ca của tôi',      Icon: CalendarClock },
  ].filter(Boolean) as { to: string; label: string; Icon: typeof Users }[]

  const cmsLinks = can.manage(role) ? [
    { to: `${STAFF}/website/trang-chu`, label: 'Trang chủ',       Icon: Globe },
    { to: `${STAFF}/website/thuc-don`,  label: 'Thực đơn website', Icon: BookOpen },
    { to: `${STAFF}/website/thu-vien`,  label: 'Thư viện ảnh',     Icon: Image },
    { to: `${STAFF}/website/cai-dat`,   label: 'Cài đặt',          Icon: Settings },
  ] : []

  // ── Shared top bar ───────────────────────────────────────────────────
  const TopBar = (
    <header className={`ad-top${isFullscreen ? ' ad-top--full' : ''}`}>
      {isFullscreen && (
        <span className="ad-top-mark">Savoris</span>
      )}
      <h1 className="ad-top-title">{pageTitle}</h1>
      <div className="ad-top-actions">
        <button className="ad-top-icon" aria-label="Tìm kiếm"><Search size={18} /></button>
        <button className="ad-top-icon" aria-label="Thông báo"><Bell size={18} /></button>
        <a className="ad-top-site" href="/" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> Xem website
        </a>
        {isFullscreen && (
          <button className="ad-top-logout" onClick={logout} aria-label="Đăng xuất">
            <LogOut size={16} /> Thoát
          </button>
        )}
      </div>
    </header>
  )

  // ── Full-screen layout (cashier / waiter / chef) ─────────────────────
  if (isFullscreen) {
    return (
      <div className="ad-shell ad-shell--full">
        {TopBar}
        <main className="ad-main">
          <Outlet />
        </main>
      </div>
    )
  }

  // ── Sidebar layout ───────────────────────────────────────────────────
  return (
    <div className="ad-shell">
      <aside className="ad-rail">

        {/* Logo */}
        <div className="ad-rail-mark">Savoris</div>

        {/* Branch switcher */}
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

        {/* VẬN HÀNH group */}
        <nav className="ad-nav" aria-label="Vận hành">
          <span className="ad-nav-group">VẬN HÀNH</span>
          {opsLinks.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `ad-link${isActive ? ' ad-link--on' : ''}`}>
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* WEBSITE group */}
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

        {/* Footer */}
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

      {/* Body: topbar + main */}
      <div className="ad-body">
        {TopBar}
        <main className="ad-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
