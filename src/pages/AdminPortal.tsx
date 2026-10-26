import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { Building2, CalendarDays, ChefHat, CircleCheck, ClipboardList, Gauge, LayoutDashboard, LogOut, ShieldAlert, TriangleAlert, Users, Utensils, WalletCards, Globe2, Soup } from 'lucide-react'
import { ApiError, del, get, post, put } from '../api/client'
import { homeFor, useAuth } from '../auth'
import type { BranchResponse, CreateStaffRequest, StaffDetailResponse, UpdateBranchRequest } from '../api/types'
import { ErrorNotice } from '../components/Feedback'
import logo from '../assets/savoris-logo.webp'
import './admin-portal.css'
import { WebsiteCMSPage } from './WebsiteCMSPage'
import { MenuManagementPage } from './MenuManagementPage'
import { ReservationsPage } from './ReservationsPage'

const menu = [
  { to: '/admin/overview', label: 'Tổng quan', roles: ['ADMIN'], Icon: LayoutDashboard },
  { to: '/admin/menu', label: 'Thực đơn', roles: ['ADMIN'], Icon: Soup },
  { to: '/admin/reservations', label: 'Đặt bàn', roles: ['ADMIN', 'MANAGER'], Icon: CalendarDays },
  { to: '/admin/website', label: 'Website', roles: ['ADMIN', 'MANAGER'], Icon: Globe2 },
  { to: '/admin/branch', label: 'Chi nhánh', roles: ['ADMIN', 'MANAGER'], Icon: Building2 },
  { to: '/admin/staff', label: 'Nhân viên', roles: ['ADMIN', 'MANAGER'], Icon: Users },
  { to: '/admin/floor', label: 'Sơ đồ bàn', roles: ['ADMIN', 'MANAGER', 'STAFF'], Icon: Utensils },
  { to: '/admin/kitchen', label: 'Màn hình bếp', roles: ['ADMIN', 'MANAGER', 'CHEF'], Icon: ChefHat },
]

function SignedIn() {
  const { session, authLoading } = useAuth()
  if (authLoading) return <div className="ap-auth-loading" aria-busy="true">Đang xác thực…</div>
  return session ? <Outlet /> : <Navigate to="/admin/login" replace />
}

