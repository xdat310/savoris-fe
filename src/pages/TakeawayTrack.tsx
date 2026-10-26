import { ArrowLeft, BellRing, Check, Copy, ExternalLink, Landmark, PartyPopper, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, get, post } from '../api/client'
import type { WebTakeawayResponse } from '../api/types'
import { Empty, Loading } from '../components/Feedback'
import { DishThumb } from '../components/DishThumb'
import { useToast } from '../components/Toast'
import { ITEM_STATUS_LABEL, money } from '../lib/format'
import { useData } from '../lib/useData'
import { chime, unlockSound } from '../lib/chime'
import { initialPushState, subscribeToOrder, type PushState } from '../lib/push'
import { Counter } from '../components/Counter'

const STATE_CLASS: Record<string, string> = {
  PENDING: 'state-neutral', COOKING: 'state-info', READY: 'state-ok', SERVED: 'state-ok', CANCELLED: 'state-bad',
}

// The guest's takeaway after ordering: pay (transfer QR or cash at the counter), then watch the kitchen until pickup
export function TakeawayTrack() {
  const { token = '' } = useParams()
  const toast = useToast()
  const order = useData(() => get<WebTakeawayResponse>(`/public/takeaway-orders/${token}`), [token], 5000)
  const [push, setPush] = useState<PushState>(initialPushState)
  const [claiming, setClaiming] = useState(false)

  // Food just became ready while the page is open: ring, buzz and say it in the tab title
  const liveItems = (order.data?.items ?? []).filter((i) => i.status !== 'CANCELLED')
  const ready = order.data?.status === 'OPEN' && liveItems.length > 0 && liveItems.every((i) => i.status === 'READY' || i.status === 'SERVED')
  const wasReady = useRef<boolean | null>(null)
  useEffect(() => unlockSound(), [])
  useEffect(() => {
    if (!order.data) return
    if (wasReady.current === false && ready) {
      chime(3)
      navigator.vibrate?.([300, 120, 300, 120, 500])
    }
    wasReady.current = ready
    document.title = ready ? '🔔 Món đã xong · Savoris' : 'Savoris'
  }, [ready, order.data])

  if (order.loading) return <div className="guest"><Loading label="Đang mở đơn…" /></div>
  const o = order.data
  if (!o) {
    return (
      <div className="guest">
        <header className="guest-board"><Link to="/" className="guest-back"><ArrowLeft size={16} aria-hidden="true" /> Trang chủ</Link></header>
        <div className="guest-body">
          <Empty title="Không tìm thấy đơn">Đường link đơn không đúng hoặc đã hết hạn.</Empty>
          <Link to="/" className="btn btn-block">Về trang chủ</Link>
        </div>
      </div>
    )
  }

  const live = (o.items ?? []).filter((i) => i.status !== 'CANCELLED')
  const allReady = live.length > 0 && live.every((i) => i.status === 'READY' || i.status === 'SERVED')
  const step = o.status === 'AWAITING_PAYMENT' ? 0 : o.status === 'COMPLETED' ? 3 : allReady ? 2 : 1

  async function claimTransfer() {
    setClaiming(true)
    try {
      await post(`/public/takeaway-orders/${token}/transferred`)
      await order.reload()
      toast('Đã báo quầy, thu ngân sẽ kiểm tra tiền về')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Chưa báo được, thử lại', true)
    } finally {
      setClaiming(false)
    }
  }

  async function turnOnPush() {
    setPush('asking')
    try {
      setPush(await subscribeToOrder(token))
    } catch {
      setPush('idle')
      toast('Chưa bật được thông báo trên trình duyệt này', true)
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast('Đã chép')
    } catch {
      // clipboard blocked: the code is on screen to type
    }
  }

  return (
    <div className="guest">
      <header className="guest-board">
        <Link to="/" className="guest-back"><ArrowLeft size={16} aria-hidden="true" /> Trang chủ</Link>
        <div className="guest-table">Đơn mang về</div>
        <div className="guest-code"><Counter value={o.code!.split('-').pop()!} label={`Mã đơn ${o.code}`} size="lg" /></div>
        <div className="guest-where">{o.code} · {o.branchName}{o.branchAddress && o.branchAddress !== 'Chưa cập nhật' ? ` · ${o.branchAddress}` : ''}{o.pickupAt ? ` · Dự kiến nhận món khoảng ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(o.pickupAt))}` : ''}</div>
      </header>

      <main className="guest-body">
        {o.status === 'CANCELLED' ? (
          <div className="panel panel-pad">
            <Empty title="Đơn đã huỷ">{o.cancelReason ? `${o.cancelReason}. ` : ''}Nếu bạn đã chuyển khoản, vui lòng liên hệ quầy để được hoàn tiền.</Empty>
            <Link to="/mang-ve" className="btn btn-primary btn-block">Đặt đơn mới</Link>
          </div>
        ) : (
          <ol className="track-steps" aria-label="Tiến độ đơn">
            {['Thanh toán', 'Bếp đang làm', 'Mời nhận món'].map((label, i) => (
              <li key={label} className={step > i ? 'done' : step === i ? 'now' : ''}>
                <span className="dot">{step > i ? <Check size={14} aria-hidden="true" /> : i + 1}</span>{label}
              </li>
            ))}
          </ol>
        )}

        {o.status === 'AWAITING_PAYMENT' && o.payMethod === 'BANK_TRANSFER' && (
          <section className="panel pay-transfer">
            <h2><Landmark size={18} aria-hidden="true" /> Chuyển khoản để bếp bắt đầu làm</h2>
            {o.transferQrUrl
              ? <img src={o.transferQrUrl} alt="Mã QR chuyển khoản của quán" className="transfer-qr" />
              : <p className="muted">Quán chưa cài mã QR, vui lòng trả tiền mặt tại quầy.</p>}
            <div className="transfer-facts">
              {o.bankAccount && <>
                <div className="fact-text"><span>Ngân hàng</span><strong>{o.bankAccount.bank}</strong></div>
                <div className="fact-account"><span>Số tài khoản</span><strong className="num">{o.bankAccount.accountNumber}</strong>
                  <button className="btn btn-sm btn-ghost" onClick={() => copy(o.bankAccount!.accountNumber!)}><Copy size={14} aria-hidden="true" /> Chép</button></div>
                {o.bankAccount.accountName && <div className="fact-text"><span>Chủ tài khoản</span><strong>{o.bankAccount.accountName}</strong></div>}
              </>}
              <div><span>Số tiền</span><strong className="num">{money(o.totalAmount)}</strong>
                <button className="btn btn-sm btn-ghost" onClick={() => copy(String(o.totalAmount))}><Copy size={14} aria-hidden="true" /> Chép</button></div>
              <div><span>Nội dung</span><strong className="num">{o.code}</strong>
                <button className="btn btn-sm btn-ghost" onClick={() => copy(o.code!)}><Copy size={14} aria-hidden="true" /> Chép</button></div>
            </div>
            {o.transferQrUrl && (
              <a className="btn btn-block" href={o.transferQrUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} aria-hidden="true" /> Mở ảnh mã QR để lưu / quét
              </a>
            )}
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Ghi đúng nội dung <strong>{o.code}</strong>.{' '}
              {o.autoConfirm
                ? 'Tiền về là quán tự nhận được, món xuống bếp ngay và trang này tự cập nhật sau vài giây.'
                : 'Quán thấy tiền về sẽ xác nhận, món xuống bếp ngay và trang này tự cập nhật.'}
            </p>
            {/* With SePay the bank confirms on its own; the button stays as a fallback when the transfer was not matched */}
            {o.transferClaimed
              ? <div className="notice notice-ok" style={{ width: '100%' }}><Check size={18} aria-hidden="true" /> Đã báo quầy bạn chuyển khoản. Thu ngân đang kiểm tra tiền về.</div>
              : <button className={`btn btn-block${o.autoConfirm ? '' : ' btn-primary'}`} disabled={claiming} onClick={claimTransfer}>
                  {claiming && <span className="spinner" aria-hidden="true" />} {o.autoConfirm ? 'Chuyển rồi mà chưa cập nhật? Báo quầy' : 'Tôi đã chuyển khoản'}
                </button>}
          </section>
        )}

        {o.status === 'AWAITING_PAYMENT' && o.payMethod === 'CASH' && (
          <section className="panel panel-pad pay-cash">
            <Wallet size={28} aria-hidden="true" />
            <div>
              <strong>Đến quầy thu ngân {o.branchName}</strong>
              <p>Đọc mã đơn <strong className="num">{o.code}</strong> và trả <strong className="num">{money(o.totalAmount)}</strong>. Thu ngân nhận tiền xong, bếp làm ngay.</p>
            </div>
          </section>
        )}

        {step < 2 && o.status !== 'CANCELLED' && push !== 'unsupported' && (
          <section className="push-ask">
            <BellRing size={20} aria-hidden="true" />
            {push === 'on'
              ? <span>Bạn sẽ nhận thông báo khi món xong, kể cả khi đã đóng trang này.</span>
              : push === 'denied'
                ? <span>Trình duyệt đang chặn thông báo. Cứ để trang này mở, món xong trang sẽ kêu chuông.</span>
                : <>
                    <span>Món xong sẽ báo cho bạn, kể cả khi bạn đã đóng trang.</span>
                    <button className="btn btn-sm btn-primary" disabled={push === 'asking'} onClick={turnOnPush}>
                      {push === 'asking' && <span className="spinner" aria-hidden="true" />} Báo cho tôi khi món xong
                    </button>
                  </>}
          </section>
        )}
        {step < 2 && o.status !== 'CANCELLED' && push === 'unsupported' && (
          <p className="muted push-note">Để trang này mở: món xong trang sẽ kêu chuông{'vibrate' in navigator ? ' và rung' : ''}.</p>
        )}

        {step === 2 && (
          <section className="ready-banner"><PartyPopper size={26} aria-hidden="true" /><div><strong>Món đã xong!</strong> Mời {o.guestName} nhận tại quầy, đọc mã <span className="num">{o.code}</span>.</div></section>
        )}
        {step === 3 && (
          <section className="ready-banner"><Check size={26} aria-hidden="true" /><div><strong>Đã nhận món.</strong> Cảm ơn {o.guestName}, chúc ngon miệng!</div></section>
        )}

        <section className="panel">
          <div className="panel-head"><h2>Món của bạn</h2>{o.paid && <span className="state state-ok"><Check size={14} aria-hidden="true" /> Đã thanh toán</span>}</div>
          <div style={{ padding: '4px 18px' }}>
            {(o.items ?? []).map((i, n) => (
              <div key={n} className={`line${i.status === 'CANCELLED' ? ' cancelled' : ''}`}>
                <span className="lname with-thumb"><DishThumb src={i.imageUrl} name={i.itemName} size="sm" />{i.quantity} × {i.itemName}</span>
                <span className="lamt">{money(i.amount)}</span>
                {o.status !== 'AWAITING_PAYMENT' && (
                  <span className="lsub"><span className={`state ${STATE_CLASS[i.status ?? ''] ?? 'state-neutral'}`}>{i.status === 'READY' ? 'Xong' : ITEM_STATUS_LABEL[i.status ?? '']}</span></span>
                )}
              </div>
            ))}
          </div>
          <div className="money-proof">
            <div className="mrow"><span>Tạm tính</span><span>{money(o.subtotal)}</span></div>
            {!!o.vatAmount && <div className="mrow"><span>VAT</span><span>{money(o.vatAmount)}</span></div>}
            <div className="total"><span>Tổng cộng</span><strong className="num">{money(o.totalAmount)}</strong></div>
          </div>
        </section>
      </main>
    </div>
  )
}
