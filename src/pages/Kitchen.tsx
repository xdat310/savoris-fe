import { AlertTriangle, Check, Flame, UtensilsCrossed } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, get, put, subscribeEvents } from '../api/client'
import type { BranchLoadResponse, KitchenTicketResponse, OrderResponse, TableResponse } from '../api/types'
import { useAuth } from '../auth'
import { useToast } from '../components/Toast'
import { time } from '../lib/format'
import { useData } from '../lib/useData'

interface TicketGroup { orderId: number; orderCode: string; orderType?: KitchenTicketResponse['orderType']; tableId?: number; items: KitchenTicketResponse[]; orderedAt?: string }
interface DishTotal { key: string; name: string; quantity: number; notes: string[] }

export function Kitchen() {
  const { branchId, role, branches } = useAuth()
  const toast = useToast()
  const canOperate = role === 'CHEF' || role === 'ADMIN' || role === 'MANAGER'
  const queue = useData(() => get<KitchenTicketResponse[]>(`/kitchen/branches/${branchId}/queue`), [branchId], 15000)
  const voids = useData(() => get<KitchenTicketResponse[]>(`/kitchen/branches/${branchId}/void-queue`), [branchId], 15000)
  const load = useData(() => get<BranchLoadResponse>(`/kitchen/branches/${branchId}/load`), [branchId], 15000)
  const tables = useData(() => get<TableResponse[]>(`/branches/${branchId}/tables`), [branchId])
  const reloadQueue = queue.reload
  const reloadVoids = voids.reload
  const reloadLoad = load.reload
  const [busyId, setBusyId] = useState<number | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [connected, setConnected] = useState(false)
  const [hasConnected, setHasConnected] = useState(false)
  const busyRef = useRef(new Set<number>())
  const channelRef = useRef<BroadcastChannel | null>(null)
  const refresh = () => { void Promise.all([reloadQueue(), reloadVoids(), reloadLoad()]) }

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  useEffect(() => {
    try { channelRef.current = new BroadcastChannel('savoris-kitchen') } catch { /* unsupported */ }
    return () => channelRef.current?.close()
  }, [])
  useEffect(() => {
    if (!branchId) return
    return subscribeEvents(`/kitchen/branches/${branchId}/events`, () => {
      void Promise.all([reloadQueue(), reloadVoids(), reloadLoad()])
    }, (value) => {
      setConnected(value)
      if (value) setHasConnected(true)
    })
  }, [branchId, reloadQueue, reloadVoids, reloadLoad])

  const tickets = queue.data ?? []
  const activeItems = tickets.filter((item) => item.status === 'PENDING' || item.status === 'COOKING')
  const ticketGroups = useMemo(() => {
    const groups = new Map<number, TicketGroup>()
    for (const item of activeItems) {
      if (!item.orderId) continue
      const group = groups.get(item.orderId) ?? { orderId: item.orderId, orderCode: item.orderCode ?? `Đơn ${item.orderId}`, orderType: item.orderType, tableId: item.tableId, items: [], orderedAt: item.orderedAt }
      group.items.push(item)
      groups.set(item.orderId, group)
    }
    return [...groups.values()]
  }, [activeItems])
  const dishTotals = useMemo(() => {
    const map = new Map<string, DishTotal>()
    for (const item of activeItems.filter((row) => row.status === 'PENDING')) {
      const key = `${item.menuItemId ?? item.itemName}|${(item.note ?? '').trim().toLocaleLowerCase()}`
      const row = map.get(key) ?? { key, name: item.itemName ?? 'Món chưa đặt tên', quantity: 0, notes: [] }
      row.quantity += item.quantity ?? 1
      if (item.note?.trim() && !row.notes.includes(item.note.trim())) row.notes.push(item.note.trim())
      map.set(key, row)
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity)
  }, [activeItems])
  const tableName = (id?: number) => tables.data?.find((table) => table.id === id)?.name ?? `${id ?? '—'}`
  const ticketLocation = (item: Pick<KitchenTicketResponse, 'orderType' | 'tableId' | 'orderCode'>) => item.orderType === 'DINE_IN'
    ? `Bàn ${tableName(item.tableId)}`
    : item.orderType === 'DELIVERY' ? `Giao hàng · ${item.orderCode ?? '—'}` : `Mang về · ${item.orderCode ?? '—'}`
  const incompleteOrderCount = new Set(tickets.filter((item) => item.status === 'PENDING' || item.status === 'COOKING' || item.status === 'VOID_REQUESTED' || item.status === 'READY').map((item) => item.orderId)).size
  const portions = activeItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
  const loadPct = load.data?.loadPercent ?? 0
  const rushSuggested = loadPct >= 70 || (load.data?.estimatedWaitMinutes ?? 0) >= 20 || activeItems.filter((item) => item.status === 'PENDING').some((item) => item.waitingMinutes != null && item.waitingMinutes >= (load.data?.estimatedWaitMinutes ?? Infinity))
  const rush = rushSuggested
  const loadLabel = load.data?.status === 'OVERLOADED' ? 'Quá tải' : load.data?.status === 'BUSY' ? 'Tải cao' : 'Bình thường'

  async function markReady(item: KitchenTicketResponse) {
    if (!item.itemId || busyRef.current.has(item.itemId)) return
    busyRef.current.add(item.itemId); setBusyId(item.itemId)
    try {
      await put(`/kitchen/items/${item.itemId}/ready`)
      channelRef.current?.postMessage({ type: 'DISH_READY', itemName: item.itemName, orderType: item.orderType, tableId: item.tableId, tableName: tableName(item.tableId), orderCode: item.orderCode })
      refresh()
    }
    catch (error) { toast(error instanceof ApiError ? error.message : 'Không cập nhật được món. Hàng đợi đang được đồng bộ lại.', true); refresh() }
    finally { busyRef.current.delete(item.itemId); setBusyId(null) }
  }
  async function resolveVoid(item: KitchenTicketResponse, resolution: 'ACCEPT' | 'REJECT') {
    if (!item.itemId || !item.orderId || busyRef.current.has(item.itemId)) return
    busyRef.current.add(item.itemId); setBusyId(item.itemId)
    try {
      await put<OrderResponse>(`/orders/${item.orderId}/items/${item.itemId}/void-resolve`, { resolution })
      channelRef.current?.postMessage({ type: 'VOID_RESOLVED', resolution, itemName: item.itemName, orderId: item.orderId, tableId: item.tableId, orderCode: item.orderCode })
      refresh()
    }
    catch (error) { toast(error instanceof ApiError ? error.message : 'Yêu cầu chưa được xử lý. Hàng đợi đang được đồng bộ lại.', true); refresh() }
    finally { busyRef.current.delete(item.itemId); setBusyId(null) }
  }

  return <main className={`kds kds-ops${rush ? ' is-rush' : ''}`}>
    <header className="kds-head">
      <div className="kds-head-context"><h1>{branches.find((branch) => branch.id === branchId)?.name ?? 'Bếp'} <span>/ KDS</span></h1><p>{connected ? 'Đang đồng bộ trực tiếp' : hasConnected ? 'Đang kết nối lại · tự đồng bộ định kỳ' : 'Đang kết nối · tự đồng bộ định kỳ'}</p></div>
      <div className="kds-head-status"><span className={`kds-state ${load.data?.status?.toLowerCase() ?? 'normal'}`}><i />{loadLabel} · {loadPct}%</span><time className="kds-clock">{time(now)}</time></div>
      {rush && <div className="kds-rush-auto" role="status" aria-label="Giờ cao điểm tự động: tải từ 70%, chờ từ 20 phút hoặc món chạm thời gian chờ dự kiến">
        <Flame size={18} />Giờ cao điểm · tự động
      </div>}
    </header>
    {queue.error && <div className="kds-error" role="alert">Không tải được hàng đợi. <button onClick={refresh}>Thử tải lại</button></div>}
    <div className="kds-ops-layout">
      <aside className="kds-summary" aria-label="Tổng hợp món cần chế biến">
        <div className="kds-panel-title"><UtensilsCrossed size={18} /><h2>Chuẩn bị</h2></div>
        <div className="kds-summary-metrics"><div><strong>{portions}</strong><span>phần cần làm</span></div><div><strong>{incompleteOrderCount}</strong><span>đơn chưa xong</span></div></div>
        <div className="kds-load-row"><span>Công suất chi nhánh</span><strong>{load.data?.kitchenCapacity ? `${loadPct}% / ${load.data.kitchenCapacity} phần` : 'Đang tải'}</strong></div>
        <div className="kds-capacity-track" role="meter" aria-label={`Công suất bếp ${loadPct}%`} aria-valuenow={loadPct} aria-valuemin={0} aria-valuemax={100}><span className={`is-${load.data?.status?.toLowerCase() ?? 'normal'}`} style={{ width: `${Math.min(100, loadPct)}%` }} /></div>
        <p className="kds-wait-estimate">Ước tính chờ <strong>{load.data?.estimatedWaitMinutes == null ? 'Chưa đủ dữ liệu' : `~${load.data.estimatedWaitMinutes} phút`}</strong></p>
        <h3>Món đang chờ nhiều</h3>
        {dishTotals.length ? <ol className="kds-dish-totals">{dishTotals.map((dish) => <li key={dish.key}><div><strong>{dish.name}</strong>{dish.notes.length > 0 && <small>{dish.notes.join(' · ')}</small>}</div><b>×{dish.quantity}</b></li>)}</ol> : <p className="kds-side-empty">Chưa có món chờ chế biến</p>}
      </aside>
      <section className="kds-board" aria-label="Đơn hàng cần chế biến">
        <div className="kds-board-head"><div><h2>Hàng đợi bếp</h2><span>{ticketGroups.length} đơn · {activeItems.length} dòng món</span></div>{rush && <strong className="kds-rush-indicator"><Flame size={16} />Ưu tiên món sắp quá hạn</strong>}</div>
        {queue.loading && !queue.data ? <p className="kds-board-empty">Đang tải hàng đợi…</p> : ticketGroups.length === 0 ? <p className="kds-board-empty">Không còn món cần chế biến</p> : <div className="kds-ticket-grid">
          {ticketGroups.map((ticket) => <article key={ticket.orderId} className="kds-order-ticket" data-order-id={ticket.orderId}>
            <header><div><strong>{ticketLocation(ticket)}</strong></div><time>{elapsed(ticket.orderedAt, now)}</time></header>
            <ul>{ticket.items.map((item) => {
              const late = item.status === 'PENDING' && load.data?.estimatedWaitMinutes != null && (item.waitingMinutes ?? 0) >= load.data.estimatedWaitMinutes
              const soon = item.status === 'PENDING' && load.data?.estimatedWaitMinutes != null && (item.waitingMinutes ?? 0) >= load.data.estimatedWaitMinutes * .8
              return <li key={item.itemId} className={`${late ? 'is-late' : soon ? 'is-soon' : ''}`}>
                <div className="kds-item-main"><div><strong>{item.itemName}</strong><span>×{item.quantity ?? 1} · {item.status === 'COOKING' ? 'Đang nấu' : 'Chờ nấu'} · chờ {item.waitingMinutes ?? 0} phút</span></div>{item.status === 'COOKING' && <span className="kds-cooking-mark">ĐANG NẤU</span>}</div>
                {item.note && <p className="kds-item-note"><b>Ghi chú:</b> {item.note}</p>}
                {canOperate && <button type="button" className="kds-ready-button" disabled={busyId === item.itemId} onClick={() => void markReady(item)}><Check size={20} />{busyId === item.itemId ? 'Đang cập nhật…' : 'Hoàn thành món'}</button>}
              </li>
            })}</ul>
          </article>)}
        </div>}
      </section>
      <aside className={`kds-cancellations${(voids.data?.length ?? 0) ? ' has-pending' : ' is-empty'}`} aria-label={`Yêu cầu hủy món: ${voids.data?.length ?? 0} đang chờ`}>
        <div className="kds-panel-title"><AlertTriangle size={19} /><h2>{voids.data?.length ? 'Chờ xác nhận hủy' : 'Chờ hủy'}</h2><b>{voids.data?.length ?? 0}</b></div>
        {voids.data?.length ? <div className="kds-void-list">{voids.data.map((item) => <article className="kds-void-ticket" key={item.itemId}>
          <div className="kds-void-meta"><strong>{ticketLocation(item)}</strong></div>
          <h3>{item.itemName} <b>×{item.quantity ?? 1}</b></h3>
          {item.note && <p><b>Ghi chú món:</b> {item.note}</p>}
          <p className="kds-void-reason"><b>Lý do:</b> {item.voidReason || 'Không ghi lý do'}</p>
          <time>Gửi lúc {item.voidRequestedAt ? time(new Date(item.voidRequestedAt)) : '—'} · {item.status === 'VOID_REQUESTED' ? 'Đang chờ bếp' : ''}</time>
          {canOperate && <div className="kds-void-actions"><button type="button" className="accept" disabled={busyId === item.itemId} onClick={() => void resolveVoid(item, 'ACCEPT')}>CHẤP NHẬN HỦY</button><button type="button" className="reject" disabled={busyId === item.itemId} onClick={() => void resolveVoid(item, 'REJECT')}>TỪ CHỐI HỦY</button></div>}
        </article>)}</div> : null}
      </aside>
    </div>
  </main>
}

function elapsed(orderedAt?: string, now = new Date()) {
  if (!orderedAt) return '—'
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(orderedAt).getTime()) / 60000))
  return minutes < 60 ? `${minutes} phút` : `${Math.floor(minutes / 60)}g ${String(minutes % 60).padStart(2, '0')}p`
}