function Allowed({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { role } = useAuth()
  return roles.includes(role ?? '') ? <>{children}</> : <NoAccess />
}

function NoAccess() {
  return <section className="ap-empty"><ShieldAlert size={34} /><h1>Không có quyền truy cập</h1><p>Tài khoản của bạn không được cấp quyền cho trang này.</p></section>
}

function AdminLayout() {
  const { session, role, logout } = useAuth()
  const links = menu.filter((item) => item.roles.includes(role ?? ''))
  const current = menu.find((item) => item.to === location.pathname)?.label ?? 'Savoris'
  return <div className="ap-layout">
    <aside className="ap-sidebar">
      <a className="ap-brand" href="/admin"><img src={logo} alt="Savoris" /><span>SAVORIS<small>QUẢN TRỊ HỆ THỐNG</small></span></a>
      <div className="ap-side-caption">KHÔNG GIAN LÀM VIỆC</div>
      <nav aria-label="Điều hướng quản trị">{links.map(({ to, label, Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `ap-nav${isActive ? ' is-active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      <div className="ap-side-user"><div className="ap-avatar">{session?.staff.fullName?.slice(0, 1) ?? 'S'}</div><div className="ap-user-copy"><strong>{session?.staff.fullName}</strong><span>{roleLabel(role)}</span></div><button aria-label="Đăng xuất" title="Đăng xuất" onClick={() => void logout()}><LogOut size={17} /></button></div>
    </aside>
    <main className="ap-content"><header className="ap-top"><span>QUẢN TRỊ / {current.toLocaleUpperCase('vi')}</span><b>{session?.staff.branchName ?? (role === 'ADMIN' ? 'Toàn chuỗi' : '')}</b></header><Outlet /></main>
  </div>
}

function roleLabel(role?: string) {
  return ({ ADMIN: 'Quản trị viên', MANAGER: 'Quản lý chi nhánh', STAFF: 'Nhân viên', CHEF: 'Đầu bếp' } as Record<string, string>)[role ?? ''] ?? role
}

export function AdminLogin() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (session) navigate(homeFor(session.staff.role), { replace: true }) }, [session, navigate])
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try { await login(username.trim(), password) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Không thể đăng nhập. Vui lòng thử lại.') }
    finally { setBusy(false) }
  }
  return <main className="ap-login"><div className="ap-login-panel"><img src={logo} alt="Savoris" /><div className="ap-kicker">SAVORIS · STAFF PORTAL</div><h1>Đăng nhập</h1><p>Truy cập không gian quản trị nhà hàng.</p>{error && <ErrorNotice message={error} />}<form onSubmit={submit}>
    <label>Tên đăng nhập<input required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
    <label>Mật khẩu<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    <button disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
  </form></div></main>
}

interface ChainDashboard {
  generatedAt: string
  openOrders: number
  completedOrdersToday: number
  revenueToday: number
  overloadedBranches: number
  branches: {
    branchId: number
    code: string
    name: string
    openOrders: number
    completedOrdersToday: number
    revenueToday: number
    kitchen: { status: string; loadPercent: number; pendingPortions: number; acceptingTakeaway: boolean }
  }[]
}

function Overview() {
  const [data, setData] = useState<ChainDashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    get<ChainDashboard>('/dashboard/chain')
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được dữ liệu'))
      .finally(() => setLoading(false))
  }, [])
  const vnd = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
  const updatedAt = data?.generatedAt ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(data.generatedAt)) : ''
  return (
    <div className="ap-page ap-overview">
      <div className="ap-heading ap-overview-heading">
        <div><span className="ap-kicker">SAVORIS · TOÀN CHUỖI</span><h1>Tổng quan</h1><p>Theo dõi tình trạng vận hành của toàn bộ hệ thống Savoris hôm nay.</p></div>
        <div className="ap-overview-scope"><Building2 size={16} aria-hidden="true"/><span>Toàn chuỗi</span></div>
      </div>
      {error && <ErrorNotice message={error} />}
      {loading && !error && <div className="ap-empty">Đang tải…</div>}
      {data && <>
        <div className="ap-stat-grid">
          <div className="ap-stat-card"><div className="ap-stat-label"><ClipboardList size={16} aria-hidden="true"/><span>Đơn đang mở</span></div><strong>{data.openOrders}</strong><small>Đơn đang được xử lý</small></div>
          <div className="ap-stat-card"><div className="ap-stat-label"><CircleCheck size={16} aria-hidden="true"/><span>Hoàn thành hôm nay</span></div><strong>{data.completedOrdersToday}</strong><small>Đơn đã hoàn thành</small></div>
          <div className="ap-stat-card"><div className="ap-stat-label"><WalletCards size={16} aria-hidden="true"/><span>Doanh thu hôm nay</span></div><strong>{vnd(data.revenueToday)}</strong><small>Tổng doanh thu toàn chuỗi</small></div>
          <div className={`ap-stat-card${data.overloadedBranches > 0 ? ' ap-stat-card--warn' : ''}`}><div className="ap-stat-label"><TriangleAlert size={16} aria-hidden="true"/><span>Chi nhánh quá tải</span></div><strong>{data.overloadedBranches}</strong><small>{data.overloadedBranches > 0 ? 'Cần theo dõi tải bếp' : 'Tất cả đang hoạt động ổn định'}</small></div>
        </div>
        <section className="ap-branch-overview" aria-labelledby="ap-branch-overview-title">
          <div className="ap-branch-overview-head"><div><h2 id="ap-branch-overview-title">Trạng thái chi nhánh</h2><p>Đơn hàng, doanh thu và tải bếp trong hôm nay</p></div><span>{data.branches.length} chi nhánh</span></div>
          <div className="ap-table-wrap">
          <table className="ap-table">
            <thead><tr><th>Chi nhánh</th><th>Đơn đang mở</th><th>Hoàn thành</th><th>Doanh thu</th><th>Bếp</th><th>Tải bếp</th><th>Takeaway</th></tr></thead>
            <tbody>{data.branches.map((b) => (
              <tr key={b.branchId}>
                <td><strong>{b.name}</strong><small>{b.code}</small></td>
                <td>{b.openOrders}</td>
                <td>{b.completedOrdersToday}</td>
                <td>{vnd(b.revenueToday)}</td>
                <td><span className={`ap-status${b.kitchen.status === 'NORMAL' ? ' active' : ''}`}>{b.kitchen.status === 'NORMAL' ? 'Bình thường' : 'Quá tải'}</span></td>
                <td><div className={`ap-kitchen-load${b.kitchen.loadPercent >= 80 ? ' is-high' : ''}`}><span>{b.kitchen.loadPercent}%</span><div role="meter" aria-label={`Tải bếp ${b.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={b.kitchen.loadPercent}><i style={{ width: `${Math.min(100, Math.max(0, b.kitchen.loadPercent))}%` }}/></div></div></td>
                <td><span className={`ap-status${b.kitchen.acceptingTakeaway ? ' active' : ''}`}>{b.kitchen.acceptingTakeaway ? 'Có' : 'Không'}</span></td>
              </tr>
            ))}{data.branches.length === 0 && <tr><td className="ap-branch-empty" colSpan={7}>Chưa có dữ liệu chi nhánh.</td></tr>}</tbody>
          </table>
          </div>
          <div className="ap-branch-overview-foot"><span><Gauge size={14} aria-hidden="true"/> Tải bếp được cập nhật theo dữ liệu vận hành</span>{updatedAt && <span>Cập nhật lúc {updatedAt}</span>}</div>
        </section>
      </>}
    </div>
  )
}

function BranchPage() {
  const { role, branchId, branches, reloadBranches, session } = useAuth()
  const admin = role === 'ADMIN'
  const canEditBranch = admin || role === 'MANAGER'
  const [branch, setBranch] = useState<BranchResponse | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const id = admin ? branchId : session?.staff.branchId
    if (!id) { setBranch(null); return }
    get<BranchResponse>(`/branches/${id}`).then(setBranch).catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được chi nhánh'))
  }, [admin, branchId, session?.staff.branchId])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('')
    const data = new FormData(event.currentTarget)
    const payload: UpdateBranchRequest = {
      name: String(data.get('name')), address: String(data.get('address')), city: String(data.get('city')),
      phone: String(data.get('phone')), email: String(data.get('email')),
      latitude: branch?.latitude, longitude: branch?.longitude, kitchenCapacity: branch?.kitchenCapacity,
    }
    try { await put(`/branches/${branch?.id}`, payload); await reloadBranches(); setMessage('Đã lưu thông tin chi nhánh') }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Không lưu được thay đổi') }
  }
  return <div className="ap-page"><div className="ap-heading"><div><span className="ap-kicker">VẬN HÀNH</span><h1>{admin ? 'Chi nhánh' : 'Chi nhánh của tôi'}</h1><p>{admin ? 'Thông tin và giờ hoạt động của các cơ sở.' : 'Thông tin cơ sở được phân công.'}</p></div>{admin && <select aria-label="Chọn chi nhánh" value={branch?.id ?? ''} onChange={(e) => setBranch(branches.find((b) => b.id === Number(e.target.value)) ?? null)}><option value="" disabled>Chọn chi nhánh</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}</select>}</div>
    {error && <ErrorNotice message={error} />}{message && <div className="ap-success" role="status">{message}</div>}
    {branch ? <form className="ap-form ap-branch-form" onSubmit={save}><label>Mã chi nhánh<input value={branch.code ?? ''} disabled /></label><label>Tên chi nhánh<input name="name" defaultValue={branch.name ?? ''} readOnly={!canEditBranch} required /></label><label>Địa chỉ đầy đủ (số nhà, phố, quận)<input name="address" defaultValue={branch.address ?? ''} readOnly={!canEditBranch} minLength={10} required /></label><label>Thành phố<input name="city" defaultValue={branch.city ?? ''} readOnly={!canEditBranch} required /></label><label>Điện thoại<input name="phone" defaultValue={branch.phone ?? ''} readOnly={!canEditBranch} required /></label><label>Email<input name="email" type="email" defaultValue={branch.email ?? ''} readOnly={!canEditBranch} required /></label>{canEditBranch && <button>Lưu thay đổi</button>}</form> : <div className="ap-empty">Chưa chọn chi nhánh.</div>}
  </div>
}

