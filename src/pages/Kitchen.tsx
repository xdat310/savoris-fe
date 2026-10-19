import { AlertTriangle, CheckCircle2, Flame, Gauge, HandPlatter, Layers, ShoppingBag, TriangleAlert, UtensilsCrossed, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, get, put } from '../api/client'
import type { BranchLoadResponse, BranchMenuItemResponse, KitchenTicketResponse, OrderResponse, TableResponse } from '../api/types'
import { useAuth } from '../auth'
import { Strikable } from '../components/ChalkStrike'
import { DishThumb } from '../components/DishThumb'
import { useToast } from '../components/Toast'
import { ORDER_TYPE_LABEL } from '../lib/format'
import { useData } from '../lib/useData'
import { Counter } from '../components/Counter'

const LATE_MINUTES  = 15
const PEAK_THRESHOLD = 80   // % load that triggers PEAK MODE

const LOAD_STATE = {
  NORMAL:     { cls: 'normal',     label: 'Bình thường',             Icon: CheckCircle2 },
  BUSY:       { cls: 'busy',       label: 'Bận',                      Icon: Gauge },
  OVERLOADED: { cls: 'overloaded', label: 'Quá tải — ngưng mang đi', Icon: AlertTriangle },
} as const

type Filter = 'ALL' | 'DINE_IN' | 'TAKEAWAY'

const FILTERS: { key: Filter; label: string; Icon: typeof UtensilsCrossed }[] = [
  { key: 'ALL',      label: 'Tất cả',  Icon: Gauge },
  { key: 'DINE_IN',  label: 'Tại Bàn', Icon: UtensilsCrossed },
  { key: 'TAKEAWAY', label: 'Mang Về', Icon: ShoppingBag },
]

const KITCHEN_CHANNEL = 'savoris-kitchen'

