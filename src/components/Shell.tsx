import {
  Bell, BookOpen, ChefHat, ChevronDown, ExternalLink, Globe, LayoutDashboard, LogOut, Menu,
  Package, PanelLeftClose, PanelLeftOpen, QrCode, ReceiptText, Users, Headset,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { STAFF, can, useAuth } from '../auth'
import { ROLE_LABEL } from '../lib/format'
import { Icon } from './ui/Icon'

const TITLES: Record<string, string> = {
  [`${STAFF}/chuoi`]:         'Toàn chuỗi',
  [`${STAFF}/chi-nhanh`]:     'Chi nhánh',
  [`${STAFF}/ban-hang`]:      'Bán hàng',
  [`${STAFF}/ho-tro`]:        'Hỗ trợ khách hàng',
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
const RAIL_KEY = 'savoris.railCollapsed'

function readCollapsed() {
  try { return localStorage.getItem(RAIL_KEY) === '1' } catch { return false }
}

export function Shell() {
  const { session, role, branchId, branches, setBranchId, logout } = useAuth()
  const { pathname } = useLocation()
  const staff = session!.staff
  const branch = branches.find((b) => b.id === branchId)
  const isFullscreen = FULLSCREEN_ROLES.includes(role ?? '')
  const pageTitle = TITLES[pathname] ?? 'Savoris'
  // Unread count is not provided by the API yet; the bell shows a number as soon as one is passed here
  const unread = 0

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
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(RAIL_KEY, collapsed ? '1' : '0') } catch { /* private mode */ }
  }, [collapsed])

  useEffect(() => {
    if (!branchOpen) return
    const close = (e: MouseEvent) => { if (!branchRef.current?.contains(e.target as Node)) setBranchOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [branchOpen])

  // ── RBAC nav links per spec ──────────────────────────────────────────
  // ADMIN: dashboard (with transfer QR built-in) + branch mgmt + settings
  // BRANCH_MANAGER: branch ops + website menu editor
  const opsLinks = [
    can.owner(role)           && { to: `${STAFF}/chuoi`,     label: 'Toàn chuỗi',       Glyph: LayoutDashboard },
    can.pos(role)             && { to: `${STAFF}/ho-tro`,    label: 'Hỗ trợ khách hàng', Glyph: Headset },
    can.branchAdmin(role)     && { to: `${STAFF}/chi-nhanh`, label: 'Chi nhánh',         Glyph: Users },
    role === 'BRANCH_MANAGER' && { to: `${STAFF}/ma-qr`,    label: 'Mã QR bàn',         Glyph: QrCode },
    role === 'BRANCH_MANAGER' && { to: `${STAFF}/kho`,      label: 'Kho & nhập hàng',   Glyph: Package },
    role === 'BRANCH_MANAGER' && { to: `${STAFF}/ban-hang`, label: 'Bán hàng',           Glyph: ReceiptText },
    role === 'BRANCH_MANAGER' && { to: `${STAFF}/bep`,      label: 'Bếp',               Glyph: ChefHat },
    role === 'WAREHOUSE'      && { to: `${STAFF}/kho`,      label: 'Kho & nhập hàng',   Glyph: Package },
  ].filter(Boolean) as { to: string; label: string; Glyph: typeof Users }[]

  // WEBSITE — BRANCH_MANAGER edits menu; ADMIN manages CMS only
  const cmsLinks = can.owner(role)
    ? [{ to: `${STAFF}/website/trang-chu`, label: 'Website CMS', Glyph: Globe }]
    : role === 'BRANCH_MANAGER'
    ? [
        { to: `${STAFF}/website/thuc-don`, label: 'Thực đơn website', Glyph: BookOpen },
        { to: `${STAFF}/website/trang-chu`, label: 'Website CMS',     Glyph: Globe },
      ]
    : []

  const roleLabel = ROLE_LABEL[staff.role ?? ''] ?? staff.role

  // ── Shared top bar ───────────────────────────────────────────────────
  const TopBar = (
    <header className={`ad-top${isFullscreen ? ' ad-top--full' : ''}`}>
      {!isFullscreen && (
        <button className="btn btn-ghost btn-icon ad-menu-btn" aria-label="Mở menu" aria-expanded={drawer} onClick={() => setDrawer(true)}>
          <Icon icon={Menu} size={20} />
        </button>
      )}
      {isFullscreen && <span className="ad-top-mark">Savoris</span>}
      <h1 className="ad-top-title">{pageTitle}</h1>
      <div className="ad-top-actions">
        <a className="btn btn-sm ad-top-site" href="/" target="_blank" rel="noopener noreferrer" aria-label="Xem website (mở tab mới)">
          <Icon icon={ExternalLink} /> <span className="ad-top-site-label">Xem website</span>
        </a>
        <button className="btn btn-ghost btn-icon ad-bell" aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'} data-tip="Thông báo">
          <Icon icon={Bell} size={20} />
          {unread > 0 && <span className="ad-bell-count">{unread > 99 ? '99+' : unread}</span>}
        </button>
        {isFullscreen && (
          <>
            <span className="ad-top-who" title={`${staff.fullName} · ${roleLabel}`}>
              <span className="avatar avatar-sm" aria-hidden="true">{(staff.fullName ?? 'U')[0].toUpperCase()}</span>
              <span className="ad-top-who-name">{staff.fullName}</span>
            </span>
            <button className="btn btn-sm btn-ghost" onClick={logout} aria-label="Đăng xuất">
              <Icon icon={LogOut} /> Thoát
            </button>
          </>
        )}
      </div>
    </header>
  )

  // ── Fullscreen layout (CHEF / WAITER) ─────────────────────────────────
  if (isFullscreen) {
    return (
      <div className="ad-shell ad-shell--full ds-ambient">
        {TopBar}
        <main className="ad-main"><Outlet /></main>
      </div>
    )
  }

  // ── Sidebar layout ───────────────────────────────────────────────────
  const link = ({ to, label, Glyph }: { to: string; label: string; Glyph: typeof Users }) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) => `ad-link${isActive ? ' ad-link--on' : ''}`}
      title={collapsed ? label : undefined}
      aria-label={label}
      onClick={() => setDrawer(false)} // phone drawer closes after navigating
    >
      <Icon icon={Glyph} size="nav" />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <div className={`ad-shell ds-ambient${collapsed ? ' ad-shell--collapsed' : ''}${drawer ? ' ad-shell--drawer' : ''}`}>
      {drawer && <div className="ad-rail-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <aside className="ad-rail" aria-label="Điều hướng">

        {/* Brand mark + collapse */}
        <div className="ad-rail-head">
          <div className="ad-rail-mark" aria-label="Savoris">S<span className="ad-mark-rest">avoris</span></div>
          <button
            className="ad-collapse"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            aria-pressed={collapsed}
            data-tip={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            <Icon icon={collapsed ? PanelLeftOpen : PanelLeftClose} size={18} />
          </button>
        </div>

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
              aria-haspopup="listbox"
              onClick={() => setBranchOpen(v => !v)}
            >
              <span>
                <span className="ad-branch-label">Đang xem</span>
                <strong className="ad-branch-name">{branch?.name ?? 'Toàn chuỗi'}</strong>
              </span>
              <Icon icon={ChevronDown} className={branchOpen ? 'ad-branch-chev--open' : ''} />
            </button>
            {branchOpen && (
              <div className="ad-branch-drop" role="listbox" aria-label="Chọn chi nhánh">
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
                    role="option"
                    aria-selected={b.id === branchId}
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
          <span className="ad-nav-group">Vận hành</span>
          {opsLinks.map(link)}
        </nav>

        {/* WEBSITE */}
        {cmsLinks.length > 0 && (
          <nav className="ad-nav" aria-label="Website CMS">
            <span className="ad-nav-group">Website</span>
            {cmsLinks.map(link)}
          </nav>
        )}

        {/* User footer: full name wraps to two lines, tooltip carries it when the rail is collapsed */}
        <div className="ad-rail-foot">
          <div className="ad-who" title={`${staff.fullName} · ${roleLabel}`}>
            <div className="ad-who-avatar" aria-hidden="true">
              {(staff.fullName ?? 'U')[0].toUpperCase()}
            </div>
            <div className="ad-who-info">
              <strong>{staff.fullName}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>
          <button className="ad-logout" onClick={logout} aria-label="Đăng xuất" data-tip="Đăng xuất">
            <Icon icon={LogOut} />
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