function StaffPage() {
  const { role, session, branches } = useAuth()
  const isAdmin = role === 'ADMIN'
  const scopedBranch = isAdmin ? undefined : session?.staff.branchId
  const [rows, setRows] = useState<StaffDetailResponse[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StaffDetailResponse | null>(null)
  const [newRole, setNewRole] = useState<CreateStaffRequest['role']>('STAFF')
  const [branchChoice, setBranchChoice] = useState<number | undefined>(scopedBranch)
  useEffect(() => { setBranchChoice(scopedBranch) }, [scopedBranch])
  useEffect(() => {
    const path = isAdmin && !branchChoice ? '/staff/search?q=' : branchChoice ? `/staff/branch/${branchChoice}` : null
    if (!path) { setRows([]); return }
    get<StaffDetailResponse[]>(path).then(setRows).catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được danh sách'))
  }, [branchChoice, isAdmin])
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    const form = event.currentTarget
    const data = new FormData(form)
    const payload: CreateStaffRequest = {
      code: `NV${Date.now().toString().slice(-7)}`, fullName: String(data.get('fullName')).trim(),
      username: String(data.get('username')).trim(), email: String(data.get('email')).trim(), phone: String(data.get('phone')).trim(),
      password: String(data.get('password')), role: String(data.get('role')) as CreateStaffRequest['role'],
      branchId: data.get('role') === 'ADMIN' ? null : isAdmin ? Number(data.get('branchId')) : scopedBranch!,
      hourlyRate: Number(data.get('hourlyRate')),
    }
    try {
      await post('/staff', payload); setShowForm(false)
      setRows(await get<StaffDetailResponse[]>(isAdmin && !branchChoice ? '/staff/search?q=' : `/staff/branch/${payload.branchId}`))
      form.reset()
    }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Không tạo được tài khoản') }
    finally { setBusy(false) }
  }
  async function updateStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (!editing?.id) return
    const data = new FormData(event.currentTarget)
    const roleValue = String(data.get('role')) as CreateStaffRequest['role']
    const assignedBranch = roleValue === 'ADMIN' ? null : isAdmin ? Number(data.get('branchId')) : scopedBranch!
    try {
      await put(`/staff/${editing.id}`, {
        fullName: String(data.get('fullName')).trim(), email: String(data.get('email')).trim(),
        phone: String(data.get('phone')).trim(), role: roleValue, branchId: assignedBranch,
        hourlyRate: Number(data.get('hourlyRate')),
      })
      setEditing(null)
      setRows(await get<StaffDetailResponse[]>(isAdmin && !branchChoice ? '/staff/search?q=' : `/staff/branch/${branchChoice}`))
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không cập nhật được tài khoản') }
  }
  async function lockStaff(staff: StaffDetailResponse) {
    if (!staff.id || !window.confirm(`Khóa tài khoản ${staff.fullName}?`)) return
    try { await del(`/staff/${staff.id}`); setRows((old) => old.map((item) => item.id === staff.id ? { ...item, status: 'LOCKED' } : item)) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Không khóa được tài khoản') }
  }
  return <div className="ap-page"><div className="ap-heading"><div><span className="ap-kicker">TÀI KHOẢN</span><h1>Nhân viên</h1><p>Quản lý tài khoản và trạng thái làm việc.</p></div><div className="ap-heading-actions">{isAdmin && <select aria-label="Chi nhánh nhân viên" value={branchChoice ?? ''} onChange={(e) => setBranchChoice(e.target.value ? Number(e.target.value) : undefined)}><option value="">Toàn bộ chi nhánh</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}</select>}<button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Đóng' : 'Thêm nhân viên'}</button></div></div>
    {error && <ErrorNotice message={error} />}
    {showForm && <form className="ap-form ap-staff-form" onSubmit={create}><label>Họ và tên<input name="fullName" required /></label><label>Tên đăng nhập<input name="username" minLength={3} required /></label><label>Email<input name="email" type="email" required /></label><label>Số điện thoại<input name="phone" required /></label><label>Mật khẩu khởi tạo<input name="password" type="password" minLength={5} required /></label><label>Vai trò<select name="role" value={newRole} onChange={(e) => setNewRole(e.target.value as CreateStaffRequest['role'])}>{(isAdmin ? ['ADMIN', 'MANAGER', 'STAFF', 'CHEF'] : ['STAFF', 'CHEF']).map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}</select></label>{newRole !== 'ADMIN' && <label>Chi nhánh<select name="branchId" value={branchChoice ?? scopedBranch ?? ''} onChange={(e) => setBranchChoice(Number(e.target.value))} disabled={!isAdmin}><option value="" disabled>Chọn chi nhánh</option>{(isAdmin ? branches : branches.filter((b) => b.id === scopedBranch)).map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}</select></label>}<label>Lương theo giờ<input name="hourlyRate" type="number" min="0" defaultValue="30000" required /></label><button disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo tài khoản'}</button></form>}
    {editing && <form className="ap-form ap-staff-form" onSubmit={updateStaff}><label>Họ và tên<input name="fullName" defaultValue={editing.fullName} required /></label><label>Email<input name="email" type="email" defaultValue={editing.email} required /></label><label>Số điện thoại<input name="phone" defaultValue={editing.phone} required /></label><label>Vai trò<select name="role" defaultValue={editing.role}>{(isAdmin ? ['ADMIN', 'MANAGER', 'STAFF', 'CHEF'] : ['STAFF', 'CHEF']).map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}</select></label>{editing.role !== 'ADMIN' && <label>Chi nhánh<select name="branchId" defaultValue={editing.branchId} disabled={!isAdmin}>{(isAdmin ? branches : branches.filter((b) => b.id === scopedBranch)).map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}</select></label>}<label>Lương theo giờ<input name="hourlyRate" type="number" min="0" defaultValue={editing.hourlyRate ?? 0} required /></label><button>Lưu tài khoản</button><button type="button" className="ap-secondary" onClick={() => setEditing(null)}>Hủy</button></form>}
    <div className="ap-table-wrap"><table className="ap-table"><thead><tr><th>Nhân viên</th><th>Tên đăng nhập</th>{isAdmin && <th>Chi nhánh</th>}<th>Email</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead><tbody>{rows.map((staff) => <tr key={staff.id}><td><strong>{staff.fullName}</strong><small>{staff.code}</small></td><td>{staff.username}</td>{isAdmin && <td>{branches.find((b) => b.id === staff.branchId)?.name ?? 'Toàn chuỗi'}</td>}<td>{staff.email}</td><td>{roleLabel(staff.role)}</td><td><span className={`ap-status ${staff.status === 'ACTIVE' ? 'active' : ''}`}>{staff.status === 'ACTIVE' ? 'Đang hoạt động' : staff.status === 'LOCKED' ? 'Đã khóa' : staff.status}</span></td><td className="ap-row-actions"><button className="ap-text-button" onClick={() => { setEditing(staff); setShowForm(false) }}>Sửa</button>{staff.status === 'ACTIVE' && <button className="ap-text-button" onClick={() => void lockStaff(staff)}>Khóa</button>}</td></tr>)}</tbody></table>{rows.length === 0 && <div className="ap-empty">Chưa có tài khoản nhân viên.</div>}</div>
  </div>
}

function OperationalPage({ title, staffPath }: { title: string; staffPath: string }) {
  const { role, branchId, branches, setBranchId } = useAuth()
  const isAdmin = role === 'ADMIN'
  return (
    <div className="ap-page">
      <div className="ap-heading"><div><span className="ap-kicker">SAVORIS · VẬN HÀNH</span><h1>{title}</h1><p>{isAdmin ? 'Chọn chi nhánh để mở đúng màn hình vận hành.' : 'Mở giao diện vận hành tại chi nhánh của bạn.'}</p></div>{isAdmin && <label>Chi nhánh đang xem<select aria-label={`Chi nhánh đang xem — ${title}`} value={branchId ?? ''} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}><option value="">Toàn chuỗi</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}</select></label>}</div>
      {!branchId ? <div className="ap-empty" style={{ minHeight: 260 }}>
        <ShieldAlert size={34} /><h2>Chưa chọn chi nhánh</h2><p>Chọn một chi nhánh ở phía trên để tiếp tục.</p>
      </div> : <div className="ap-empty" style={{ minHeight: 260 }}>
        <a
          href={staffPath}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#a85a44', color: '#fff', borderRadius: 4, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}
        >
          Mở {title} →
        </a>
        <p style={{ marginTop: 8, fontSize: 13, color: '#a6a79e' }}>Giao diện mở trên cùng trình duyệt, trong tab hiện tại.</p>
      </div>}
    </div>
  )
}