export function Kitchen() {
  const { branchId, role, branches } = useAuth()
  const toast = useToast()
  const cooks = role === 'CHEF' || role === 'ADMIN'
  const queue  = useData(() => get<KitchenTicketResponse[]>(`/kitchen/branches/${branchId}/queue`), [branchId], 4000)
  const voids  = useData(() => get<KitchenTicketResponse[]>(`/kitchen/branches/${branchId}/void-queue`), [branchId], 4000)
  const load   = useData(() => get<BranchLoadResponse>(`/kitchen/branches/${branchId}/load`), [branchId], 8000)
  const menu   = useData(() => get<BranchMenuItemResponse[]>(`/branches/${branchId}/menu`), [branchId], 30000)
  const tables = useData(() => get<TableResponse[]>(`/branches/${branchId}/tables`), [branchId])
  const tableName = (id?: number) => tables.data?.find((t) => t.id === id)?.name ?? `#${id}`
  const imageOf   = (id?: number) => menu.data?.find((m) => m.menuItemId === id)?.imageUrl
  const [busyId, setBusyId] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [batchMode, setBatchMode] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try { channelRef.current = new BroadcastChannel(KITCHEN_CHANNEL) }
    catch { /* unsupported */ }
    return () => channelRef.current?.close()
  }, [])

  const allTickets = queue.data ?? []

  function applyFilter(list: KitchenTicketResponse[]) {
    if (filter === 'ALL') return list
    return list.filter((t) => t.orderType === filter || (filter === 'TAKEAWAY' && t.orderType === 'DELIVERY'))
  }

  const pending = applyFilter(allTickets.filter((t) => t.status === 'PENDING'))
  const cooking = applyFilter(allTickets.filter((t) => t.status === 'COOKING'))
  const ready   = applyFilter(allTickets.filter((t) => t.status === 'READY'))

  // Smart Batch: group pending by itemName, show aggregate
  const batchedPending = useMemo(() => {
    if (!batchMode) return []
    const map = new Map<string, { itemName: string; menuItemId?: number; totalQty: number; orders: string[] }>()
    for (const t of pending) {
      const key = String(t.menuItemId ?? t.itemName)
      if (!map.has(key)) map.set(key, { itemName: t.itemName!, menuItemId: t.menuItemId, totalQty: 0, orders: [] })
      const entry = map.get(key)!
      entry.totalQty += t.quantity ?? 1
      const where = t.orderType === 'DINE_IN' ? `Bàn ${tableName(t.tableId)}` : `MV#${t.orderCode?.split('-').pop()}`
      if (!entry.orders.includes(where)) entry.orders.push(where)
    }
    return [...map.values()].sort((a, b) => b.totalQty - a.totalQty)
  }, [batchMode, pending])

  async function move(t: KitchenTicketResponse, step: 'start' | 'ready' | 'served') {
    setBusyId(t.itemId!)
    try {
      await put(`/kitchen/items/${t.itemId}/${step}`)
      if (step === 'ready') {
        channelRef.current?.postMessage({
          type: 'DISH_READY',
          itemName: t.itemName,
          orderType: t.orderType,
          tableId: t.tableId,
          tableName: tableName(t.tableId),
          orderCode: t.orderCode,
        })
      }
      await Promise.all([queue.reload(), load.reload()])
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không cập nhật được', true)
      queue.reload()
    } finally {
      setBusyId(null)
    }
  }

  async function resolveVoid(t: KitchenTicketResponse, resolution: 'ACCEPT' | 'REMAKE' | 'CHARGE') {
    setBusyId(t.itemId!)
    try {
      const result = await put<OrderResponse>(`/orders/${t.orderId}/items/${t.itemId}/void-resolve`, { resolution })
      channelRef.current?.postMessage({
        type: 'VOID_RESOLVED',
        resolution,
        itemName: t.itemName,
        orderId: t.orderId,
        tableId: t.tableId,
        orderCode: t.orderCode,
      })
      await Promise.all([queue.reload(), voids.reload(), load.reload()])
      void result
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không xử lý được', true)
      voids.reload()
    } finally {
      setBusyId(null)
    }
  }

  async function toggleSoldOut(item: BranchMenuItemResponse) {
    try {
      await put(`/branches/${branchId}/menu/${item.menuItemId}/availability`, { available: !item.available })
      menu.setData((list) => list?.map((m) => (m.menuItemId === item.menuItemId ? { ...m, available: !item.available } : m)))
      toast(item.available ? `Đã báo hết ${item.name}` : `${item.name} bán lại`)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không cập nhật được', true)
    }
  }

  const state      = LOAD_STATE[(load.data?.status as keyof typeof LOAD_STATE) ?? 'NORMAL'] ?? LOAD_STATE.NORMAL
  const branch     = branches.find((b) => b.id === branchId)
  const loadPct    = load.data?.loadPercent ?? 0
  const isPeak     = loadPct >= PEAK_THRESHOLD
  const waitExtra  = isPeak ? Math.round((loadPct - PEAK_THRESHOLD) / 10) * 5 + 15 : 0

  return (
    <div className="kds">
      {/* ── PEAK MODE banner ── */}
      {isPeak && (
        <div className="kds-peak-banner" role="alert">
          <Zap size={16} aria-hidden="true" />
          <strong>PEAK MODE</strong>
          <span>Bếp đang cao tải ({loadPct}%). Ước tính thời gian chờ tăng thêm ~{waitExtra} phút.</span>
          {load.data?.status === 'OVERLOADED' && <span className="kds-peak-stop">Đã tạm ngưng đơn mang về.</span>}
        </div>
      )}

      <header className="kds-head">
        <div className="kds-head-left">
          <h1>Bếp · {branch?.name ?? ''}</h1>
          {queue.error && <div style={{ color: '#ff9db3', fontSize: 14 }}>{queue.error}</div>}

          {/* ── Quick filter tabs ── */}
          <div className="kds-filter">
            {FILTERS.map(({ key, label, Icon }) => (
              <button key={key}
                className={`kds-filter-btn${filter === key ? ' kds-filter-btn--on' : ''}`}
                onClick={() => setFilter(key)}
              >
                <Icon size={13} aria-hidden="true" />
                {label}
                {key !== 'ALL' && (
                  <span className="kds-filter-count">
                    {allTickets.filter((t) => t.orderType === key || (key === 'TAKEAWAY' && t.orderType === 'DELIVERY')).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {load.data && (
          <div className="load">
            <span className={`kds-state ${state.cls}`}><state.Icon size={16} aria-hidden="true" />{state.label}</span>
            <div className="load-meter" role="meter" aria-valuenow={loadPct} aria-valuemin={0} aria-valuemax={100} aria-label="Tải bếp">
              <span style={{
                transform: `scaleX(${Math.min(100, loadPct) / 100})`,
                background: load.data.status === 'OVERLOADED' ? 'var(--red)' : load.data.status === 'BUSY' ? 'var(--amber)' : 'var(--green)',
              }} />
            </div>
            <span className="load-text">
              <strong className="num">{(load.data.pendingPortions ?? 0) + (load.data.cookingPortions ?? 0)}</strong>/{load.data.kitchenCapacity} phần
              {load.data.estimatedWaitMinutes ? ` · chờ ~${load.data.estimatedWaitMinutes}′` : ''}
            </span>
          </div>
        )}

        {/* Smart Batch toggle — shown to kitchen operators */}
        {cooks && (
          <button
            className={`kds-batch-btn${batchMode ? ' kds-batch-btn--on' : ''}`}
            onClick={() => setBatchMode((v) => !v)}
            title="Gộp các món trùng nhau từ nhiều bàn thành 1 dòng để nấu hàng loạt"
          >
            <Layers size={16} aria-hidden="true" />
            {batchMode ? 'Đang gộp món' : '⚡ Gộp Món'}
          </button>
        )}

        <div className="clock" aria-label="Giờ hiện tại">
          {now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      {/* ── Void queue panel ── */}
      {(voids.data?.length ?? 0) > 0 && (
        <div className="kds-void-panel" role="region" aria-label="Yêu cầu hủy món">
          <div className="kds-void-head">
            <TriangleAlert size={16} aria-hidden="true" />
            <span>Yêu cầu hủy món ({voids.data!.length})</span>
            <span className="kds-void-sub">Bếp xem xét và quyết định xử lý</span>
          </div>
          <div className="kds-void-list">
            {voids.data!.map((t) => (
              <div key={t.itemId} className="kds-void-ticket">
                <div className="kds-void-info">
                  <div className="kds-void-item">
                    <DishThumb src={imageOf(t.menuItemId)} name={t.itemName} size="md" />
                    <div>
                      <div className="kds-void-name">{t.quantity} × {t.itemName}</div>
                      <div className="kds-void-where">
                        {t.orderType === 'DINE_IN' ? `Bàn ${tableName(t.tableId)}` : `MV #${t.orderCode?.split('-').pop()}`}
                        {' · '}{t.waitingMinutes} phút
                      </div>
                    </div>
                  </div>
                  {t.voidReason && <div className="kds-void-reason">"{t.voidReason}"</div>}
                </div>
                {cooks && (
                  <div className="kds-void-actions">
                    <button className="btn btn-sm kds-void-accept" disabled={busyId === t.itemId}
                      onClick={() => resolveVoid(t, 'ACCEPT')}>
                      ✓ Chấp nhận hủy
                    </button>
                    <button className="btn btn-sm kds-void-remake" disabled={busyId === t.itemId}
                      onClick={() => resolveVoid(t, 'REMAKE')}>
                      ↻ Làm lại miễn phí
                    </button>
                    <button className="btn btn-sm kds-void-charge" disabled={busyId === t.itemId}
                      onClick={() => resolveVoid(t, 'CHARGE')}>
                      $ Khách vẫn trả
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="kds-cols">
        {/* ── Chờ nấu — normal or batch view ── */}
        <Column title="Chờ nấu" count={pending.length} Icon={Flame}>
          {batchMode ? (
            batchedPending.length === 0 ? null :
            batchedPending.map((b) => (
              <article key={b.menuItemId ?? b.itemName} className="kticket kticket--batch">
                <div className="kticket-batch-qty">×{b.totalQty}</div>
                <div className="kticket-batch-info">
                  <div className="kticket-batch-name">
                    <DishThumb src={imageOf(b.menuItemId)} name={b.itemName} size="lg" />
                    {b.itemName}
                  </div>
                  <div className="kticket-batch-orders">{b.orders.join(' · ')}</div>
                </div>
              </article>
            ))
          ) : (
            pending.map((t, i) => (
              <Ticket key={t.itemId} t={t} image={imageOf(t.menuItemId)} tableName={tableName(t.tableId)} next={i === 0}>
                {cooks && (
                  <button className={`btn btn-block ${i === 0 ? 'btn-accent' : 'btn-ghost-chalk'}`}
                    disabled={busyId === t.itemId} onClick={() => move(t, 'start')}>
                    Nhận nấu
                  </button>
                )}
              </Ticket>
            ))
          )}
        </Column>

        <Column title="Đang nấu" count={cooking.length} Icon={Gauge}>
          {cooking.map((t, i) => (
            <Ticket key={t.itemId} t={t} image={imageOf(t.menuItemId)} tableName={tableName(t.tableId)} next={i === 0} cooking>
              {cooks && (
                <button className={`btn btn-block ${i === 0 ? 'btn-chalk-blue' : 'btn-ghost-chalk'}`}
                  disabled={busyId === t.itemId} onClick={() => move(t, 'ready')}>
                  Hoàn thành
                </button>
              )}
            </Ticket>
          ))}
        </Column>

        <Column title="Xong · chờ bưng" count={ready.length} Icon={HandPlatter}>
          {ready.map((t) => (
            <Ticket key={t.itemId} t={t} image={imageOf(t.menuItemId)} tableName={tableName(t.tableId)}>
              <button className="btn btn-ghost-chalk btn-block"
                disabled={busyId === t.itemId} onClick={() => move(t, 'served')}>
                Đã bưng ra
              </button>
            </Ticket>
          ))}
        </Column>
      </div>

      {cooks && menu.data && (
        <div className="kds-soldout" aria-label="Báo hết món">
          <span className="lbl">Báo hết món:</span>
          {menu.data.filter((m) => m.needsKitchen).map((m) => (
            <button key={m.menuItemId} className="chip-toggle" aria-pressed={!m.available}
              onClick={() => toggleSoldOut(m)} title={m.available ? 'Bấm để báo hết' : 'Bấm để bán lại'}>
              <DishThumb src={m.imageUrl} name={m.name} size="sm" />
              <Strikable on={!m.available}>{m.name}</Strikable>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Column({ title, count, Icon, children }: {
  title: string; count: number; Icon: typeof Flame; children: React.ReactNode
}) {
  const empty = Array.isArray(children) ? children.length === 0 : !children
  return (
    <section className="kds-col" aria-label={title}>
      <h2>
        <Icon size={18} aria-hidden="true" />
        {title}
        <span className={`count${count === 0 ? ' zero' : ''}`}>
          <Counter value={count} label={`${count} món`} />
        </span>
      </h2>
      {empty ? <div className="kds-empty">Trống</div> : children}
    </section>
  )
}

function Ticket({ t, image, tableName, next, cooking, children }: {
  t: KitchenTicketResponse; image?: string; tableName: string
  next?: boolean; cooking?: boolean; children: React.ReactNode
}) {
  const late    = (t.waitingMinutes ?? 0) >= LATE_MINUTES && t.status !== 'READY'
  const isDineIn = t.orderType === 'DINE_IN'
  const isTake   = t.orderType === 'TAKEAWAY' || t.orderType === 'DELIVERY'

  return (
    <article className={['kticket', late ? 'late' : '', next ? 'next' : '', cooking ? 'cooking' : '',
      isDineIn ? 'kticket--dine' : '', isTake ? 'kticket--take' : ''].filter(Boolean).join(' ')}>

      <div className={`kticket-badge${isDineIn ? ' kticket-badge--dine' : isTake ? ' kticket-badge--take' : ''}`}>
        {isDineIn
          ? <><UtensilsCrossed size={11} aria-hidden="true" /> Bàn {tableName}</>
          : <><ShoppingBag size={11} aria-hidden="true" /> {ORDER_TYPE_LABEL[t.orderType!]} #{t.orderCode?.split('-').pop()}</>}
      </div>

      <div className="ktop">
        <span className="kname with-thumb">
          <DishThumb src={image} name={t.itemName} size={next ? 'lg' : 'md'} />
          {t.itemName}
        </span>
        <span className="kqty" aria-label={`${t.quantity} phần`}>×{t.quantity}</span>
      </div>

      {t.note && <div className="knote">{t.note}</div>}

      <div className="kmeta">
        <span>{t.orderCode?.split('-').pop()}</span>
        <span className="kwait">
          {late && <AlertTriangle size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />}
          {t.waitingMinutes} phút
        </span>
      </div>
      {children}
    </article>
  )
}
