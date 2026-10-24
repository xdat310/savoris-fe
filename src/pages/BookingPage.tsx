import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { get, post, ApiError } from '../api/client'
import type { PublicBranchResponse, ReservationResponse } from '../api/types'
import type { SlotAvailability } from '../api/reservation'
import { branchLabel } from '../api/site'
import { ErrorNotice, Loading } from '../components/Feedback'
import './booking-page.css'

type Branch = PublicBranchResponse & { slug?: string }
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
const slugKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

export function BookingPage() {
  const [params] = useSearchParams()
  const requestedBranch = params.get('chi-nhanh') ?? ''
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState<number | null>(null)
  const [date, setDate] = useState(today)
  const [slots, setSlots] = useState<SlotAvailability[]>([])
  const [slot, setSlot] = useState('')
  const [guests, setGuests] = useState(2)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState<ReservationResponse | null>(null)

  useEffect(() => {
    get<Record<string, unknown>>('/public/site').then((site) => {
      const rows = Array.isArray(site.branches) ? site.branches as Branch[] : []
      setBranches(rows)
      const match = rows.find((b) => slugKey(b.slug ?? '') === slugKey(requestedBranch) || slugKey(b.code ?? '') === slugKey(requestedBranch))
      setBranchId(match?.id ?? rows[0]?.id ?? null)
    }).catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được danh sách chi nhánh'))
      .finally(() => setLoading(false))
  }, [requestedBranch])

  useEffect(() => {
    if (!branchId || !date) { setSlots([]); return }
    setSlot('')
    get<SlotAvailability[]>(`/reservations/guest/slots?branchId=${branchId}&date=${date}`)
      .then(setSlots).catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được giờ đặt bàn'))
  }, [branchId, date])

  const branch = useMemo(() => branches.find((b) => b.id === branchId), [branches, branchId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!branchId || !slot) return
    setSending(true); setError('')
    const data = new FormData(event.currentTarget)
    try {
      const result = await post<ReservationResponse>('/reservations/guest', {
        branchId, guestName: String(data.get('guestName')).trim(), guestPhone: String(data.get('guestPhone')).replace(/\s/g, ''),
        reservationDate: slot, numberOfGuests: guests, notes: String(data.get('notes') ?? '').trim() || undefined,
      })
      setConfirmed(result)
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Chưa gửi được yêu cầu đặt bàn') }
    finally { setSending(false) }
  }

  if (loading) return <main className="venue-booking"><Loading label="Đang tải chi nhánh…" /></main>
  if (confirmed) return <main className="venue-booking"><Link to="/" className="venue-brand">SAVORIS</Link><section className="booking-confirm"><span>ĐÃ GỬI YÊU CẦU</span><h1>Hẹn gặp bạn<br />tại Savoris.</h1><p>Mã đặt bàn <strong>DB-{confirmed.id}</strong>. Chi nhánh sẽ liên hệ để xác nhận lịch hẹn.</p><Link className="venue-button" to="/">Về trang chủ</Link></section></main>

  return <main className="venue-booking">
    <header><Link to="/" className="venue-brand">SAVORIS</Link><Link to="/" className="booking-back">← Trang chủ</Link></header>
    <div className="booking-layout"><div className="booking-intro"><span>ĐẶT BÀN</span><h1>Một chỗ ngồi<br />đang chờ bạn.</h1><p>Chọn chi nhánh và khung giờ phù hợp. Yêu cầu sẽ được gửi đến nhà hàng để xác nhận.</p></div>
      <form className="booking-form" onSubmit={submit}>
        {error && <ErrorNotice message={error} />}
        <label>Chi nhánh<select value={branchId ?? ''} onChange={(e) => setBranchId(Number(e.target.value))} required>{branches.map((b) => <option key={b.id} value={b.id}>{branchLabel(b)}</option>)}</select></label>
        {branch?.address && <p className="booking-address">{branch.address}{branch.city ? `, ${branch.city}` : ''}</p>}
        <label>Ngày<input type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <fieldset><legend>Giờ · chọn một khung 30 phút</legend><div className="booking-slots">{slots.filter((s) => s.available).map((s) => <button type="button" key={s.slotTime} className={slot === s.slotTime ? 'is-selected' : ''} onClick={() => setSlot(s.slotTime ?? '')}>{s.slotTime?.slice(11, 16)}</button>)}</div>{slots.length === 0 && <p className="booking-address">Ngày này chi nhánh nghỉ hoặc đã hết khung giờ đặt bàn.</p>}</fieldset>
        <label>Số khách<input type="number" min="1" max="40" value={guests} onChange={(e) => setGuests(Number(e.target.value))} required /></label>
        <label>Họ tên<input name="guestName" autoComplete="name" required maxLength={100} /></label>
        <label>Số điện thoại<input name="guestPhone" autoComplete="tel" inputMode="tel" pattern="0[0-9 ]{9,12}" placeholder="0912 345 678" required /></label>
        <label>Ghi chú<textarea name="notes" rows={3} maxLength={500} placeholder="Dị ứng, dịp đặc biệt…" /></label>
        <button className="venue-button" disabled={sending || !slot}>{sending ? 'Đang gửi…' : 'Gửi yêu cầu đặt bàn'}</button>
      </form>
    </div>
  </main>
}
