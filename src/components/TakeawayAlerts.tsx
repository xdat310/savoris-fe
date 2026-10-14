import { BellRing, Clock, HandCoins, Landmark, PackageCheck, Phone, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { OrderResponse } from '../api/types'
import { chime } from '../lib/chime'
import { money } from '../lib/format'

const WAIT_WARN_MINUTES = 10
const PICKUP_WARN_MINUTES = 10

type Kind = 'new' | 'claimed' | 'waiting' | 'uncollected' | 'refund'
interface Alert { key: string; kind: Kind; order: OrderResponse; minutes: number }

const minutesSince = (iso: string | undefined, now: number) => (iso ? Math.floor((now - new Date(iso).getTime()) / 60000) : 0)

// When a takeaway (counter or web) has every dish done, the moment the last one became ready
function readySince(o: OrderResponse): string | undefined {
  const live = (o.items ?? []).filter((i) => i.status !== 'CANCELLED')
  if (live.length === 0 || !live.every((i) => i.status === 'READY' || i.status === 'SERVED')) return undefined
  const ready = live.filter((i) => i.status === 'READY' && i.readyAt).map((i) => i.readyAt!)
  return ready.length ? ready.sort().at(-1) : undefined
}

// The cashier's takeaway reminders: new web orders, guests who say they paid, unpaid orders waiting, food not collected,
// and cancelled transfer orders whose money has to go back (these stay until the cashier marks the refund done)
export function useTakeawayReminders(orders: OrderResponse[] | undefined, refunds: OrderResponse[] | undefined, enabled: boolean) {
  const [now, setNow] = useState(() => Date.now())
  const seen = useRef<Set<number> | null>(null)
  const [fresh, setFresh] = useState<number[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const rung = useRef<Set<string>>(new Set())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20000)
    return () => clearInterval(id)
  }, [])

  // A web order the counter has not seen before: ring twice
  useEffect(() => {
    if (!orders || !enabled) return
    const waiting = orders.filter((o) => o.status === 'AWAITING_PAYMENT').map((o) => o.id!)
    if (seen.current === null) {
      seen.current = new Set(waiting)
      return
    }
    const added = waiting.filter((id) => !seen.current!.has(id))
    added.forEach((id) => seen.current!.add(id))
    if (added.length) {
      setFresh((f) => [...f, ...added])
      chime(2)
    }
  }, [orders, enabled])

  const alerts = useMemo<Alert[]>(() => {
    if (!orders || !enabled) return []
    const list: Alert[] = []
    for (const o of orders) {
      if (o.status === 'AWAITING_PAYMENT') {
        // One card per order, the most urgent: claimed transfer, then waiting too long, then just arrived
        if (o.transferClaimedAt) {
          list.push({ key: `claimed-${o.id}`, kind: 'claimed', order: o, minutes: minutesSince(o.transferClaimedAt, now) })
        } else if (minutesSince(o.createdAt, now) >= WAIT_WARN_MINUTES) {
          list.push({ key: `waiting-${o.id}`, kind: 'waiting', order: o, minutes: minutesSince(o.createdAt, now) })
        } else if (fresh.includes(o.id!)) {
          list.push({ key: `new-${o.id}`, kind: 'new', order: o, minutes: minutesSince(o.createdAt, now) })
        }
      } else if (o.status === 'OPEN' && o.orderType !== 'DINE_IN') {
        const since = readySince(o)
        if (since && minutesSince(since, now) >= PICKUP_WARN_MINUTES) {
          list.push({ key: `pickup-${o.id}-${since}`, kind: 'uncollected', order: o, minutes: minutesSince(since, now) })
        }
      }
    }
    for (const o of refunds ?? []) {
      list.push({ key: `refund-${o.id}`, kind: 'refund', order: o, minutes: minutesSince(o.refundDueAt, now) })
    }
    return list.filter((a) => !dismissed.has(a.key))
  }, [orders, refunds, enabled, fresh, dismissed, now])

  // Each reminder rings once when it first appears (new orders already rang)
  useEffect(() => {
    const unrung = alerts.filter((a) => a.kind !== 'new' && !rung.current.has(a.key))
    unrung.forEach((a) => rung.current.add(a.key))
    if (unrung.length) chime(1)
  }, [alerts])

  // The tab title shows how many things wait for the cashier, visible even from another tab
  useEffect(() => {
    const base = 'Savoris'
    document.title = alerts.length ? `(${alerts.length}) Nhắc nhở · ${base}` : base
    return () => { document.title = base }
  }, [alerts.length])

  function dismiss(a: Alert) {
    if (a.kind === 'new') setFresh((f) => f.filter((id) => id !== a.order.id))
    else setDismissed((d) => new Set(d).add(a.key))
  }

  return { alerts, dismiss }
}

