import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, STAFF, can, homeFor, useAuth } from './auth'
import { Shell } from './components/Shell'
import { ToastProvider } from './components/Toast'
import { GuestOrder } from './pages/GuestOrder'
import { Home } from './pages/Home'
import { Takeaway } from './pages/Takeaway'
import { TakeawayTrack } from './pages/TakeawayTrack'
import { Kitchen } from './pages/Kitchen'
import { Login } from './pages/Login'
import { MyShifts } from './pages/MyShifts'
import { Pos } from './pages/Pos'
import { QrCodes } from './pages/QrCodes'
import { Stock } from './pages/Stock'
import { BranchAdmin } from './pages/BranchAdmin'
import { WebsiteCMS } from './pages/WebsiteCMS'
import { SystemSettings } from './pages/SystemSettings'
import { Owner } from './pages/Owner'
import { AdminRoutes } from './pages/AdminPortal'
import { BranchMenu, PublicBranch } from './pages/PublicBranch'
import { NotFound } from './pages/NotFound'
import { BookingPage } from './pages/BookingPage'
import { PublicErrorBoundary } from './components/PublicErrorBoundary'
import { CustomerSupport } from './pages/CustomerSupport'
import { SupportInbox } from './pages/SupportInbox'

function Guard({ allow, children }: { allow: (role?: string) => boolean; children: ReactNode }) {
  const { role } = useAuth()
  return allow(role) ? <>{children}</> : <Navigate to={homeFor(role)} replace />
}

function AppRoutes() {
  const { session, role, branchId } = useAuth()
  const { pathname } = useLocation()

  if (pathname.startsWith('/admin')) return <AdminRoutes />

  if (!pathname.startsWith(STAFF)) {
    return (
      <Routes>
        <Route path="/" element={<PublicErrorBoundary><Home /></PublicErrorBoundary>} />
        <Route path="/chi-nhanh/:slug" element={<PublicErrorBoundary><PublicBranch /></PublicErrorBoundary>} />
        <Route path="/chi-nhanh/:slug/thuc-don" element={<PublicErrorBoundary><BranchMenu /></PublicErrorBoundary>} />
        <Route path="/dat-ban" element={<PublicErrorBoundary><BookingPage /></PublicErrorBoundary>} />
        <Route path="/ho-tro" element={<PublicErrorBoundary><CustomerSupport /></PublicErrorBoundary>} />
        <Route path="/goi-mon/:token" element={<PublicErrorBoundary><GuestOrder /></PublicErrorBoundary>} />
        <Route path="/mang-ve" element={<PublicErrorBoundary><Takeaway /></PublicErrorBoundary>} />
        <Route path="/mang-ve/:branchSlug" element={<PublicErrorBoundary><Takeaway /></PublicErrorBoundary>} />
        <Route path="/don-mang-ve/:token" element={<PublicErrorBoundary><TakeawayTrack /></PublicErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    )
  }

  if (!session) return pathname === `${STAFF}/dang-nhap` ? <Login /> : <Navigate to={`${STAFF}/dang-nhap`} replace />

  return (
    <Routes>
      <Route path={STAFF} element={<Shell />}>
        <Route index element={<Navigate to={homeFor(role)} replace />} />

        {/* ── ADMIN ──────────────────────────────────────────────────── */}
        <Route path="chuoi"
          element={<Guard allow={can.owner}>
            <Owner />
          </Guard>} />

        {/* ── ADMIN + BRANCH_MANAGER ─────────────────────────────────── */}
        <Route path="chi-nhanh"
          element={<Guard allow={can.branchAdmin}><BranchAdmin /></Guard>} />

        {/* ── BRANCH_MANAGER ops ─────────────────────────────────────── */}
        <Route path="ma-qr"
          element={<Guard allow={can.manage}><QrCodes /></Guard>} />
        <Route path="kho"
          element={<Guard allow={can.stock}>{branchId ? <Stock key={branchId} /> : null}</Guard>} />
        <Route path="ban-hang"
          element={<Guard allow={can.pos}>{branchId ? <Pos key={branchId} /> : null}</Guard>} />
        <Route path="bep"
          element={<Guard allow={can.kitchen}>{branchId ? <Kitchen key={branchId} /> : null}</Guard>} />
        <Route path="ho-tro" element={<Guard allow={can.pos}><SupportInbox /></Guard>} />
        <Route path="ca-cua-toi"
          element={<Guard allow={can.shifts}><MyShifts /></Guard>} />

        {/* ── WEBSITE CMS ────────────────────────────────────────────── */}
        {/* ADMIN: full site editor */}
        <Route path="website/trang-chu"
          element={<Guard allow={can.siteAdmin}><WebsiteCMS /></Guard>} />
        <Route path="website/lien-he"
          element={<Guard allow={can.siteAdmin}><WebsiteCMS /></Guard>} />
        {/* ADMIN + BRANCH_MANAGER: menu */}
        <Route path="website/thuc-don"
          element={<Guard allow={can.menuCms}><WebsiteCMS /></Guard>} />

        {/* ── ADMIN: system settings ──────────────────────────────────── */}
        <Route path="cai-dat"
          element={<Guard allow={can.owner}><SystemSettings /></Guard>} />

        {/* backward-compat redirect: /quan-ly → /chi-nhanh */}
        <Route path="quan-ly" element={<Navigate to={`${STAFF}/chi-nhanh`} replace />} />

        <Route path="*" element={<Navigate to={homeFor(role)} replace />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
