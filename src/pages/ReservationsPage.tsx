import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Check, X } from 'lucide-react'
import { ApiError, get, put } from '../api/client'
import type { ReservationResponse } from '../api/types'
import { useAuth } from '../auth'
import { ErrorNotice } from '../components/Feedback'

const day = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
const statuses = [
  ['', 'Tất cả trạng thái'], ['PENDING', 'Chờ xác nhận'], ['CONFIRMED', 'Đã xác nhận'],
  ['CANCELLED', 'Đã hủy'], ['NO_SHOW', 'Khách không đến'],
]
const label = (value?: string) => statuses.find(([key]) => key === value)?.[1] ?? value ?? '—'

export function ReservationsPage() {
  const { role, session, branches } = useAuth()
  const isAdmin = role === 'ADMIN'
  const scopedBranch = session?.staff.branchId ?? undefined
  const [branchId, setBranchId] = useState<number | undefined>(isAdmin ? undefined : scopedBranch)
  const [date, setDate] = useState(day)
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState<ReservationResponse[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!branchId) { setRows([]); return }
    setLoading(true); setError('')
    try {
      const query = new URLSearchParams({ date })
      if (status) query.set('status', status)
      setRows(await get<ReservationResponse[]>(`/reservations/branch/${branchId}?${query}`))
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không tải được danh sách đặt bàn') }
    finally { setLoading(false) }
  }, [branchId, date, status])
  useEffect(() => { void reload() }, [reload])

  async function action(id: number | undefined, kind: 'confirm' | 'cancel' | 'no-show') {
    if (!id) return
    setError('')
    try { await put(`/reservations/${id}/${kind}`, {}); await reload() }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Không cập nhật được đặt bàn') }
  }

  return <div className="ap-page">
    <div className="ap-heading"><div><span className="ap-kicker">SAVORIS · TIẾP ĐÓN</span><h1>Đặt bàn</h1><p>Lọc lịch hẹn theo ngày, chi nhánh và trạng thái.</p></div>
      <div className="ap-heading-actions">{isAdmin && <select aria-label="Chi nhánh" value={branchId ?? ''} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}><option value="">Chọn chi nhánh</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}</select>}
        <label className="ap-filter-label">Ngày<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <select aria-label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
      </div>
    </div>
    {error && <ErrorNotice message={error} />}
    {!branchId && <div className="ap-empty">Chọn chi nhánh để xem lịch đặt bàn.</div>}
    {branchId && <div className="ap-table-wrap"><table className="ap-table"><thead><tr><th>Giờ</th><th>Khách</th><th>Số khách</th><th>Ghi chú</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td>{r.reservationDate?.slice(11,16) ?? '—'}</td><td><strong>{r.customerName ?? `Đặt bàn #${r.id}`}</strong><small>{r.customerPhone}</small></td><td>{r.numberOfGuests}</td><td>{r.notes || '—'}</td><td><span className={`ap-status${r.status === 'CONFIRMED' ? ' active' : ''}`}>{label(r.status)}</span></td><td className="ap-row-actions">{r.status === 'PENDING' && <button className="ap-text-button" onClick={() => void action(r.id,'confirm')}><Check size={14}/> Xác nhận</button>}{['PENDING','CONFIRMED'].includes(r.status ?? '') && <><button className="ap-text-button" onClick={() => void action(r.id,'no-show')}>Không đến</button><button className="ap-text-button" onClick={() => void action(r.id,'cancel')}><X size={14}/> Hủy</button></>}</td></tr>)}</tbody>
      </table>{loading ? <div className="ap-empty">Đang tải lịch đặt…</div> : rows.length === 0 ? <div className="ap-empty"><CalendarDays size={22}/> Chưa có lịch đặt bàn trong ngày này.</div> : null}</div>}
  </div>
}
