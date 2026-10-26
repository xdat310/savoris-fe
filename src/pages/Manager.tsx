import { CalendarPlus, Check, KeyRound, Plus, UserMinus, UsersRound, X } from 'lucide-react'
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
import { TabList } from '../components/ui/TabList'
import { Avatar, Badge, RoleBadge } from '../components/ui/Badge'
import { Drawer, confirmDialog, promptDialog } from '../components/ui/Dialog'
import { Icon } from '../components/ui/Icon'
import { RowMenu } from '../components/ui/RowMenu'
import { EMPTY, ROLE_LABEL, date, dateTime, hourly, isoDate, money, number, phone, time } from '../lib/format'
import { useData } from '../lib/useData'
import { BranchSettings } from './BranchSettings'
import { KitchenForecast } from '../components/KitchenForecast'

type Tab = 'staff' | 'shifts' | 'menu' | 'reservations' | 'branch' | 'forecast'

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
      <TabList label="Mục quản lý chi nhánh">
        {([['staff', 'Nhân viên'], ['shifts', 'Ca làm & bảng công'], ['menu', 'Menu chi nhánh'], ['reservations', 'Đặt bàn'], ['branch', 'Chi nhánh'], ['forecast', 'Dự báo bếp']] as const).map(([id, label]) => (
          <button key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </TabList>
      {branchId && tab === 'staff' && <Staff branchId={branchId} />}
      {branchId && tab === 'shifts' && <Shifts branchId={branchId} />}
      {branchId && tab === 'menu' && <BranchMenu branchId={branchId} />}
      {branchId && tab === 'reservations' && <Reservations branchId={branchId} />}
      {branch && tab === 'branch' && <BranchSettings branch={branch} />}
      {branchId && tab === 'forecast' && <KitchenForecast branchId={branchId} />}
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

const HIREABLE: CreateStaffRequest['role'][] = ['STAFF', 'CHEF']

function Staff({ branchId }: { branchId: number }) {
  const { role } = useAuth()
  const staff = useData(() => get<StaffDetailResponse[]>(`/staff/branch/${branchId}`), [branchId])
  const { error, run } = useAction()
  const roles: CreateStaffRequest['role'][] = role === 'ADMIN' ? [...HIREABLE, 'MANAGER'] : HIREABLE
  const blank = { fullName: '', username: '', phone: '', email: '', role: 'STAFF' as CreateStaffRequest['role'], hourlyRate: '30000', password: '' }
  const [f, setF] = useState(blank)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  async function hire(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const ok = await run(async () => {
      await post('/staff', {
        code: `NV${Date.now() % 1000000}`, fullName: f.fullName.trim(), username: f.username.trim(), email: f.email.trim(),
        phone: f.phone.trim(), role: f.role, branchId, hourlyRate: Number(f.hourlyRate), password: f.password,
      } satisfies CreateStaffRequest)
      setF(blank)
      await staff.reload()
    }, 'Đã tạo tài khoản')
    setSaving(false)
    if (ok) setAdding(false)
  }

  async function resetPassword(s: StaffDetailResponse) {
    const pw = await promptDialog({ title: `Đặt lại mật khẩu cho ${s.fullName}`, label: 'Mật khẩu mới (ít nhất 5 ký tự)', minLength: 5, confirmLabel: 'Đặt lại' })
    if (!pw) return
    run(() => put(`/staff/${s.id}/password`, { newPassword: pw }), `Đã đặt lại mật khẩu cho ${s.fullName}`)
  }

  async function resign(s: StaffDetailResponse) {
    if (!(await confirmDialog({ title: `Cho ${s.fullName} nghỉ việc?`, message: 'Tài khoản bị khoá ngay lập tức và không đăng nhập được nữa.', confirmLabel: 'Nghỉ việc', danger: true }))) return
    run(async () => {
      await del(`/staff/${s.id}`)
      await staff.reload()
    }, `${s.fullName} đã nghỉ việc`)
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      {error && <ErrorNotice message={error} />}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Nhân viên</h2>
            {staff.data && <p>{staff.data.length} người đang làm việc</p>}
          </div>
          <button className="btn btn-primary" onClick={() => setAdding(true)}><Icon icon={Plus} /> Thêm nhân viên</button>
        </div>
        {staff.loading ? <Loading /> : (staff.data?.length ?? 0) === 0
          ? <Empty title="Chưa có nhân viên" icon={UsersRound} action={<button className="btn btn-primary" onClick={() => setAdding(true)}><Icon icon={Plus} /> Thêm nhân viên</button>}>Tạo tài khoản đầu tiên cho chi nhánh.</Empty>
          : (
          <table className="data">
            <thead><tr><th>Họ tên</th><th>Tài khoản</th><th>Vai trò</th><th>Điện thoại</th><th className="right">Lương giờ</th><th className="actions"><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {staff.data!.map((s) => (
                <tr key={s.id}>
                  <td><span className="with-avatar"><Avatar name={s.fullName} size="sm" /><span className="cell-strong">{s.fullName}</span></span></td>
                  <td className="cell-muted">{s.username}</td>
                  <td><RoleBadge role={s.role} /></td>
                  <td className={s.phone ? 'num' : 'empty-val'}>{phone(s.phone)}</td>
                  <td className={`right${s.hourlyRate ? '' : ' empty-val'}`}>{hourly(s.hourlyRate || null)}</td>
                  <td className="actions">
                    <RowMenu label={`Thao tác cho ${s.fullName}`} items={[
                      { label: 'Đặt lại mật khẩu', icon: KeyRound, onSelect: () => resetPassword(s) },
                      { label: 'Nghỉ việc', icon: UserMinus, danger: true, onSelect: () => resign(s) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {adding && (
        <Drawer title="Thêm nhân viên" onClose={() => setAdding(false)}>
          <form onSubmit={hire} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <label className="field">Họ tên<input className="input" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} data-autofocus /></label>
            <div className="form-2">
              <label className="field">Tên đăng nhập<input className="input" required minLength={3} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
              <label className="field">Mật khẩu ban đầu<input className="input" required minLength={5} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
            </div>
            <label className="field">Vai trò
              <select className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as CreateStaffRequest['role'] })}>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </label>
            <div className="form-2">
              <label className="field">Điện thoại<input className="input" required inputMode="tel" placeholder="0912 345 678" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
              <label className="field">Lương giờ (₫)<input className="input num" required type="number" min={0} step={1000} value={f.hourlyRate} onChange={(e) => setF({ ...f, hourlyRate: e.target.value })} /></label>
            </div>
            <label className="field">Email<input className="input" required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setAdding(false)}>Huỷ</button>
              <button className="btn btn-primary" data-loading={saving || undefined} disabled={saving}><Icon icon={Plus} /> Tạo tài khoản</button>
            </div>
          </form>
        </Drawer>
      )}
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
                <span className="chalk">{s.startTime?.slice(0, 5)} – {s.endTime?.slice(0, 5)}</span>
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
          <h2 className="card-title">Xếp ca</h2>
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
        <div className="panel-head"><h2>Lịch làm việc</h2><p>{date(`${from}T00:00`)} – {date(`${to}T00:00`)}</p></div>
        {schedule.loading ? <Loading /> : (schedule.data?.length ?? 0) === 0
          ? <Empty title="Chưa xếp ca trong khoảng này" icon={CalendarPlus}>Chọn nhân viên, ca và ngày ở khung “Xếp ca” phía trên.</Empty>
          : <WeekGrid from={from} to={to} rows={schedule.data!}
              onRemove={(a) => run(async () => { await del(`/shift-assignments/${a.id}`); await schedule.reload() }, 'Đã bỏ xếp ca')} />}
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Bảng công</h2><p>Giờ làm thực tế nhân với lương giờ</p></div>
        {sheet.loading ? <Loading /> : (sheet.data?.length ?? 0) === 0 ? <Empty title="Chưa có công trong khoảng này" /> : (
          <table className="data">
            <thead><tr><th>Nhân viên</th><th className="right">Ca đã làm</th><th className="right">Ca vắng</th><th className="right">Giờ làm</th><th className="right">Lương giờ</th><th className="right">Tiền công</th></tr></thead>
            <tbody>
              {sheet.data!.map((r) => (
                <tr key={r.staffId}>
                  <td><span className="with-avatar"><Avatar name={r.staffName} size="sm" /><span className="cell-strong">{r.staffName}</span><RoleBadge role={r.role} /></span></td>
                  <td className="right">{r.shiftsWorked}</td>
                  <td className="right">{r.shiftsMissed ? <Chip tone="bad">{r.shiftsMissed}</Chip> : 0}</td>
                  <td className="right">{number(r.hoursWorked, 2)} giờ</td>
                  <td className="right cell-muted">{hourly(r.hourlyRate)}</td>
                  <td className="right cell-strong">{money(r.wage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// Week grid: one row per staff member, one column per day of the chosen range (max 14 days shown)
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function WeekGrid({ from, to, rows, onRemove }: {
  from: string; to: string; rows: StaffShiftResponse[]; onRemove: (a: StaffShiftResponse) => void
}) {
  const days: string[] = []
  for (let d = new Date(`${from}T00:00`); isoDate(d) <= to && days.length < 14; d.setDate(d.getDate() + 1)) days.push(isoDate(d))
  const [today] = useState(() => isoDate(new Date()))
  const people = [...new Set(rows.map((r) => r.staffName ?? ''))].sort((a, b) => a.localeCompare(b, 'vi'))
  const cell = (name: string, day: string) => rows.filter((r) => r.staffName === name && r.workDate === day)

  return (
    <div className="week-grid-wrap">
      <table className="week-grid" style={{ '--days': days.length } as React.CSSProperties}>
        <thead>
          <tr>
            <th className="wg-name">Nhân viên</th>
            {days.map((d) => {
              const dt = new Date(`${d}T00:00`)
              return (
                <th key={d} className={d === today ? 'wg-today' : undefined}>
                  <span className="wg-dow">{WEEKDAY[dt.getDay()]}</span>
                  <span className="wg-date num">{date(dt).slice(0, 5)}</span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {people.map((name) => (
            <tr key={name}>
              <th scope="row" className="wg-name"><span className="with-avatar"><Avatar name={name} size="sm" />{name}</span></th>
              {days.map((d) => (
                <td key={d} className={d === today ? 'wg-today' : undefined}>
                  {cell(name, d).map((a) => (
                    <div key={a.id} className={`wg-shift${a.checkInAt ? ' wg-shift--in' : ''}`}>
                      <span className="wg-shift-name">{a.shiftName}</span>
                      <span className="wg-shift-time num">{a.startTime?.slice(0, 5)}–{a.endTime?.slice(0, 5)}</span>
                      {a.checkInAt
                        ? <span className="wg-shift-in num">Vào {time(a.checkInAt)}{a.checkOutAt ? ` · Ra ${time(a.checkOutAt)}` : ''}</span>
                        : <button className="wg-remove" aria-label={`Bỏ ca ${a.shiftName} của ${name} ngày ${date(`${d}T00:00`)}`} data-tip="Bỏ xếp ca" onClick={() => onRemove(a)}><Icon icon={X} size="sm" /></button>}
                    </div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
      <div className="panel-head"><h2>Giá và món đang bán</h2><p>Để trống giá riêng thì món theo giá chung của chuỗi</p></div>
      {error && <div style={{ padding: '12px 20px 0' }}><ErrorNotice message={error} /></div>}
      {menu.loading ? <Loading /> : (
        <table className="data">
          <thead><tr><th>Món</th><th className="right">Giá chung</th><th className="right">Giá riêng chi nhánh</th><th className="right">Khách trả</th><th>Tình trạng</th><th className="actions"><span className="sr-only">Thao tác</span></th></tr></thead>
          <tbody>
            {menu.data?.map((m) => (
              <tr key={m.menuItemId}>
                <td className="cell-strong"><span className="with-thumb"><DishThumb src={m.imageUrl} name={m.name} size="sm" /><Strikable on={!m.available}>{m.name}</Strikable></span></td>
                <td className="right cell-muted">{money(m.basePrice)}</td>
                <td className="right">
                  <input className="input num input-price" type="number" min={0} step={1000} placeholder={EMPTY} defaultValue={m.branchPrice ?? ''} key={m.branchPrice ?? 'none'}
                    onBlur={(e) => setPrice(m, e.target.value)} aria-label={`Giá riêng ${m.name}`} />
                </td>
                <td className="right cell-strong">{money(m.price)}</td>
                <td>
                  {m.available ? <Badge tone="success">Đang bán</Badge> : <Badge tone="danger">Hết món</Badge>}
                </td>
                <td className="actions">
                  <button className={`btn btn-sm${m.available ? '' : ' btn-primary'}`} onClick={() => run(async () => {
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
            <thead><tr><th>Thời gian</th><th className="right">Số khách</th><th>Ghi chú</th><th>Trạng thái</th><th className="actions"><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {list.data!.map((r) => (
                <tr key={r.id}>
                  <td className="cell-strong">{dateTime(r.reservationDate)}</td>
                  <td className="right">{r.numberOfGuests} khách</td>
                  <td className={r.notes ? undefined : 'empty-val'}>{r.notes || EMPTY}</td>
                  <td><Chip tone="warn">Chờ xác nhận</Chip></td>
                  <td className="actions">
                    <div className="row">
                      <button className="btn btn-sm btn-primary" onClick={() => run(async () => { await put(`/reservations/${r.id}/confirm`); await list.reload() }, 'Đã xác nhận')}><Icon icon={Check} /> Xác nhận</button>
                      <RowMenu label="Thao tác khác" items={[{
                        label: 'Huỷ đặt bàn', icon: X, danger: true,
                        onSelect: async () => {
                          if (!(await confirmDialog({ title: 'Huỷ đặt bàn này?', message: `${dateTime(r.reservationDate)} · ${r.numberOfGuests} khách`, confirmLabel: 'Huỷ đặt bàn', cancelLabel: 'Giữ lại', danger: true }))) return
                          run(async () => { await put(`/reservations/${r.id}/cancel`); await list.reload() }, 'Đã huỷ đặt bàn')
                        },
                      }]} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <form className="panel panel-pad" onSubmit={book} style={{ display: 'grid', gap: 14 }}>
        <h2 className="card-title">Đặt bàn mới</h2>
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

