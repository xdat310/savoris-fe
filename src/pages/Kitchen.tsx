import {
  AlertTriangle, Banknote, Check, CheckCircle2, Clock3, Flame, Gauge, Layers, RotateCcw,
  ShoppingBag, TriangleAlert, UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, get, put } from '../api/client'
import type { BranchLoadResponse, BranchMenuItemResponse, KitchenTicketResponse, OrderResponse, TableResponse } from '../api/types'
import { useAuth } from '../auth'
import { Strikable } from '../components/ChalkStrike'
import { DishThumb } from '../components/DishThumb'
import { KitchenInsight } from '../components/KitchenInsight'
import { useToast } from '../components/Toast'
import { ORDER_TYPE_LABEL, time } from '../lib/format'
import { useData } from '../lib/useData'
import { Counter } from '../components/Counter'
import { Icon } from '../components/ui/Icon'

type Filter = 'ALL' | 'DINE_IN' | 'TAKEAWAY'
type Stage = 'pending' | 'cooking' | 'ready'

const FILTERS: { key: Filter; label: string; Icon: typeof UtensilsCrossed }[] = [
  { key: 'ALL', label: 'Tất cả', Icon: Gauge },
  { key: 'DINE_IN', label: 'Tại bàn', Icon: UtensilsCrossed },
  { key: 'TAKEAWAY', label: 'Mang về', Icon: ShoppingBag },
]

const STAGES: { key: Stage; label: string; Icon: typeof Flame }[] = [
  { key: 'pending', label: 'Chờ nấu', Icon: Flame },
  { key: 'cooking', label: 'Đang nấu', Icon: Gauge },
  { key: 'ready', label: 'Hoàn thành', Icon: CheckCircle2 },
]

const KITCHEN_CHANNEL = 'savoris-kitchen'

interface BatchGroup {
  key: string
  itemName: string
  menuItemId?: number
  totalQty: number
  tickets: KitchenTicketResponse[]
}