const ICON = { new: BellRing, claimed: Landmark, waiting: Clock, uncollected: PackageCheck, refund: HandCoins }

export function TakeawayAlerts({ alerts, onOpen, onDismiss, onRefunded, settling }: {
  alerts: Alert[]; onOpen: (orderId: number) => void; onDismiss: (a: Alert) => void
  onRefunded: (orderId: number) => void; settling: number | null
}) {
  if (alerts.length === 0) return null
  return (
    <section className="takeaway-alerts" aria-live="polite" aria-label="Nhắc nhở đơn mang về">
      {alerts.map((a) => {
        const Icon = ICON[a.kind]
        const o = a.order
        const pay = o.payMethod === 'BANK_TRANSFER' ? 'chuyển khoản' : 'tiền mặt'
        return (
          <div key={a.key} className={`t-alert t-alert-${a.kind}`}>
            <Icon size={18} aria-hidden="true" />
            <div className="t-alert-text">
              {a.kind === 'new' && <><strong>Đơn mang về mới {o.code}</strong><span>{o.guestName} · {pay} {money(o.totalAmount)}</span></>}
              {a.kind === 'claimed' && <><strong>{o.code}: khách báo đã chuyển {money(o.totalAmount)}</strong><span>Mở app ngân hàng kiểm tra nội dung {o.code}, rồi bấm “Đã nhận chuyển khoản”.</span></>}
              {a.kind === 'waiting' && <><strong>{o.code} chờ thanh toán {a.minutes} phút</strong><span>{o.guestName} · {pay} · đơn tự huỷ sau 30 phút nếu chưa trả</span></>}
              {a.kind === 'uncollected' && <><strong>{o.code} đã xong {a.minutes} phút, khách chưa lấy</strong>
                <span>{o.guestName ?? 'Khách mang về'}{o.guestPhone && <> · <a href={`tel:${o.guestPhone}`}><Phone size={12} aria-hidden="true" /> {o.guestPhone}</a></>}</span></>}
              {a.kind === 'refund' && <><strong>{o.code} đã huỷ nhưng khách đã chuyển {money(o.totalAmount)}: cần hoàn tiền</strong>
                <span>Kiểm tra tiền về trong app ngân hàng rồi chuyển trả cho {o.guestName ?? 'khách'}
                  {o.guestPhone && <> · <a href={`tel:${o.guestPhone}`}><Phone size={12} aria-hidden="true" /> {o.guestPhone}</a></>}</span></>}
            </div>
            {a.kind === 'refund'
              ? <button className="btn btn-sm btn-primary" disabled={settling === o.id} onClick={() => onRefunded(o.id!)}>
                  {settling === o.id && <span className="spinner" aria-hidden="true" />} Đã xử lý
                </button>
              : <>
                  <button className="btn btn-sm btn-primary" onClick={() => onOpen(o.id!)}>Xem đơn</button>
                  <button className="icon-btn" aria-label="Đã biết" title="Đã biết" onClick={() => onDismiss(a)}><X size={15} /></button>
                </>}
          </div>
        )
      })}
    </section>
  )
}
