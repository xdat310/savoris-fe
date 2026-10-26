import { ArrowLeft, Landmark, MapPin, Minus, Plus, Send, ShoppingBag, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, get, post } from '../api/client'
import { branchLabel, formatBranchAddress } from '../api/site'
import type { BranchMenuItemResponse, GuestTableResponse, PublicBranchResponse, TakeawayEstimateResponse, WebTakeawayResponse } from '../api/types'
import { CategoryNav, DishBoard, groupDishes } from '../components/DishBoard'
import { DishThumb } from '../components/DishThumb'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { money } from '../lib/format'
import { rememberTakeaway } from '../lib/seat'
import { useData } from '../lib/useData'
import { NearMe } from '../components/NearMe'
import { byDistance, formatKm, useMyLocation } from '../lib/geo'
import beefWine from '../assets/photos/beef-steak-wine.webp'

interface Line { dish: BranchMenuItemResponse; quantity: number }

const BRANCH_KEY = 'savoris.takeawayBranch'
const LEGACY_BRANCH_KEY = 'dinechain.takeawayBranch'

function savedBranch(): number | null {
  try {
    const value = sessionStorage.getItem(BRANCH_KEY) ?? sessionStorage.getItem(LEGACY_BRANCH_KEY)
    if (value && !sessionStorage.getItem(BRANCH_KEY)) sessionStorage.setItem(BRANCH_KEY, value)
    if (value) sessionStorage.removeItem(LEGACY_BRANCH_KEY)
    return Number(value) || null
  } catch {
    return null
  }
}

