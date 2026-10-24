import { CalendarDays, ChevronRight, Clock, Users, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SlotAvailability } from '../../api/reservation'
import { createGuestReservation, getSlots } from '../../api/reservation'
import { branchLabel, type PublicBranch } from '../../api/site'

interface Props {
  open: boolean
  onClose: () => void
  branches: PublicBranch[]
}

type Step = 'pick' | 'slots' | 'info' | 'done'

const TODAY = new Date().toISOString().split('T')[0]
const MAX_ADVANCE_DAYS = 30

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function pct(b: number, max: number) { return Math.round((b / max) * 100) }

export function SiteBookingModal({ open, onClose, branches }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<Step>('pick')

  // Step 1 — pick branch + date
  const [branchId, setBranchId] = useState<number | null>(branches[0]?.id ?? null)
  const [date, setDate] = useState('')

  // Step 2 — slots
  const [slots, setSlots] = useState<SlotAvailability[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  // Step 3 — personal info
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [guests, setGuests] = useState(2)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 4 — done
  const [confirmCode, setConfirmCode] = useState<number | null>(null)

  useEffect(() => {
    if (branches.length > 0) setBranchId(branches[0].id)
  }, [branches])

  useEffect(() => {
    if (!open) { setStep('pick'); setSelectedSlot(null); setError(null) }
    else { document.body.style.overflow = 'hidden'; ref.current?.focus() }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  async function loadSlots() {
    if (!branchId || !date) return
    setSlotsLoading(true)
    setSlots([])
    setSelectedSlot(null)
    try {
      const data = await getSlots(branchId, date)
      setSlots(data)
      setStep('slots')
    } catch {
      setError('Không tải được lịch. Vui lòng thử lại.')
    } finally {
      setSlotsLoading(false)
    }
  }

  async function confirm() {
    if (!branchId || !selectedSlot || !name.trim() || !phone.trim()) return
    setBusy(true); setError(null)
    try {
      const result = await createGuestReservation({
        branchId,
        guestName: name.trim(),
        guestPhone: phone.trim(),
        reservationDate: selectedSlot,
        numberOfGuests: guests,
        notes: notes.trim() || undefined,
      })
      setConfirmCode(result.id)
      setStep('done')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không đặt được bàn. Vui lòng thử lại.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const selectedBranch = branches.find((b) => b.id === branchId)

  return (
    <div className="bk-overlay" role="dialog" aria-modal="true"
      aria-label="Đặt bàn" tabIndex={-1} ref={ref}>
      <div className="bk-bg" onClick={onClose} />

      <div className="bk-sheet">
        <button className="bk-close" onClick={onClose} aria-label="Đóng"><X size={20} /></button>

        {/* ── Header ── */}
        <div className="bk-head">
          <p className="bk-eyebrow">ĐẶT BÀN</p>
          <h2 className="bk-title">
            {step === 'pick'  && 'Chọn chi nhánh & ngày'}
            {step === 'slots' && 'Chọn khung giờ'}
            {step === 'info'  && 'Thông tin đặt bàn'}
            {step === 'done'  && 'Đặt bàn thành công'}
          </h2>
          {step !== 'pick' && step !== 'done' && (
            <div className="bk-breadcrumb">
              <span>{branchLabel(selectedBranch)}</span>
              <ChevronRight size={12} />
              <span>{new Date(date).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}</span>
              {selectedSlot && <><ChevronRight size={12} /><span>{fmt(selectedSlot)}</span></>}
            </div>
          )}
        </div>

        {error && <div className="bk-error">{error}</div>}

        {/* ── STEP 1: Pick branch + date ── */}
        {step === 'pick' && (
          <div className="bk-body">
            <label className="bk-field">
              <span><CalendarDays size={14} /> Chi nhánh</span>
              <select className="bk-input" value={branchId ?? ''} onChange={(e) => setBranchId(Number(e.target.value))}>
                {branches.map((b) => <option key={b.id} value={b.id}>{branchLabel(b)} — {b.address}</option>)}
              </select>
            </label>

            <label className="bk-field">
              <span><CalendarDays size={14} /> Ngày</span>
              <input className="bk-input" type="date"
                min={TODAY}
                max={new Date(Date.now() + MAX_ADVANCE_DAYS * 86400000).toISOString().split('T')[0]}
                value={date} onChange={(e) => setDate(e.target.value)} />
            </label>

            <button className="bk-btn bk-btn-primary" disabled={!branchId || !date || slotsLoading}
              onClick={loadSlots}>
              {slotsLoading ? 'Đang tải…' : 'Xem khung giờ trống →'}
            </button>
          </div>
        )}

        {/* ── STEP 2: Slot grid ── */}
        {step === 'slots' && (
          <div className="bk-body">
            <div className="bk-slot-grid">
              {slots.map((s) => {
                const full = !s.available
                const selected = selectedSlot === s.slotTime
                const fill = pct(s.bookedGuests, s.maxCapacity)
                return (
                  <button key={s.slotTime}
                    className={`bk-slot${full ? ' bk-slot--full' : ''}${selected ? ' bk-slot--on' : ''}`}
                    disabled={full}
                    onClick={() => { setSelectedSlot(s.slotTime); setStep('info') }}
                  >
                    <span className="bk-slot-time">{fmt(s.slotTime)}</span>
                    <div className="bk-slot-bar">
                      <div className="bk-slot-fill" style={{ width: `${fill}%` }} />
                    </div>
                    <span className="bk-slot-cap">
                      {full
                        ? s.suggestedAlternative ? `→ ${fmt(s.suggestedAlternative)}` : 'Đầy'
                        : `${s.maxCapacity - s.bookedGuests} chỗ còn`}
                    </span>
                  </button>
                )
              })}
            </div>
            <button className="bk-btn bk-btn-ghost" onClick={() => setStep('pick')}>← Quay lại</button>
          </div>
        )}

        {/* ── STEP 3: Personal info ── */}
        {step === 'info' && (
          <div className="bk-body">
            <label className="bk-field">
              <span>Họ tên</span>
              <input className="bk-input" placeholder="Nguyễn Văn A" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="bk-field">
              <span>Số điện thoại</span>
              <input className="bk-input" inputMode="tel" placeholder="0912 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="bk-field">
              <span><Users size={14} /> Số khách</span>
              <div className="bk-stepper">
                <button className="bk-step-btn" onClick={() => setGuests((g) => Math.max(1, g - 1))}>−</button>
                <span className="bk-step-val">{guests}</span>
                <button className="bk-step-btn" onClick={() => setGuests((g) => Math.min(20, g + 1))}>+</button>
              </div>
            </label>
            <label className="bk-field">
              <span><Clock size={14} /> Ghi chú (tùy chọn)</span>
              <textarea className="bk-input bk-textarea" rows={2} placeholder="Tiệc sinh nhật, ghế cao cho trẻ em…"
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <div className="bk-summary">
              <span>🍽️ {branchLabel(selectedBranch)}</span>
              <span>📅 {new Date(date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <span>🕐 {selectedSlot ? fmt(selectedSlot) : ''} · {guests} khách</span>
            </div>

            <button className="bk-btn bk-btn-primary"
              disabled={busy || !name.trim() || !phone.trim()}
              onClick={confirm}>
              {busy ? 'Đang đặt…' : 'Xác nhận đặt bàn'}
            </button>
            <button className="bk-btn bk-btn-ghost" onClick={() => setStep('slots')}>← Đổi giờ</button>
          </div>
        )}

        {/* ── STEP 4: Confirmation ── */}
        {step === 'done' && (
          <div className="bk-body bk-done">
            <div className="bk-done-icon">✓</div>
            <p className="bk-done-msg">
              Bàn đã được đặt thành công!<br />
              Mã đặt bàn của bạn: <strong className="bk-done-code">#{confirmCode}</strong>
            </p>
            <p className="bk-done-sub">
              Chúng tôi sẽ xác nhận qua số điện thoại <strong>{phone}</strong>.
              Vui lòng đến trước giờ đặt 10 phút.
            </p>
            <button className="bk-btn bk-btn-primary" onClick={onClose}>Đóng</button>
          </div>
        )}
      </div>
    </div>
  )
}
