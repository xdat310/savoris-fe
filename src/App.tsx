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
import { Manager } from './pages/Manager'
import { MyShifts } from './pages/MyShifts'
import { Owner } from './pages/Owner'
import { Pos } from './pages/Pos'
import { QrCodes } from './pages/QrCodes'
import { Stock } from './pages/Stock'

function CmsStub({ title }: { title: string }) {
  return (
    <div className="page">
      <div className="page-head"><h1>{title}</h1></div>
      <p style={{ color: 'var(--ink-soft)' }}>Tính năng đang được xây dựng.</p>
    </div>
  )
}

function Guard({ allow, children }: { allow: (role?: string) => boolean; children: ReactNode }) {
  const { role } = useAuth()
  return allow(role) ? <>{children}</> : <Navigate to={homeFor(role)} replace />
}

function AppRoutes() {
  const { session, role, branchId } = useAuth()
  const { pathname } = useLocation()
  // Two areas: guests (menu, table QR ordering, takeaway) at the root, the restaurant's own staff under /nha-hang
  if (!pathname.startsWith(STAFF)) {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/goi-mon/:token" element={<GuestOrder />} />
        <Route path="/mang-ve" element={<Takeaway />} />
        <Route path="/don-mang-ve/:token" element={<TakeawayTrack />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }
  if (!session) return pathname === `${STAFF}/dang-nhap` ? <Login /> : <Navigate to={`${STAFF}/dang-nhap`} replace />
  return (
    <Routes>
      <Route path={STAFF} element={<Shell />}>
        <Route path="chuoi" element={<Guard allow={can.owner}><Owner /></Guard>} />
        <Route path="ban-hang" element={<Guard allow={can.pos}>{branchId ? <Pos key={branchId} /> : null}</Guard>} />
        <Route path="bep" element={<Guard allow={can.kitchen}>{branchId ? <Kitchen key={branchId} /> : null}</Guard>} />
        <Route path="quan-ly" element={<Guard allow={can.manage}><Manager key={branchId} /></Guard>} />
        <Route path="ma-qr" element={<Guard allow={can.manage}><QrCodes /></Guard>} />
        <Route path="kho" element={<Guard allow={can.stock}>{branchId ? <Stock key={branchId} /> : null}</Guard>} />
        <Route path="ca-cua-toi" element={<Guard allow={can.shifts}><MyShifts /></Guard>} />
        {/* CMS stubs — replaced when the website CMS is built */}
        <Route path="website/trang-chu" element={<Guard allow={can.manage}><CmsStub title="Trang chủ website" /></Guard>} />
        <Route path="website/thuc-don"  element={<Guard allow={can.manage}><CmsStub title="Thực đơn website" /></Guard>} />
        <Route path="website/thu-vien"  element={<Guard allow={can.manage}><CmsStub title="Thư viện ảnh" /></Guard>} />
        <Route path="website/cai-dat"   element={<Guard allow={can.manage}><CmsStub title="Cài đặt website" /></Guard>} />
        <Route path="*" element={<Navigate to={homeFor(role)} replace />} />
      </Route>
      <Route path="*" element={<Navigate to={homeFor(role)} replace />} />
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
