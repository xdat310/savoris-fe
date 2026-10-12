import { CalendarPlus, KeyRound, Plus, UserMinus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError, del, get, post, put } from '../api/client'
import type {
  BranchMenuItemResponse, CreateStaffRequest, CustomerResponse, ReservationResponse, ShiftResponse,
  StaffDetailResponse, StaffShiftResponse, TimesheetResponse,
} from '../api/types'
import { useAuth } from '../auth'
import { Strikable } from '../components/ChalkStrike'
import { DishThumb } from '../components/DishThumb'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { Chip } from '../components/State'
import { useToast } from '../components/Toast'
import { ROLE_LABEL, dateTime, isoDate, money, number } from '../lib/format'
import { useData } from '../lib/useData'
import { BranchSettings } from './BranchSettings'

type Tab = 'staff' | 'shifts' | 'menu' | 'reservations' | 'branch'

export function Manager() {
  const { branches, branchId } = useAuth()
  const [tab, setTab] = useState<Tab>('staff')
  const branch = branches.find((b) => b.id === branchId)
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Quản lý {branch ? `· ${branch.name}` : ''}</h1>
          <p>Nhân viên, ca làm, menu và cài đặt của chi nhánh.</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {([['staff', 'Nhân viên'], ['shifts', 'Ca làm & bảng công'], ['menu', 'Menu chi nhánh'], ['reservations', 'Đặt bàn'], ['branch', 'Chi nhánh']] as const).map(([id, label]) => (
          <button key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {branchId && tab === 'staff' && <Staff branchId={branchId} />}
      {branchId && tab === 'shifts' && <Shifts branchId={branchId} />}
      {branchId && tab === 'menu' && <BranchMenu branchId={branchId} />}
      {branchId && tab === 'reservations' && <Reservations branchId={branchId} />}
      {branch && tab === 'branch' && <BranchSettings branch={branch} />}
    </div>
  )
}

function useAction() {
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setError(null)
    try {
      await fn()
      if (ok) toast(ok)
      return true
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Có lỗi xảy ra')
      return false
    }
  }
  return { error, run }
}

// ---------------------------------------------------------------- staff

const HIREABLE: CreateStaffRequest['role'][] = ['CASHIER', 'WAITER', 'CHEF', 'WAREHOUSE']

function Staff({ branchId }: { branchId: number }) {
  const { role } = useAuth()
  const staff = useData(() => get<StaffDetailResponse[]>(`/staff/branch/${branchId}`), [branchId])
  const { error, run } = useAction()
  const roles: CreateStaffRequest['role'][] = role === 'ADMIN' ? [...HIREABLE, 'BRANCH_MANAGER'] : HIREABLE
  const blank = { fullName: '', username: '', phone: '', email: '', role: 'CASHIER' as CreateStaffRequest['role'], hourlyRate: '30000', password: '' }
  const [f, setF] = useState(blank)

  function hire(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      await post('/staff', {
        code: `NV${Date.now() % 1000000}`, fullName: f.fullName.trim(), username: f.username.trim(), email: f.email.trim(),
        phone: f.phone.trim(), role: f.role, branchId, hourlyRate: Number(f.hourlyRate), password: f.password,
      } satisfies CreateStaffRequest)
      setF(blank)
      await staff.reload()
    }, 'Đã tạo tài khoản')
  }

  function resetPassword(s: StaffDetailResponse) {
    const pw = window.prompt(`Mật khẩu mới cho ${s.fullName} (ít nhất 5 ký tự):`)
    if (!pw) return
    run(() => put(`/staff/${s.id}/password`, { newPassword: pw }), `Đã đặt lại mật khẩu cho ${s.fullName}`)
  }

  function resign(s: StaffDetailResponse) {
    if (!window.confirm(`Cho ${s.fullName} nghỉ việc? Tài khoản bị khoá ngay lập tức.`)) return
    run(async () => {
      await del(`/staff/${s.id}`)
      await staff.reload()
    }, `${s.fullName} đã nghỉ việc`)
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {error && <ErrorNotice message={error} />}
      <div className="panel">
        {staff.loading ? <Loading /> : (staff.data?.length ?? 0) === 0 ? <Empty title="Chưa có nhân viên" /> : (
          <table className="data">
            <thead><tr><th>Họ tên</th><th>Tài khoản</th><th>Vai trò</th><th>Điện thoại</th><th className="right">Lương giờ</th><th /></tr></thead>
            <tbody>
              {staff.data!.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                  <td className="muted">{s.username}</td>
                  <td>{ROLE_LABEL[s.role ?? '']}</td>
                  <td className="num">{s.phone}</td>
                  <td className="num right">{s.hourlyRate ? money(s.hourlyRate) : '—'}</td>
                  <td className="right">
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" onClick={() => resetPassword(s)}><KeyRound size={14} aria-hidden="true" /> Đặt lại mật khẩu</button>
                      <button className="btn btn-sm btn-danger" onClick={() => resign(s)}><UserMinus size={14} aria-hidden="true" /> Nghỉ việc</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <form className="panel panel-pad" onSubmit={hire} style={{ display: 'grid', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>Thêm nhân viên</h2>
        <div className="grid-form">
          <label className="field">Họ tên<input className="input" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></label>
          <label className="field">Tên đăng nhập<input className="input" required minLength={3} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
          <label className="field">Mật khẩu ban đầu<input className="input" required minLength={5} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
          <label className="field">Vai trò
            <select className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as CreateStaffRequest['role'] })}>
              {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </label>
          <label className="field">Điện thoại<input className="input" required inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <label className="field">Email<input className="input" required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <label className="field">Lương giờ (đ)<input className="input num" required type="number" min={0} step={1000} value={f.hourlyRate} onChange={(e) => setF({ ...f, hourlyRate: e.target.value })} /></label>
          <button className="btn btn-primary"><Plus size={16} aria-hidden="true" /> Tạo tài khoản</button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------- shifts & timesheet

function Shifts({ branchId }: { branchId: number }) {
  const [today] = useState(() => new Date())
  const [from, setFrom] = useState(isoDate(today))
  const [to, setTo] = useState(isoDate(new Date(today.getTime() + 6 * 86400000)))
  const shifts = useData(() => get<ShiftResponse[]>(`/branches/${branchId}/shifts`), [branchId])
  const staff = useData(() => get<StaffDetailResponse[]>(`/staff/branch/${branchId}`), [branchId])
  const schedule = useData(() => get<StaffShiftResponse[]>(`/branches/${branchId}/schedule?from=${from}&to=${to}`), [branchId, from, to])
  const sheet = useData(() => get<TimesheetResponse[]>(`/branches/${branchId}/timesheet?from=${from}&to=${to}`), [branchId, from, to])
  const { error, run } = useAction()
  const [newShift, setNewShift] = useState({ name: '', startTime: '07:00', endTime: '15:00' })
  const [assign, setAssign] = useState({ shiftId: '', staffId: '', workDate: isoDate(today) })

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {error && <ErrorNotice message={error} />}
      <div className="row">
        <label className="field">Từ ngày<input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field">Đến ngày<input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-head"><h2>Các ca</h2></div>
          <div className="panel-pad" style={{ display: 'grid', gap: 10 }}>
            {shifts.data?.map((s) => (
              <div key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{s.name}</strong>
                <span className="chalk num" style={{ fontSize: 22, color: 'var(--ink)' }}>{s.startTime?.slice(0, 5)} – {s.endTime?.slice(0, 5)}</span>
              </div>
            ))}
            {shifts.data?.length === 0 && <span className="muted">Chưa có ca nào.</span>}
            <form className="row" onSubmit={(e) => { e.preventDefault(); run(async () => { await post(`/branches/${branchId}/shifts`, newShift); setNewShift({ ...newShift, name: '' }); await shifts.reload() }, 'Đã tạo ca') }}>
              <input className="input" required placeholder="Tên ca" value={newShift.name} onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} style={{ flex: 1, minWidth: 120 }} />
              <input className="input" type="time" required value={newShift.startTime} onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })} aria-label="Giờ vào" />
              <input className="input" type="time" required value={newShift.endTime} onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })} aria-label="Giờ ra" />
              <button className="btn"><Plus size={16} aria-hidden="true" /> Tạo ca</button>
            </form>
          </div>
        </div>

        <form className="panel panel-pad" style={{ display: 'grid', gap: 12 }} onSubmit={(e) => {
          e.preventDefault()
          run(async () => {
            await post(`/shifts/${assign.shiftId}/assignments`, { staffId: Number(assign.staffId), workDate: assign.workDate })
            await schedule.reload()
          }, 'Đã xếp ca')
        }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Xếp ca</h2>
          <label className="field">Nhân viên
            <select className="select" required value={assign.staffId} onChange={(e) => setAssign({ ...assign, staffId: e.target.value })}>
              <option value="">Chọn nhân viên</option>
              {staff.data?.map((s) => <option key={s.id} value={s.id}>{s.fullName} · {ROLE_LABEL[s.role ?? '']}</option>)}
            </select>
          </label>
          <label className="field">Ca
            <select className="select" required value={assign.shiftId} onChange={(e) => setAssign({ ...assign, shiftId: e.target.value })}>
              <option value="">Chọn ca</option>
              {shifts.data?.map((s) => <option key={s.id} value={s.id}>{s.name} {s.startTime?.slice(0, 5)}–{s.endTime?.slice(0, 5)}</option>)}
            </select>
          </label>
          <label className="field">Ngày<input className="input" type="date" required min={isoDate(today)} value={assign.workDate} onChange={(e) => setAssign({ ...assign, workDate: e.target.value })} /></label>
          <button className="btn btn-primary"><CalendarPlus size={16} aria-hidden="true" /> Xếp ca</button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Lịch làm việc</h2></div>
        {schedule.loading ? <Loading /> : (schedule.data?.length ?? 0) === 0 ? <Empty title="Chưa xếp ca trong khoảng này" /> : (
          <table className="data">
            <thead><tr><th>Ngày</th><th>Ca</th><th>Nhân viên</th><th>Vào</th><th>Ra</th><th /></tr></thead>
            <tbody>
              {schedule.data!.map((a) => (
                <tr key={a.id}>
                  <td className="num">{a.workDate}</td>
                  <td>{a.shiftName} <span className="muted num">{a.startTime?.slice(0, 5)}–{a.endTime?.slice(0, 5)}</span></td>
                  <td style={{ fontWeight: 600 }}>{a.staffName}</td>
                  <td className="num">{a.checkInAt ? dateTime(a.checkInAt) : <span className="muted">—</span>}</td>
                  <td className="num">{a.checkOutAt ? dateTime(a.checkOutAt) : <span className="muted">—</span>}</td>
                  <td className="right">
                    {!a.checkInAt && (
                      <button className="btn btn-sm btn-ghost" onClick={() => run(async () => { await del(`/shift-assignments/${a.id}`); await schedule.reload() }, 'Đã bỏ xếp ca')}>Bỏ</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Bảng công</h2><span className="muted" style={{ fontSize: 13 }}>Giờ vào → ra thực tế × lương giờ</span></div>
        {sheet.loading ? <Loading /> : (sheet.data?.length ?? 0) === 0 ? <Empty title="Chưa có công trong khoảng này" /> : (
          <table className="data">
            <thead><tr><th>Nhân viên</th><th className="right">Ca đã làm</th><th className="right">Ca vắng</th><th className="right">Giờ làm</th><th className="right">Lương giờ</th><th className="right">Tiền công</th></tr></thead>
            <tbody>
              {sheet.data!.map((r) => (
                <tr key={r.staffId}>
                  <td style={{ fontWeight: 600 }}>{r.staffName} <span className="muted" style={{ fontWeight: 400 }}>· {ROLE_LABEL[r.role ?? '']}</span></td>
                  <td className="num right">{r.shiftsWorked}</td>
                  <td className="num right">{r.shiftsMissed ? <Chip tone="bad">{r.shiftsMissed}</Chip> : 0}</td>
                  <td className="num right">{number(r.hoursWorked, 2)}</td>
                  <td className="num right">{money(r.hourlyRate)}</td>
                  <td className="num right" style={{ fontWeight: 700 }}>{money(r.wage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- branch menu

function BranchMenu({ branchId }: { branchId: number }) {
  const menu = useData(() => get<BranchMenuItemResponse[]>(`/branches/${branchId}/menu`), [branchId])
  const { error, run } = useAction()

  const setPrice = (m: BranchMenuItemResponse, raw: string) => {
    const price = raw.trim() === '' ? null : Number(raw)
    if (price === (m.branchPrice ?? null)) return
    run(async () => {
      await put(`/branches/${branchId}/menu/${m.menuItemId}/price`, { price })
      await menu.reload()
    }, price == null ? `${m.name} về giá chung` : `${m.name}: ${money(price)}`)
  }

  return (
    <div className="panel">
      <div className="panel-head"><h2>Giá và món đang bán</h2><span className="muted" style={{ fontSize: 13 }}>Để trống giá riêng = theo giá chung của chuỗi</span></div>
      {error && <div style={{ padding: '12px 20px 0' }}><ErrorNotice message={error} /></div>}
      {menu.loading ? <Loading /> : (
        <table className="data">
          <thead><tr><th>Món</th><th className="right">Giá chung</th><th className="right">Giá riêng chi nhánh</th><th className="right">Khách trả</th><th>Tình trạng</th></tr></thead>
          <tbody>
            {menu.data?.map((m) => (
              <tr key={m.menuItemId}>
                <td style={{ fontWeight: 600 }}><span className="with-thumb"><DishThumb src={m.imageUrl} name={m.name} size="sm" /><Strikable on={!m.available}>{m.name}</Strikable></span></td>
                <td className="num right muted">{money(m.basePrice)}</td>
                <td className="right">
                  <input className="input num" type="number" min={0} step={1000} placeholder="—" defaultValue={m.branchPrice ?? ''} key={m.branchPrice ?? 'none'}
                    style={{ width: 130, textAlign: 'right' }} onBlur={(e) => setPrice(m, e.target.value)} aria-label={`Giá riêng ${m.name}`} />
                </td>
                <td className="num right" style={{ fontWeight: 700 }}>{money(m.price)}</td>
                <td>
                  <button className={`btn btn-sm${m.available ? '' : ' btn-accent'}`} onClick={() => run(async () => {
                    await put(`/branches/${branchId}/menu/${m.menuItemId}/availability`, { available: !m.available })
                    await menu.reload()
                  }, m.available ? `Đã báo hết ${m.name}` : `${m.name} bán lại`)}>
                    {m.available ? 'Báo hết món' : 'Bán lại'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- reservations

function Reservations({ branchId }: { branchId: number }) {
  const list = useData(() => get<ReservationResponse[]>(`/reservations/branch/${branchId}`), [branchId])
  const { error, run } = useAction()
  const [f, setF] = useState(() => ({ phone: '', name: '', when: `${isoDate(new Date(Date.now() + 86400000))}T19:00`, guests: '4', notes: '' }))

  async function book(e: FormEvent) {
    e.preventDefault()
    await run(async () => {
      let customer: CustomerResponse
      try {
        customer = await get<CustomerResponse>(`/customers/by-phone?phone=${encodeURIComponent(f.phone.trim())}`)
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) throw err
        customer = await post<CustomerResponse>('/customers', { fullName: f.name.trim() || f.phone.trim(), phone: f.phone.trim() })
      }
      await post('/reservations', { branchId, customerId: customer.id, reservationDate: `${f.when}:00`, numberOfGuests: Number(f.guests), notes: f.notes || undefined })
      setF({ ...f, phone: '', name: '', notes: '' })
      await list.reload()
    }, 'Đã đặt bàn')
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {error && <ErrorNotice message={error} />}
      <div className="panel">
        <div className="panel-head"><h2>Đặt bàn chờ xác nhận</h2></div>
        {list.loading ? <Loading /> : (list.data?.length ?? 0) === 0 ? <Empty title="Không có đặt bàn chờ xác nhận" /> : (
          <table className="data">
            <thead><tr><th>Thời gian</th><th className="right">Số khách</th><th>Ghi chú</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {list.data!.map((r) => (
                <tr key={r.id}>
                  <td className="num" style={{ fontWeight: 600 }}>{dateTime(r.reservationDate)}</td>
                  <td className="num right">{r.numberOfGuests}</td>
                  <td>{r.notes}</td>
                  <td><Chip tone="warn">Chờ xác nhận</Chip></td>
                  <td className="right">
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-accent" onClick={() => run(async () => { await put(`/reservations/${r.id}/confirm`); await list.reload() }, 'Đã xác nhận')}>Xác nhận</button>
                      <button className="btn btn-sm btn-danger" onClick={() => run(async () => { await put(`/reservations/${r.id}/cancel`); await list.reload() }, 'Đã huỷ đặt bàn')}>Huỷ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <form className="panel panel-pad" onSubmit={book} style={{ display: 'grid', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>Đặt bàn mới</h2>
        <div className="grid-form">
          <label className="field">SĐT khách<input className="input" required inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <label className="field">Tên (nếu khách mới)<input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="field">Thời gian<input className="input" type="datetime-local" required value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} /></label>
          <label className="field">Số khách<input className="input num" type="number" min={1} required value={f.guests} onChange={(e) => setF({ ...f, guests: e.target.value })} /></label>
          <label className="field">Ghi chú<input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Sinh nhật, gần cửa sổ…" /></label>
          <button className="btn btn-primary"><CalendarPlus size={16} aria-hidden="true" /> Đặt bàn</button>
        </div>
      </form>
    </div>
  )
}