const branchSlugOf = (code?: string) => (code ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Web takeaway orders require advance bank transfer; the kitchen receives them only after payment.
export function Takeaway() {
  const { branchSlug } = useParams()
  const navigate = useNavigate()
  const branches = useData(() => get<PublicBranchResponse[]>('/public/branches'), [], 30000)
  const [branchId, setBranchId] = useState<number | null>(savedBranch)
  const legacySlug = branchSlug?.toLowerCase() === 'tay-ho' ? 'hang-giay' : branchSlug?.toLowerCase() === 'long-bien' ? 'hang-ma' : branchSlug?.toLowerCase()
  const branchFromUrl = branchSlug ? branches.data?.find((b) => b.slug?.toLowerCase() === legacySlug || branchSlugOf(b.code) === branchSlug.toLowerCase()) : undefined
  const branch = branchFromUrl ?? branches.data?.find((b) => b.id === branchId)
  useEffect(() => {
    if (branchSlug && branchFromUrl?.id) {
      setBranchId(branchFromUrl.id)
      if (branchFromUrl.slug && branchFromUrl.slug !== branchSlug) {
        navigate(`/mang-ve/${branchFromUrl.slug}`, { replace: true })
      }
      try { sessionStorage.setItem(BRANCH_KEY, String(branchFromUrl.id)) } catch { /* session-only preference */ }
    } else if (!branchSlug && branch) {
      navigate(`/mang-ve/${branch.slug || branchSlugOf(branch.code)}`, { replace: true })
    } else if (branchSlug && !branches.loading && branches.data && !branchFromUrl) {
      navigate('/mang-ve', { replace: true })
    }
  }, [branchSlug, branchFromUrl?.id, branch?.id, branches.loading, branches.data, navigate])
  const here = useMyLocation()
  const origin = here.state.status === 'ok' ? { lat: here.state.lat, lng: here.state.lng } : null
  const sorted = byDistance(branches.data ?? [], origin)
  const nearestId = origin ? sorted.find((x) => x.km != null && x.item.acceptingTakeaway)?.item.id : undefined

  function pick(id: number | null) {
    setBranchId(id)
    try {
      if (id) sessionStorage.setItem(BRANCH_KEY, String(id))
      else sessionStorage.removeItem(BRANCH_KEY)
    } catch {
      // only remembered for this visit
    }
    const selected = branches.data?.find((b) => b.id === id)
    navigate(selected ? `/mang-ve/${selected.slug || branchSlugOf(selected.code)}` : '/mang-ve')
  }

  if (branchId && branch) return <TakeawayMenu branch={branch} onChangeBranch={() => pick(null)} />

  return (
    <div className="guest">
      <header className="guest-board guest-board-photo">
        <img className="guest-board-img" src={beefWine} alt="" />
        <Link to="/" className="guest-back"><ArrowLeft size={16} aria-hidden="true" /> Trang chủ</Link>
        <h1 className="page-title">Mang về</h1>
        <p className="guest-where">Chọn chi nhánh bạn sẽ đến lấy món. Trả tiền trước, bếp làm ngay sau khi quán nhận được tiền.</p>
      </header>
      <main className="guest-body">
        {branches.error && <ErrorNotice message={branches.error} onRetry={branches.reload} />}
        <NearMe status={here.state.status} message={here.state.status === 'error' ? here.state.message : undefined} onAsk={here.ask} />
        {branches.loading ? <Loading label="Đang tải chi nhánh…" /> : (branches.data?.length ?? 0) === 0 ? <Empty title="Chưa có chi nhánh nhận đơn" /> : (
          <div className="branch-picks">
            {sorted.map(({ item: b, km }) => (
              <button key={b.id} className="branch-pick" disabled={!b.acceptingTakeaway} onClick={() => pick(b.id!)}>
                <span className="bp-code">{b.code}</span>
                <span className="bp-main">
                  <strong>{branchLabel(b)}{b.id === nearestId && <span className="nearest-tag">Gần bạn nhất</span>}</strong>
                  {b.address && b.address !== 'Chưa cập nhật' && <span className="bp-addr"><MapPin size={13} aria-hidden="true" /> {formatBranchAddress(b.address, b.city)}</span>}
                  {km != null && <span className="bp-km">Cách bạn {formatKm(km)}</span>}
                </span>
                <span className="bp-side">
                  <span className="bp-status">
                    {b.acceptingTakeaway
                      ? (b.estimatedWaitMinutes ? `Nhận đơn · chờ ~${b.estimatedWaitMinutes} phút` : 'Đang nhận đơn')
                      : b.openNow === false ? 'Đã đóng cửa' : 'Bếp đang kín, tạm ngưng'}
                  </span>
                  {b.acceptingTakeaway && <span className="btn-oval btn-oval-sm" aria-hidden="true">Chọn</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function TakeawayMenu({ branch, onChangeBranch }: { branch: PublicBranchResponse; onChangeBranch: () => void }) {
  const navigate = useNavigate()
  const menu = useData(() => get<GuestTableResponse>(`/public/branches/${branch.id}/menu`), [branch.id])
  const [cart, setCart] = useState<Record<number, Line>>({})
  const [checkout, setCheckout] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickupEstimate, setPickupEstimate] = useState<TakeawayEstimateResponse | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)

  const groups = useMemo(() => groupDishes(menu.data?.categories, menu.data?.menu), [menu.data])
  const lines = Object.values(cart)
  const estimateItems = useMemo(() => Object.values(cart).map((line) => ({ menuItemId: line.dish.menuItemId!, quantity: line.quantity })), [cart])
  const count = lines.reduce((n, l) => n + l.quantity, 0)
  const subtotal = lines.reduce((n, l) => n + l.quantity * (l.dish.price ?? 0), 0)
  const vat = Math.round(subtotal * (menu.data?.vatPercent ?? 0) / 100)

  useEffect(() => {
    if (estimateItems.length === 0) {
      setPickupEstimate(null)
      setEstimateError(null)
      setEstimateLoading(false)
      return
    }
    let active = true
    const refreshEstimate = async () => {
      setEstimateLoading(true)
      setEstimateError(null)
      try {
        const result = await post<TakeawayEstimateResponse>('/public/takeaway-orders/estimate', {
          branchId: branch.id,
          items: estimateItems,
        })
        if (active) setPickupEstimate(result)
      } catch (err) {
        if (active) {
          setPickupEstimate(null)
          setEstimateError(err instanceof ApiError ? err.message : 'Chưa tính được thời gian nhận món.')
        }
      } finally {
        if (active) setEstimateLoading(false)
      }
    }
    void refreshEstimate()
    const timer = window.setInterval(refreshEstimate, 30_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [branch.id, estimateItems])

  function change(dish: BranchMenuItemResponse, delta: number) {
    setCart((c) => {
      const id = dish.menuItemId!
      const quantity = (c[id]?.quantity ?? 0) + delta
      const next = { ...c }
      if (quantity <= 0) delete next[id]
      else next[id] = { dish, quantity }
      return next
    })
  }

  async function place(e: FormEvent) {
    e.preventDefault()
    if (!pickupEstimate?.canAccept || !pickupEstimate.pickupAt) {
      setError(pickupEstimate?.message || estimateError || 'Đang kiểm tra thời gian nhận món, vui lòng chờ một chút.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const order = await post<WebTakeawayResponse>('/public/takeaway-orders', {
        branchId: branch.id, guestName: name.trim(), guestPhone: phone.replace(/\s/g, ''), payMethod: 'BANK_TRANSFER',
        pickupAt: pickupEstimate.pickupAt,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({ menuItemId: l.dish.menuItemId, quantity: l.quantity })),
      })
      rememberTakeaway({ token: order.token!, code: order.code!, branchName: branchLabel(branch) })
      navigate(`/don-mang-ve/${order.token}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đặt được, thử lại')
      menu.reload()
      setSending(false)
    }
  }

  return (
    <div className={`guest${count ? ' has-cart' : ''}`}>
      <header className="guest-board">
        <Link to="/" className="guest-back"><ArrowLeft size={16} aria-hidden="true" /> Trang chủ</Link>
        <div className="guest-table">{branchLabel(branch)}</div>
        <div className="guest-where">
          {branch.address && branch.address !== 'Chưa cập nhật' ? `${formatBranchAddress(branch.address, branch.city)} · ` : ''}
          <button className="link-chalk" onClick={onChangeBranch}>Đổi chi nhánh</button>
        </div>
      </header>

      <CategoryNav groups={groups} />

      <main className="guest-body">
        {error && !checkout && <ErrorNotice message={error} />}
        {menu.error && <ErrorNotice message={menu.error} onRetry={menu.reload} />}
        {menu.loading ? <Loading label="Đang mở menu…" /> : groups.length === 0
          ? <Empty title="Chi nhánh chưa có món" />
          : <DishBoard groups={groups} quantity={(id) => cart[id]?.quantity ?? 0} onChange={change} />}
      </main>

      {count > 0 && !checkout && (
        <div className="guest-bar">
            <button className="btn btn-accent btn-lg btn-block" onClick={() => setCheckout(true)}>
            <ShoppingBag size={20} aria-hidden="true" />
            <span>{count} món · {money(subtotal)}</span>
            <span style={{ marginLeft: 'auto' }}>Đặt &amp; thanh toán</span>
          </button>
        </div>
      )}

      {checkout && (
        <div className="guest-sheet-backdrop" onClick={() => !sending && setCheckout(false)}>
          <form className="guest-sheet guest-checkout-sheet" role="dialog" aria-modal="true" aria-label="Đặt món mang về" onClick={(e) => e.stopPropagation()} onSubmit={place}>
            <div className="panel-head">
              <h2>Mang về · {branchLabel(branch)}</h2>
              <button type="button" className="icon-btn" aria-label="Đóng" onClick={() => setCheckout(false)}><X size={18} /></button>
            </div>
            <div className="guest-sheet-lines">
              {lines.map((l) => (
                <div key={l.dish.menuItemId} className="line">
                  <span className="lname with-thumb"><DishThumb src={l.dish.imageUrl} name={l.dish.name} size="sm" />{l.dish.name}</span>
                  <span className="lamt">{money(l.quantity * (l.dish.price ?? 0))}</span>
                  <span className="lsub">
                    <span className="qty-btns">
                      <button type="button" className="icon-btn" aria-label={`Bớt ${l.dish.name}`} onClick={() => change(l.dish, -1)}><Minus size={16} /></button>
                      <span className="num" style={{ minWidth: 22, textAlign: 'center', fontWeight: 700, color: 'var(--ink)' }}>{l.quantity}</span>
                      <button type="button" className="icon-btn" aria-label={`Thêm ${l.dish.name}`} onClick={() => change(l.dish, 1)}><Plus size={16} /></button>
                    </span>
                  </span>
                </div>
              ))}
              <div className="checkout-fields">
                <label className="field">Tên của bạn<input className="input" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
                <label className="field">Số điện thoại<input className="input num" required inputMode="tel" autoComplete="tel" pattern="0[0-9 ]{9,12}" placeholder="0912 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
                <div className="field" aria-live="polite"><span>Thời gian nhận món dự kiến</span>{estimateLoading && <small className="muted">Trợ lý bếp đang tính theo món trong giỏ và hàng đợi hiện tại…</small>}{pickupEstimate?.pickupAt && <strong>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(pickupEstimate.pickupAt))} · khoảng {pickupEstimate.estimatedMinutes} phút</strong>}{pickupEstimate?.message && <small className={pickupEstimate.canAccept ? 'muted' : 'feedback-error'}>{pickupEstimate.message}</small>}{estimateError && <small className="feedback-error">{estimateError}</small>}</div>
                <label className="field">Ghi chú cho bếp<input className="input" maxLength={500} placeholder="Ít cay, không hành…" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
                <fieldset className="pay-methods">
                  <legend>Thanh toán trước</legend>
                  <label className={`pay-method on${branch.transferAvailable ? '' : ' off'}`}>
                    <input type="radio" name="pay" value="BANK_TRANSFER" disabled checked />
                    <Landmark size={20} aria-hidden="true" />
                    <span><strong>Chuyển khoản trước</strong><span>{branch.transferAvailable ? 'Quét mã QR của quán; đơn chỉ vào bếp sau khi nhận đủ tiền' : 'Chi nhánh chưa cấu hình tài khoản hoặc mã QR nhận tiền'}</span></span>
                  </label>
                </fieldset>
              </div>
            </div>
            <div className="order-actions">
              {error && <ErrorNotice message={error} />}
              <div className="money-proof" style={{ padding: 0, background: 'none', border: 'none' }}>
                <div className="mrow"><span>Tạm tính</span><span>{money(subtotal)}</span></div>
                {vat > 0 && <div className="mrow"><span>VAT {menu.data?.vatPercent}%</span><span>{money(vat)}</span></div>}
                <div className="total"><span>Cần trả</span><strong className="num">{money(subtotal + vat)}</strong></div>
              </div>
              <button className="btn btn-primary btn-lg btn-block" disabled={sending || count === 0 || estimateLoading || !pickupEstimate?.canAccept || !branch.transferAvailable}>
                {sending ? <span className="spinner" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
                Đặt món &amp; chuyển khoản trước
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