export function Kitchen() {
  const { branchId, role, branches } = useAuth()
  const toast = useToast()
  const canOperate = role === 'CHEF' || role === 'ADMIN' || role === 'MANAGER'
  const queue = useData(() => get<KitchenTicketResponse[]>(`/kitchen/branches/${branchId}/queue`), [branchId], 4000)
  const voids = useData(() => get<KitchenTicketResponse[]>(`/kitchen/branches/${branchId}/void-queue`), [branchId], 4000)
  const load = useData(() => get<BranchLoadResponse>(`/kitchen/branches/${branchId}/load`), [branchId], 8000)
  const menu = useData(() => get<BranchMenuItemResponse[]>(`/branches/${branchId}/menu`), [branchId], 30000)
  const tables = useData(() => get<TableResponse[]>(`/branches/${branchId}/tables`), [branchId])
  const [busyId, setBusyId] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [batchMode, setBatchMode] = useState(false)
  const [mobileStage, setMobileStage] = useState<Stage>('pending')
  const [now, setNow] = useState(() => new Date())
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try { channelRef.current = new BroadcastChannel(KITCHEN_CHANNEL) }
    catch { /* unsupported */ }
    return () => channelRef.current?.close()
  }, [])

  const allTickets = queue.data ?? []
  const visibleTickets = useMemo(() => {
    if (filter === 'ALL') return allTickets
    return allTickets.filter((ticket) => ticket.orderType === filter || (filter === 'TAKEAWAY' && ticket.orderType === 'DELIVERY'))
  }, [allTickets, filter])
  const pending = visibleTickets.filter((ticket) => ticket.status === 'PENDING')
  const cooking = visibleTickets.filter((ticket) => ticket.status === 'COOKING')
  const ready = visibleTickets.filter((ticket) => ticket.status === 'READY')
  const portionCount = (tickets: KitchenTicketResponse[]) => tickets.reduce((total, ticket) => total + (ticket.quantity ?? 1), 0)
  const pendingCount = filter === 'ALL' ? load.data?.pendingPortions ?? portionCount(pending) : portionCount(pending)
  const cookingCount = filter === 'ALL' ? load.data?.cookingPortions ?? portionCount(cooking) : portionCount(cooking)
  const readyCount = portionCount(ready)
  const branch = branches.find((item) => item.id === branchId)
  const loadPct = load.data?.loadPercent ?? 0
  const loadStatus = load.data?.status ?? 'NORMAL'
  const loadLabel = loadStatus === 'OVERLOADED' ? 'Quá tải' : loadStatus === 'BUSY' ? 'Tải cao' : 'Bình thường'

  const imageOf = (id?: number) => menu.data?.find((item) => item.menuItemId === id)?.imageUrl
  const tableName = (id?: number) => tables.data?.find((table) => table.id === id)?.name ?? `#${id ?? '—'}`

  const filterCount = (key: Filter) => portionCount(key === 'ALL' ? allTickets : allTickets.filter((ticket) =>
    ticket.orderType === key || (key === 'TAKEAWAY' && ticket.orderType === 'DELIVERY')))

  const batchedPending = useMemo<BatchGroup[]>(() => {
    if (!batchMode) return []
    const groups = new Map<string, BatchGroup>()
    for (const ticket of pending) {
      if (ticket.awaitingPayment) continue
      const key = String(ticket.menuItemId ?? ticket.itemName ?? ticket.itemId)
      const group = groups.get(key) ?? {
        key,
        itemName: ticket.itemName ?? 'Món chưa có tên',
        menuItemId: ticket.menuItemId,
        totalQty: 0,
        tickets: [],
      }
      group.totalQty += ticket.quantity ?? 1
      group.tickets.push(ticket)
      groups.set(key, group)
    }
    return [...groups.values()].sort((a, b) => b.totalQty - a.totalQty)
  }, [batchMode, pending])

  async function move(ticket: KitchenTicketResponse, step: 'start' | 'ready') {
    if (!ticket.itemId || ticket.awaitingPayment) return
    setBusyId(ticket.itemId)
    try {
      await put(`/kitchen/items/${ticket.itemId}/${step}`)
      if (step === 'ready') {
        channelRef.current?.postMessage({
          type: 'DISH_READY', itemName: ticket.itemName, orderType: ticket.orderType,
          tableId: ticket.tableId, tableName: tableName(ticket.tableId), orderCode: ticket.orderCode,
        })
      }
      await Promise.all([queue.reload(), load.reload()])
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Không cập nhật được trạng thái món', true)
      void queue.reload()
    } finally {
      setBusyId(null)
    }
  }

  async function resolveVoid(ticket: KitchenTicketResponse, resolution: 'ACCEPT' | 'REMAKE' | 'CHARGE') {
    if (!ticket.itemId || !ticket.orderId) return
    setBusyId(ticket.itemId)
    try {
      await put<OrderResponse>(`/orders/${ticket.orderId}/items/${ticket.itemId}/void-resolve`, { resolution })
      channelRef.current?.postMessage({
        type: 'VOID_RESOLVED', resolution, itemName: ticket.itemName,
        orderId: ticket.orderId, tableId: ticket.tableId, orderCode: ticket.orderCode,
      })
      await Promise.all([queue.reload(), voids.reload(), load.reload()])
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Không xử lý được yêu cầu hủy', true)
      void voids.reload()
    } finally {
      setBusyId(null)
    }
  }

  async function toggleSoldOut(item: BranchMenuItemResponse) {
    if (!item.menuItemId) return
    try {
      await put(`/branches/${branchId}/menu/${item.menuItemId}/availability`, { available: !item.available })
      menu.setData((list) => list?.map((row) => row.menuItemId === item.menuItemId ? { ...row, available: !item.available } : row))
      toast(item.available ? `Đã báo hết ${item.name}` : `${item.name} bán lại`)
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Không cập nhật được tình trạng món', true)
    }
  }

  return (
    <div className="kds">
      <header className="kds-head">
        <div className="kds-head-context">
          <span className="kds-eyebrow">KHU VỰC BẾP</span>
          <h2>{branch?.name ?? 'Chi nhánh'}</h2>
        </div>
        <div className="seg kds-filter" role="group" aria-label="Lọc theo loại đơn">
          {FILTERS.map(({ key, label, Icon: Glyph }) => (
            <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>
              <Icon icon={Glyph} />{label}<span className="kds-filter-count">{filterCount(key)}</span>
            </button>
          ))}
        </div>
        <div className="kds-head-actions">
          {canOperate && <button className={`kds-batch-toggle${batchMode ? ' is-on' : ''}`} aria-pressed={batchMode}
            onClick={() => setBatchMode((value) => !value)}>
            <Icon icon={Layers} size={18} />{batchMode ? 'Đang gộp món' : 'Gộp món giống nhau'}
          </button>}
          <time className="kds-clock" aria-label="Giờ hiện tại">{time(now)}</time>
        </div>
      </header>

      <section className="kds-overview" aria-label="Tình trạng bếp">
        <div className="kds-overview-main">
          <div className="kds-overview-line">
            <span><strong>{pendingCount}</strong> phần đang chờ</span>
            <i aria-hidden="true" />
            <span><strong>{cookingCount}</strong> phần đang nấu</span>
          </div>
          <div className="kds-capacity">
            <div className="kds-capacity-copy">
              <span>Công suất bếp</span>
              <strong className={`is-${loadStatus.toLowerCase()}`}>{load.data ? `${loadPct}%` : '—'} <span>· {loadLabel}</span></strong>
            </div>
            <div className="kds-capacity-track" role="meter" aria-valuenow={loadPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Công suất bếp ${loadPct}%`}>
              <span className={`is-${loadStatus.toLowerCase()}`} style={{ width: `${Math.min(100, loadPct)}%` }} />
            </div>
            <span className="kds-capacity-note">Thời gian chờ dự kiến <strong>{load.data?.estimatedWaitMinutes == null ? 'Chưa đủ dữ liệu' : `~${load.data.estimatedWaitMinutes} phút`}</strong></span>
          </div>
          {load.data?.acceptingTakeaway === false && <p className="kds-takeaway-paused" role="status"><AlertTriangle size={15} /> Bếp đang tạm ngưng nhận đơn mang về</p>}
        </div>
        {branchId != null && <KitchenInsight key={branchId} branchId={branchId} />}
      </section>

      {queue.error && <div className="kds-error" role="alert"><span>Không tải được hàng đợi bếp. {queue.error}</span><button type="button" onClick={() => void queue.reload()}>Thử lại</button></div>}

      {(voids.data?.length ?? 0) > 0 && (
        <section className="kds-void-panel" aria-label="Yêu cầu hủy món">
          <div className="kds-void-head"><Icon icon={TriangleAlert} /><span>Yêu cầu hủy món</span><strong>{voids.data!.length}</strong><span className="kds-void-sub">Bếp xem xét và quyết định xử lý</span></div>
          <div className="kds-void-list">
            {voids.data!.map((ticket) => (
              <article key={ticket.itemId} className="kds-void-ticket">
                <div className="kds-void-info">
                  <div className="kds-void-item"><DishThumb src={imageOf(ticket.menuItemId)} name={ticket.itemName} size="md" />
                    <div><strong>{ticket.quantity} × {ticket.itemName}</strong><span>{ticket.orderCode} · {ticket.orderType === 'DINE_IN' ? `Bàn ${tableName(ticket.tableId)}` : ORDER_TYPE_LABEL[ticket.orderType ?? 'TAKEAWAY']}</span></div>
                  </div>
                  {ticket.voidReason && <p className="kds-void-reason">“{ticket.voidReason}”</p>}
                </div>
                {canOperate && <div className="kds-void-actions">
                  <button className="btn btn-lg btn-danger" disabled={busyId === ticket.itemId} onClick={() => void resolveVoid(ticket, 'ACCEPT')}><Icon icon={Check} size={18} /> Chấp nhận hủy</button>
                  <button className="btn btn-lg" disabled={busyId === ticket.itemId} onClick={() => void resolveVoid(ticket, 'REMAKE')}><Icon icon={RotateCcw} size={18} /> Làm lại</button>
                  <button className="btn btn-lg" disabled={busyId === ticket.itemId} onClick={() => void resolveVoid(ticket, 'CHARGE')}><Icon icon={Banknote} size={18} /> Giữ món / vẫn tính tiền</button>
                </div>}
              </article>
            ))}
          </div>
        </section>
      )}

      <nav className="kds-mobile-stages" aria-label="Trạng thái món">
        {STAGES.map(({ key, label }) => {
          const count = key === 'pending' ? pendingCount : key === 'cooking' ? cookingCount : readyCount
          return <button key={key} type="button" aria-pressed={mobileStage === key} onClick={() => setMobileStage(key)}>
            {label}<span>{count}</span>
          </button>
        })}
      </nav>

      <div className="kds-cols">
        <Column stage="pending" active={mobileStage === 'pending'} title="Chờ nấu" count={pendingCount} Icon={Flame} loading={queue.loading || (!!queue.error && !queue.data)}>
          {batchMode ? batchedPending.map((group) => (
            <article key={group.key} className="kticket kticket--batch">
              <div className="kticket-batch-top">
                <DishThumb src={imageOf(group.menuItemId)} name={group.itemName} size="lg" />
                <div className="kticket-batch-title"><strong>{group.itemName}</strong><span>{group.tickets.length} đơn · {group.totalQty} món</span></div>
                <span className="kticket-batch-qty">×{group.totalQty}</span>
              </div>
              <ul className="kticket-batch-orders">
                {group.tickets.map((ticket) => <li key={ticket.itemId}>
                  <span>{ticket.orderType === 'DINE_IN' ? `Bàn ${tableName(ticket.tableId)}` : `${orderTypeLabel(ticket.orderType)} ${ticket.orderCode ?? ''}`}</span>
                  <strong>×{ticket.quantity ?? 1}</strong>
                  {ticket.note && <small>{ticket.note}</small>}
                  {canOperate && <button type="button" className="kticket-batch-start" disabled={busyId === ticket.itemId || ticket.awaitingPayment || !ticket.itemId}
                    onClick={() => void move(ticket, 'start')}>
                    {ticket.awaitingPayment ? 'Chờ thanh toán' : busyId === ticket.itemId ? 'Đang nhận…' : `Bắt đầu · ${ticket.orderCode ?? 'đơn này'}`}
                  </button>}
                </li>)}
              </ul>
            </article>
          )) : pending.map((ticket) => <Ticket key={ticket.itemId} ticket={ticket} image={imageOf(ticket.menuItemId)} tableName={tableName(ticket.tableId)} now={now} estimatedWaitMinutes={load.data?.estimatedWaitMinutes}>
            {canOperate && <button className="btn btn-primary btn-xl btn-block" disabled={busyId === ticket.itemId || ticket.awaitingPayment} data-loading={busyId === ticket.itemId || undefined} onClick={() => void move(ticket, 'start')}>
              <Icon icon={ticket.awaitingPayment ? Banknote : Flame} size="touch" />{ticket.awaitingPayment ? 'Chờ thanh toán' : busyId === ticket.itemId ? 'Đang nhận…' : 'Bắt đầu'}
            </button>}
          </Ticket>)}
        </Column>

        <Column stage="cooking" active={mobileStage === 'cooking'} title="Đang nấu" count={cookingCount} Icon={Gauge} loading={queue.loading || (!!queue.error && !queue.data)}>
          {cooking.map((ticket) => <Ticket key={ticket.itemId} ticket={ticket} image={imageOf(ticket.menuItemId)} tableName={tableName(ticket.tableId)} now={now} estimatedWaitMinutes={load.data?.estimatedWaitMinutes}>
            {canOperate && <button className="btn btn-primary btn-xl btn-block" disabled={busyId === ticket.itemId} data-loading={busyId === ticket.itemId || undefined} onClick={() => void move(ticket, 'ready')}>
              <Icon icon={Check} size="touch" />{busyId === ticket.itemId ? 'Đang cập nhật…' : 'Hoàn thành'}
            </button>}
          </Ticket>)}
        </Column>

        <Column stage="ready" active={mobileStage === 'ready'} title="Hoàn thành / chờ bưng" count={readyCount} Icon={CheckCircle2} loading={queue.loading || (!!queue.error && !queue.data)}>
          {ready.map((ticket) => <Ticket key={ticket.itemId} ticket={ticket} image={imageOf(ticket.menuItemId)} tableName={tableName(ticket.tableId)} now={now} estimatedWaitMinutes={load.data?.estimatedWaitMinutes}>
            <div className="kticket-ready-label"><CheckCircle2 size={17} /> Sẵn sàng bưng</div>
          </Ticket>)}
        </Column>
      </div>

      {canOperate && menu.data && <div className="kds-soldout" aria-label="Báo hết món">
        <span className="lbl">Báo hết món</span>
        {menu.data.filter((item) => item.needsKitchen).map((item) => (
          <button key={item.menuItemId} className="chip-toggle" aria-pressed={!item.available} disabled={!item.menuItemId}
            onClick={() => void toggleSoldOut(item)} title={item.available ? 'Bấm để báo hết' : 'Bấm để bán lại'}>
            <DishThumb src={item.imageUrl} name={item.name} size="sm" /><Strikable on={!item.available}>{item.name}</Strikable>
          </button>
        ))}
      </div>}
    </div>
  )
}

function Column({ stage, active, title, count, Icon: Glyph, loading, children }: {
  stage: Stage; active: boolean; title: string; count: number; Icon: typeof Flame; loading: boolean; children: React.ReactNode
}) {
  const empty = Array.isArray(children) ? children.length === 0 : !children
  return <section className={`kds-col${active ? ' is-mobile-active' : ''}`} data-stage={stage} aria-label={`${title}, ${count} món`}>
    <h2><Icon icon={Glyph} size={19} /><span>{title}</span><span className={`count${count === 0 ? ' zero' : ''}`}><Counter value={count} label={`${count} món`} /></span></h2>
    {loading && count === 0 ? <div className="kds-column-loading" aria-label="Đang tải món"><i /><i /><i /></div>
      : empty ? <div className="kds-empty"><CheckCircle2 size={19} /><span>Không có món {stage === 'pending' ? 'đang chờ' : stage === 'cooking' ? 'đang nấu' : 'đã hoàn thành'}</span></div>
        : <div className="kds-ticket-list">{children}</div>}
  </section>
}

function Ticket({ ticket, image, tableName, children, now, estimatedWaitMinutes }: {
  ticket: KitchenTicketResponse; image?: string; tableName: string; children: React.ReactNode; now?: Date; estimatedWaitMinutes?: number | null
}) {
  const waitElapsed = ticket.status === 'PENDING' && estimatedWaitMinutes != null && estimatedWaitMinutes > 0
    && (ticket.waitingMinutes ?? 0) >= estimatedWaitMinutes
  const isDineIn = ticket.orderType === 'DINE_IN'
  const isTakeaway = ticket.orderType === 'TAKEAWAY' || ticket.orderType === 'DELIVERY'
  const orderType = ticket.orderType ? orderTypeLabel(ticket.orderType) : 'Đơn hàng'
  const stateClass = waitElapsed ? ' is-warning' : ''

  return <article className={`kticket${stateClass}${ticket.status === 'READY' ? ' is-ready' : ''}`}>
    <header className="kticket-head">
      <div><strong className="kticket-code">{ticket.orderCode ?? 'Đơn bếp'}</strong>
        <span className={`kticket-type${isDineIn ? ' is-dine-in' : isTakeaway ? ' is-takeaway' : ''}`}>
          {isDineIn ? `Tại bàn · ${tableName}` : orderType}
        </span>
      </div>
      {waitElapsed ? <span className="kticket-sla is-warning"><Clock3 size={14} />Đã chờ lâu</span>
        : ticket.status === 'READY' ? <span className="kticket-sla is-complete"><CheckCircle2 size={14} />Sẵn sàng bưng</span> : null}
    </header>

    <div className="kticket-dish">
      <DishThumb src={image} name={ticket.itemName} size="md" />
      <strong>{ticket.itemName ?? 'Món chưa có tên'}</strong>
      <span className="kticket-quantity">×{ticket.quantity ?? 1}</span>
    </div>
    {ticket.note && <div className="kticket-note"><strong>Ghi chú</strong><span>{ticket.note}</span></div>}

    <div className="kticket-times">
      {ticket.status === 'PENDING' && <span><small>Đã chờ</small><strong>{elapsed(ticket.orderedAt, ticket.waitingMinutes, now)}</strong></span>}
      {ticket.status === 'COOKING' && <>
        <span><small>Đang nấu</small><strong>{elapsed(ticket.cookingStartedAt, undefined, now)}</strong></span>
        <span><small>Tổng thời gian</small><strong>{elapsed(ticket.orderedAt, ticket.waitingMinutes, now)}</strong></span>
      </>}
      {ticket.status === 'READY' && <span><small>Sẵn sàng</small><strong>{elapsed(ticket.orderedAt, ticket.waitingMinutes, now)}</strong></span>}
    </div>
    {children}
  </article>
}

function elapsed(startedAt?: string, fallbackMinutes?: number, now = new Date()) {
  if (startedAt) {
    const start = new Date(startedAt).getTime()
    if (Number.isFinite(start)) {
      const seconds = Math.max(0, Math.floor((now.getTime() - start) / 1000))
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const remainder = seconds % 60
      return hours > 0
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    }
  }
  return fallbackMinutes == null ? '—' : `~${fallbackMinutes} phút`
}

function orderTypeLabel(type?: KitchenTicketResponse['orderType']) {
  if (type === 'TAKEAWAY') return 'Mang về'
  if (type === 'DELIVERY') return 'Giao hàng'
  return ORDER_TYPE_LABEL[type ?? 'TAKEAWAY']
}