export function AdminRoutes() {
  const { session } = useAuth()
  return <Routes><Route path="/admin/login" element={<AdminLogin />} /><Route element={<SignedIn />}><Route path="/admin" element={<AdminLayout />}>
    <Route index element={<Navigate to={session ? homeFor(session.staff.role) : '/admin/login'} replace />} />
    <Route path="overview" element={<Allowed roles={['ADMIN']}><Overview /></Allowed>} />
    <Route path="menu" element={<Allowed roles={['ADMIN']}><MenuManagementPage /></Allowed>} />
    <Route path="reservations" element={<Allowed roles={['ADMIN', 'MANAGER']}><ReservationsPage /></Allowed>} />
    <Route path="website" element={<Allowed roles={['ADMIN', 'MANAGER']}><WebsiteCMSPage branchOnly={session?.staff.role === 'MANAGER'} /></Allowed>} />
    <Route path="branch" element={<Allowed roles={['ADMIN', 'MANAGER']}><BranchPage /></Allowed>} />
    <Route path="staff" element={<Allowed roles={['ADMIN', 'MANAGER']}><StaffPage /></Allowed>} />
    <Route path="floor" element={<Allowed roles={['ADMIN', 'MANAGER', 'STAFF']}><OperationalPage title="Sơ đồ bàn" staffPath="/nha-hang/ban-hang" /></Allowed>} />
    <Route path="kitchen" element={<Allowed roles={['ADMIN', 'MANAGER', 'CHEF']}><OperationalPage title="Màn hình bếp" staffPath="/nha-hang/bep" /></Allowed>} />
    <Route path="*" element={<NoAccess />} />
  </Route></Route><Route path="*" element={<Navigate to="/admin/login" replace />} /></Routes>
}
