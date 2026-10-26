import { AlertTriangle, Ban, Bell, Check, CupSoda, Globe, HandPlatter, Landmark, Minus, Plus, Scissors, Search, Send, ShoppingBag, Ticket, Trash2, UtensilsCrossed, UserRound, Wallet, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ApiError, get, post, put } from '../api/client'
import type {
  BranchLoadResponse, BranchMenuItemResponse, CustomerResponse, MenuCategoryResponse, OrderItemResponse,
  OrderResponse, PaymentResponse, PromotionCheckResponse, TableResponse, TransferQrSetting,
} from '../api/types'
import { mediaUrl } from '../api/site'
import { can, useAuth } from '../auth'
import { Strikable } from '../components/ChalkStrike'
import { DishThumb } from '../components/DishThumb'
import { GuestOrderAlerts, useGuestOrderAlerts } from '../components/GuestOrderAlerts'
import { TakeawayAlerts, useTakeawayReminders } from '../components/TakeawayAlerts'
import { chime, unlockSound } from '../lib/chime'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { Chip, LoadState } from '../components/State'
import { useToast } from '../components/Toast'
import { ITEM_STATUS_LABEL, ORDER_TYPE_LABEL, money, time } from '../lib/format'
import { useData } from '../lib/useData'
import { Counter } from '../components/Counter'
import { confirmDialog } from '../components/ui/Dialog'

type Selection =
  | { kind: 'table'; tableId: number }
  | { kind: 'order'; orderId: number }
  | { kind: 'new'; type: 'TAKEAWAY' | 'DELIVERY' }
  | null

type Course = 1 | 2 | 3
interface DraftLine { menuItemId: number; quantity: number; course: Course }

const COURSE_LABEL: Record<Course, string> = { 1: 'Khai vị', 2: 'Món chính', 3: 'Tráng miệng' }
const QUICK_CASH = [50000, 100000, 200000, 500000]

export function Pos() {
  const { branchId, role } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState<'floor' | 'takeaway'>('floor')
  const [selection, setSelection] = useState<Selection>(null)
  const [draft, setDraft] = useState<DraftLine[]>([])
  const [activeCourse, setActiveCourse] = useState<Course>(2)
  const [flashReadyTables, setFlashReadyTables] = useState<Set<number>>(new Set())

  const tables = useData(() => get<TableResponse[]>(`/branches/${branchId}/tables`), [branchId], 10000)
  const orders = useData(() => get<OrderResponse[]>(`/orders/branch/${branchId}`), [branchId], 8000)
  const menu   = useData(() => get<BranchMenuItemResponse[]>(`/branches/${branchId}/menu`), [branchId], 30000)
  const categories = useData(() => get<MenuCategoryResponse[]>('/menu-categories/search?q='), [])
  const load   = useData(() => get<BranchLoadResponse>(`/kitchen/branches/${branchId}/load`), [branchId], 15000)

  const openOrders = useMemo(() => orders.data ?? [], [orders.data])

  const refunds = useData(
    () => (can.cash(role) ? get<OrderResponse[]>(`/orders/branch/${branchId}/refunds-due`) : Promise.resolve([])),
    [branchId, role], 15000)
  const reminders = useTakeawayReminders(orders.data, refunds.data, can.cash(role))
  const guestOrders = useGuestOrderAlerts(orders.data, true)
  const [settling, setSettling] = useState<number | null>(null)

  async function refunded(orderId: number) {
    if (!(await confirmDialog({ title: 'Ghi nhận đã hoàn tiền?', message: 'Đã chuyển trả tiền cho khách, hoặc đã kiểm tra là tiền chưa hề về?', confirmLabel: 'Đã hoàn tiền' }))) return
    setSettling(orderId)
    try {
      await put(`/orders/${orderId}/refund-settled`)
      await refunds.reload()
      toast('Đã ghi nhận hoàn tiền')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không lưu được', true)
    } finally {
      setSettling(null)
    }
  }

  useEffect(() => unlockSound(), [])

  // Immediate bell + toast when kitchen marks dish ready
  useEffect(() => {
    let ch: BroadcastChannel | null = null
    try {
      ch = new BroadcastChannel('savoris-kitchen')
      ch.onmessage = (ev) => {
        if (ev.data?.type !== 'DISH_READY') return
        if (ev.data?.type === 'VOID_RESOLVED') {
          const { resolution, itemName: vName } = ev.data
          const label = resolution === 'ACCEPT' ? 'Bếp chấp nhận hủy' : resolution === 'REMAKE' ? 'Bếp làm lại' : 'Bếp giữ, khách vẫn trả'
          toast(`${vName}: ${label}`)
          return
        }
        chime(2)
        const { itemName, orderType, tableName: tName, orderCode, tableId } = ev.data
        const where = orderType === 'DINE_IN' ? `Bàn ${tName}` : `Mang về #${orderCode?.split('-').pop()}`
        toast(`${itemName} · ${where} sẵn sàng bưng`)
        if (tableId) setFlashReadyTables((prev) => new Set([...prev, tableId]))
      }
    } catch { /* BroadcastChannel not supported */ }
    return () => ch?.close()
  }, [toast])

  // Clear flash state once orders poll confirms no more READY items
  const ordersByTable = useMemo(() => {
    const map = new Map<number, OrderResponse[]>()
    for (const o of openOrders) if (o.tableId) map.set(o.tableId, [...(map.get(o.tableId) ?? []), o])
    return map
  }, [openOrders])

  useEffect(() => {
    setFlashReadyTables((prev) => {
      if (prev.size === 0) return prev
      const still = new Set<number>()
      for (const tid of prev) {
        const os = ordersByTable.get(tid) ?? []
        if (os.some((o) => o.items?.some((it) => it.status === 'READY'))) still.add(tid)
      }
      return still.size === prev.size ? prev : still
    })
  }, [ordersByTable])

  const currentOrder: OrderResponse | undefined =
    selection?.kind === 'order' ? openOrders.find((o) => o.id === selection.orderId)
      : selection?.kind === 'table' ? ordersByTable.get(selection.tableId)?.[0]
        : undefined
  const tableOrders = selection?.kind === 'table' ? ordersByTable.get(selection.tableId) ?? [] : []

  function select(next: Selection) { setSelection(next); setDraft([]) }

  function addDish(item: BranchMenuItemResponse) {
    if (!selection) { toast('Chọn bàn hoặc tạo đơn mang đi trước', true); return }
    setDraft((d) => {
      const existing = d.find((l) => l.menuItemId === item.menuItemId && l.course === activeCourse)
      return existing
        ? d.map((l) => (l.menuItemId === item.menuItemId && l.course === activeCourse ? { ...l, quantity: l.quantity + 1 } : l))
        : [...d, { menuItemId: item.menuItemId!, quantity: 1, course: activeCourse }]
    })
  }

  async function refreshAll() {
    await Promise.all([orders.reload(), tables.reload(), load.reload(), menu.reload()])
  }

  const takeawayPaused = load.data && !load.data.acceptingTakeaway
  const [stockPanel, setStockPanel] = useState(false)
  const readyMadeOut = (menu.data ?? []).filter((m) => !m.needsKitchen && !m.available).length
  const waitingWeb = openOrders.filter((o) => o.status === 'AWAITING_PAYMENT').length

  return (
    <div className="pos">
      <div className="pos-work">
        <div className="pos-toolbar">
          <div className="seg" role="group" aria-label="Loại đơn">
            <button aria-pressed={mode === 'floor'} onClick={() => setMode('floor')}>Tại bàn</button>
            <button aria-pressed={mode === 'takeaway'} onClick={() => setMode('takeaway')}>
              Mang đi · Giao hàng
              {waitingWeb > 0 && <span className="seg-badge" aria-label={`${waitingWeb} đơn web chờ thanh toán`}>{waitingWeb}</span>}
            </button>
          </div>
          <button className="btn btn-sm" aria-expanded={stockPanel} onClick={() => setStockPanel(!stockPanel)}>
            <CupSoda size={15} aria-hidden="true" /> Hết hàng
            {readyMadeOut > 0 && <span className="seg-badge" style={{ background: 'var(--red)' }}>{readyMadeOut}</span>}
          </button>
          {load.data && (
            <div className="row" style={{ fontSize: 'var(--fs-14)', color: 'var(--ink-soft)' }}>
              Bếp: <LoadState status={load.data.status} />
              <span className="num">{load.data.loadPercent}%</span>
              {load.data.estimatedWaitMinutes != null && load.data.estimatedWaitMinutes > 0 && (
                <span>· chờ ~{load.data.estimatedWaitMinutes} phút</span>
              )}
            </div>
          )}
        </div>

        <GuestOrderAlerts alerts={guestOrders.alerts} onDismiss={guestOrders.dismiss}
          tableName={(id) => `Bàn ${tables.data?.find((t) => t.id === id)?.name ?? ''}`.trim()}
          onOpen={(tableId) => { setMode('floor'); select({ kind: 'table', tableId }) }} />
        <TakeawayAlerts alerts={reminders.alerts} onDismiss={reminders.dismiss} onRefunded={refunded} settling={settling}
          onOpen={(orderId) => { setMode('takeaway'); select({ kind: 'order', orderId }) }} />

        {stockPanel && (
          <ReadyMadeStock items={(menu.data ?? []).filter((m) => !m.needsKitchen)} branchId={branchId!} onChanged={menu.reload} />
        )}

        {mode === 'floor' ? (
          <FloorPlan
            tables={tables.data}
            error={tables.error}
            ordersByTable={ordersByTable}
            flashReadyTables={flashReadyTables}
            selectedTable={selection?.kind === 'table' ? selection.tableId : undefined}
            onSelect={(tableId) => select({ kind: 'table', tableId })}
          />
        ) : (
          <TakeawayList
            orders={openOrders.filter((o) => o.orderType !== 'DINE_IN')}
            paused={!!takeawayPaused}
            wait={load.data?.estimatedWaitMinutes}
            selected={selection}
            onNew={(type) => select({ kind: 'new', type })}
            onSelect={(orderId) => select({ kind: 'order', orderId })}
          />
        )}

        {/* Course selector + menu board */}
        <div style={{ marginTop: 22 }}>
          {selection && (
            <div className="course-tabs" role="group" aria-label="Đợt gọi món">
              {([1, 2, 3] as Course[]).map((c) => {
                const count = draft.filter((l) => l.course === c).length
                return (
                  <button
                    key={c}
                    className={`course-tab${activeCourse === c ? ' course-tab--on' : ''}`}
                    onClick={() => setActiveCourse(c)}
                    aria-pressed={activeCourse === c}
                  >
                    {COURSE_LABEL[c]}
                    {count > 0 && <span className="course-tab-badge">{count}</span>}
                  </button>
                )
              })}
            </div>
          )}
          <MenuBoard
            items={menu.data}
            categories={categories.data}
            error={menu.error}
            onAdd={addDish}
            disabled={!selection || currentOrder?.status === 'AWAITING_PAYMENT'}
          />
        </div>
      </div>

      <OrderColumn
        key={selection ? JSON.stringify(selection) + (currentOrder?.id ?? '') : 'none'}
        role={role}
        branchId={branchId!}
        selection={selection}
        order={currentOrder}
        siblingOrders={tableOrders}
        onPickSibling={(orderId) => select({ kind: 'order', orderId })}
        tableName={selection?.kind === 'table' ? tables.data?.find((t) => t.id === selection.tableId)?.name : undefined}
        menu={menu.data ?? []}
        draft={draft}
        setDraft={setDraft}
        onChanged={refreshAll}
        onCreated={(order) => {
          refreshAll()
          if (order.orderType !== 'DINE_IN') setSelection({ kind: 'order', orderId: order.id! })
          setDraft([])
        }}
        onClosed={() => { refreshAll(); select(null) }}
      />
    </div>
  )
}

// ---------------------------------------------------------------- floor plan

function FloorPlan({ tables, error, ordersByTable, flashReadyTables, selectedTable, onSelect }: {
  tables?: TableResponse[]
  error: string | null
  ordersByTable: Map<number, OrderResponse[]>
  flashReadyTables: Set<number>
  selectedTable?: number
  onSelect: (id: number) => void
}) {
  if (error) return <ErrorNotice message={error} />
  if (!tables) return <Loading label="Đang tải sơ đồ bàn…" />
  if (tables.length === 0) return <Empty title="Chi nhánh chưa có bàn">Quản lý cần tạo khu vực và bàn.</Empty>

  const areas = new Map<number, TableResponse[]>()
  for (const t of tables) areas.set(t.areaId!, [...(areas.get(t.areaId!) ?? []), t])

  return (
    <div className="floor-areas">
      <div className="floor-legend" aria-hidden="true">
        <span style={{ '--tone': 'var(--success)' } as React.CSSProperties}><i /> Trống</span>
        <span style={{ '--tone': 'var(--info)' } as React.CSSProperties}><i /> Đang phục vụ</span>
        <span style={{ '--tone': 'var(--violet)' } as React.CSSProperties}><i /> Đã lên đủ món</span>
        <span style={{ '--tone': 'var(--warning)' } as React.CSSProperties}><i /> Chờ thanh toán</span>
        <span style={{ '--tone': 'var(--accent)' } as React.CSSProperties}><i /> Có món ra</span>
      </div>
      {[...areas.entries()].map(([areaId, list], i) => (
        <section key={areaId}>
          <h2 className="area-title">Khu {i + 1}</h2>
          <div
            className={`floor${selectedTable ? ' has-focus compact' : ''}`}
            style={{ '--cols': Math.min(list.length, 10), '--cols-narrow': Math.ceil(Math.min(list.length, 10) / 2) } as React.CSSProperties}
          >
            {list.map((t) => {
              const open     = ordersByTable.get(t.id!) ?? []
              const occupied = open.length > 0 || t.status === 'OCCUPIED'
              const total    = open.reduce((s, o) => s + (o.totalAmount ?? 0), 0)
              const hasReady = open.some((o) => o.items?.some((it) => it.status === 'READY')) || flashReadyTables.has(t.id!)
              // Display-only state, read from data already on screen: the order list does not say whether a bill
              // is paid, so a table whose dishes are all out is labelled as such rather than "waiting to pay"
              const live = (o: OrderResponse) => (o.items ?? []).filter((it) => it.status !== 'CANCELLED')
              const awaiting = open.some((o) => o.status === 'AWAITING_PAYMENT')
              const allServed = !awaiting && open.length > 0 && open.every((o) => live(o).length > 0 && live(o).every((it) => it.status === 'SERVED'))
              const tileState = !occupied ? 'free' : awaiting ? 'awaiting' : allServed ? 'served' : 'occupied'
              const stateLabel = { free: 'Trống', occupied: 'Đang phục vụ', served: 'Đã lên đủ món', awaiting: 'Chờ thanh toán' }[tileState]
              return (
                <button
                  key={t.id}
                  className={[
                    'table-tile',
                    tileState,
                    hasReady ? 'has-ready' : '',
                    selectedTable === t.id ? 'selected' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => onSelect(t.id!)}
                  aria-pressed={selectedTable === t.id}
                  aria-label={`Bàn ${t.name}, ${stateLabel.toLowerCase()}${hasReady ? ', có món sẵn sàng' : ''}`}
                >
                  <span className="tno">{t.name}</span>
                  <span className="tstate">{stateLabel}</span>
                  <span className="tmeta">
                    <span>{t.capacity} chỗ</span>
                    {occupied && <span className="tamt">{money(total)}</span>}
                  </span>
                  {hasReady && (
                    <span className="tile-ready-badge">
                      <Bell size={12} aria-hidden="true" /><span className="tile-ready-text">Có món ra</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- takeaway list

function TakeawayList({ orders, paused, wait, selected, onNew, onSelect }: {
  orders: OrderResponse[]; paused: boolean; wait?: number; selected: Selection
  onNew: (type: 'TAKEAWAY' | 'DELIVERY') => void; onSelect: (id: number) => void
}) {
  return (
    <div>
      {paused && (
        <div className="notice notice-bad" style={{ marginBottom: 14 }} role="alert">
          <Ban size={18} aria-hidden="true" />
          <div>
            <strong>Bếp đang quá tải — tạm ngưng nhận đơn mang đi và giao hàng.</strong>{' '}
            Khách tại bàn vẫn được phục vụ{wait ? `; ước tính chờ ~${wait} phút` : ''}. Hệ thống tự mở lại khi bếp bớt tải.
          </div>
        </div>
      )}
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn btn-accent" onClick={() => onNew('TAKEAWAY')} disabled={paused}>
          <ShoppingBag size={18} aria-hidden="true" /> Đơn mang đi mới
        </button>
        <button className="btn" onClick={() => onNew('DELIVERY')} disabled={paused}>Đơn giao hàng mới</button>
      </div>
      {orders.some((o) => o.status === 'AWAITING_PAYMENT') && (
        <>
          <h3 className="area-title"><Globe size={14} aria-hidden="true" /> Đơn web chờ thanh toán · bếp chưa nhận</h3>
          <div className="takeaway-list" style={{ marginBottom: 18 }}>
            {orders.filter((o) => o.status === 'AWAITING_PAYMENT').map((o) => (
              <button key={o.id} className={`ticket web-waiting${selected?.kind === 'order' && selected.orderId === o.id ? ' selected' : ''}`} onClick={() => onSelect(o.id!)}>
                <span className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="code">{o.code}</span>
                  <Chip tone={o.transferClaimedAt ? 'info' : 'warn'}>{o.transferClaimedAt ? 'Khách báo đã chuyển' : o.payMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}</Chip>
                </span>
                <span style={{ fontWeight: 'var(--fw-semibold)' }}>{o.guestName} · <span className="num">{o.guestPhone}</span></span>
                <span className="muted" style={{ fontSize: 'var(--fs-13)' }}>{o.items?.filter((i) => i.status !== 'CANCELLED').length} món · đặt lúc {time(o.createdAt)}</span>
                <span className="num" style={{ fontWeight: 'var(--fw-semibold)' }}>{money(o.totalAmount)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {orders.filter((o) => o.status !== 'AWAITING_PAYMENT').length === 0 ? (
        <Empty title="Chưa có đơn mang đi nào đang mở" />
      ) : (
        <div className="takeaway-list">
          {orders.filter((o) => o.status !== 'AWAITING_PAYMENT').map((o) => (
            <button key={o.id} className={`ticket${selected?.kind === 'order' && selected.orderId === o.id ? ' selected' : ''}`} onClick={() => onSelect(o.id!)}>
              <span className="row" style={{ justifyContent: 'space-between' }}>
                <span className="code">{o.code}</span>
                <Chip tone="neutral">{ORDER_TYPE_LABEL[o.orderType!]}</Chip>
              </span>
              <span className="muted" style={{ fontSize: 'var(--fs-13)' }}>{o.items?.filter((i) => i.status !== 'CANCELLED').length} món · {time(o.createdAt)}</span>
              <span className="num" style={{ fontWeight: 'var(--fw-semibold)' }}>{money(o.totalAmount)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- menu board

function MenuBoard({ items, categories, error, onAdd, disabled }: {
  items?: BranchMenuItemResponse[]; categories?: MenuCategoryResponse[]; error: string | null
  onAdd: (item: BranchMenuItemResponse) => void; disabled: boolean
}) {
  if (error) return <ErrorNotice message={error} />
  if (!items) return <Loading label="Đang tải menu…" />
  const groups = new Map<number, BranchMenuItemResponse[]>()
  for (const it of items) groups.set(it.categoryId!, [...(groups.get(it.categoryId!) ?? []), it])
  const catName = (id: number) => categories?.find((c) => c.id === id)?.name ?? 'Món'

  return (
    <section className="menu-board" id="menu-board" aria-label="Menu chi nhánh">
      <h3>
        <span className="chalk board-title">Hôm nay có</span>
        {disabled && <span style={{ fontSize: 'var(--fs-13)', fontWeight: 'var(--fw-medium)' }}>Chọn bàn để gọi món</span>}
      </h3>
      {[...groups.entries()].map(([catId, list]) => (
        <div key={catId}>
          <div className="menu-cat">{catName(catId)}</div>
          {list.map((it) => {
            const soldOut = !it.available
            return (
              <button
                key={it.menuItemId}
                className={`dish${soldOut ? ' soldout' : ''}`}
                onClick={() => onAdd(it)}
                disabled={soldOut || disabled}
                aria-label={soldOut ? `${it.name}, hết món` : `Thêm ${it.name}, ${money(it.price)}`}
              >
                <DishThumb src={it.imageUrl} name={it.name} size="sm" />
                <span className="dname"><Strikable on={soldOut}>{it.name}</Strikable></span>
                <span className="dots" aria-hidden="true" />
                {soldOut ? <span className="soldout-tag">{it.outOfStock ? 'hết kho' : 'hết'}</span> : <span className="dprice">{money(it.price)}</span>}
                {!soldOut && <Plus className="add" size={18} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      ))}
    </section>
  )
}

// ---------------------------------------------------------------- order column

function OrderColumn(props: {
  role?: string; branchId: number; selection: Selection; order?: OrderResponse; siblingOrders: OrderResponse[]
  onPickSibling: (id: number) => void; tableName?: string; menu: BranchMenuItemResponse[]
  draft: DraftLine[]; setDraft: (fn: (d: DraftLine[]) => DraftLine[]) => void
  onChanged: () => Promise<void> | void; onCreated: (o: OrderResponse) => void; onClosed: () => void
}) {
  const { selection, order, draft, setDraft, menu, branchId } = props
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [splitting, setSplitting] = useState(false)
  const [voidItemId, setVoidItemId] = useState<number | null>(null)
  const [voidReason, setVoidReason] = useState('')

  const [phone, setPhone] = useState('')
  const [customer, setCustomer] = useState<CustomerResponse | null>(null)
  const [newName, setNewName] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [points, setPoints] = useState(0)
  const [promo, setPromo] = useState('')
  const [promoCheck, setPromoCheck] = useState<PromotionCheckResponse | null>(null)

  const payment = useData(
    () => (order ? get<PaymentResponse>(`/payments/order/${order.id}`).catch(() => null) : Promise.resolve(null)),
    [order?.id, order?.totalAmount],
  )

  if (!selection) {
    return (
      <aside className="pos-order" aria-label="Đơn hàng">
        <Empty title="Chưa chọn bàn">Chạm vào một bàn trên sơ đồ, hoặc tạo đơn mang đi.</Empty>
      </aside>
    )
  }

  const priceOf = (id: number) => menu.find((m) => m.menuItemId === id)
  const draftSubtotal = draft.reduce((s, l) => s + (priceOf(l.menuItemId)?.price ?? 0) * l.quantity, 0)
  const paid    = payment.data?.status === 'PAID'
  const awaiting = order?.status === 'AWAITING_PAYMENT'
  const items   = order?.items ?? []
  const unfinished = items.filter((i) => i.status === 'PENDING' || i.status === 'COOKING' || i.status === 'READY')

  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true); setError(null)
    try { await action(); if (success) toast(success) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Có lỗi xảy ra') }
    finally { setBusy(false) }
  }

  // Send items for a specific course to kitchen
  const sendCourse = (course: Course) => {
    const courseItems = draft
      .filter((l) => l.course === course)
      .map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity }))
    if (courseItems.length === 0) return

    if (order) {
      run(async () => {
        await post(`/orders/${order.id}/items`, { items: courseItems })
        setDraft((d) => d.filter((x) => x.course !== course))
        await props.onChanged()
      }, `Đã gửi đợt ${COURSE_LABEL[course]} xuống bếp`)
    } else {
      run(async () => {
        const created = await post<OrderResponse>('/orders', {
          branchId,
          orderType: selection.kind === 'table' ? 'DINE_IN' : selection.kind === 'new' ? selection.type : 'TAKEAWAY',
          tableId: selection.kind === 'table' ? selection.tableId : undefined,
          customerId: customer?.id,
          promotionCode: promoCheck ? promo.trim() : undefined,
          pointsToUse: points > 0 ? points : undefined,
          items: courseItems,
        })
        props.onCreated(created)
        setDraft((d) => d.filter((x) => x.course !== course))
      }, `Đã tạo đơn & gửi đợt ${COURSE_LABEL[course]} xuống bếp`)
    }
  }

  const cancelItem = (item: OrderItemResponse) => run(async () => {
    await put(`/orders/${order!.id}/items/${item.id}/cancel`, { reason: 'Huỷ tại quầy' })
    await props.onChanged()
  }, `Đã huỷ ${item.itemName}`)

  const sendVoidRequest = (item: OrderItemResponse) => {
    if (!voidReason.trim()) { setError('Nhập lý do hủy để bếp nắm tình huống'); return }
    run(async () => {
      await put(`/orders/${order!.id}/items/${item.id}/void-request`, { reason: voidReason.trim() })
      setVoidItemId(null); setVoidReason('')
      await props.onChanged()
    }, `Đã gửi yêu cầu hủy ${item.itemName} — chờ bếp xử lý`)
  }

  const serveItem = (item: OrderItemResponse) => run(async () => {
    await put(`/kitchen/items/${item.id}/served`)
    await props.onChanged()
  }, `Đã bưng ${item.itemName}`)

  const complete = () => run(async () => {
    await put(`/orders/${order!.id}/complete`)
    props.onClosed()
  }, 'Đã hoàn tất đơn')

  const cancelOrder = async () => {
    if (!(await confirmDialog({ title: `Huỷ cả đơn ${order!.code}?`, message: 'Các món chưa phục vụ sẽ bị gỡ khỏi bếp.', confirmLabel: 'Huỷ đơn', cancelLabel: 'Giữ đơn', danger: true }))) return
    run(async () => {
      await put(`/orders/${order!.id}/cancel`)
      props.onClosed()
    }, 'Đã huỷ đơn')
  }

  const confirmTransfer = async () => {
    if (!(await confirmDialog({ title: 'Xác nhận đã nhận chuyển khoản?', message: `Đã thấy ${money(order!.totalAmount)} với nội dung ${order!.code} về tài khoản.`, confirmLabel: 'Đã nhận tiền' }))) return
    run(async () => {
      await post<PaymentResponse>('/payments', { orderId: order!.id, paymentMethod: 'BANK_TRANSFER' })
      await payment.reload()
      await props.onChanged()
    }, `Đã xác nhận chuyển khoản ${order!.code}, món xuống bếp`)
  }

  async function lookupCustomer() {
    setNotFound(false); setCustomer(null)
    try {
      setCustomer(await get<CustomerResponse>(`/customers/by-phone?phone=${encodeURIComponent(phone.trim())}`))
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotFound(true)
      else setError(e instanceof ApiError ? e.message : 'Không tra được khách')
    }
  }

  async function createCustomer() {
    await run(async () => {
      setCustomer(await post<CustomerResponse>('/customers', { fullName: newName.trim(), phone: phone.trim() }))
      setNotFound(false)
    }, 'Đã tạo khách')
  }

  async function checkPromo() {
    setPromoCheck(null)
    await run(async () => {
      setPromoCheck(await get<PromotionCheckResponse>(
        `/promotions/check?code=${encodeURIComponent(promo.trim())}&branchId=${branchId}&orderAmount=${draftSubtotal}`))
    })
  }

  const title = selection.kind === 'table' ? props.tableName ?? ''
    : order?.code ?? (selection.kind === 'new' ? ORDER_TYPE_LABEL[selection.type] : '')

  // Group existing items by course for display
  const groupedDraft = ([1, 2, 3] as Course[]).map((c) => ({
    course: c,
    lines: draft.filter((l) => l.course === c),
  })).filter((g) => g.lines.length > 0)

  return (
    <aside className="pos-order" aria-label="Đơn hàng">
      <div className="order-head">
        <div>
          {selection.kind === 'table'
            ? <div className="big"><UtensilsCrossed size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />Bàn {title}</div>
            : <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-20)' }}>{title}</div>}
          <div className="code">
            {order ? `${order.code} · ${ORDER_TYPE_LABEL[order.orderType!]} · mở lúc ${time(order.createdAt)}` : 'Đơn mới'}
          </div>
        </div>
        {paid && <Chip tone="ok"><Check size={14} aria-hidden="true" /> Đã thu tiền</Chip>}
      </div>

      {order?.guestName && (
        <div className={`web-guest${awaiting ? ' waiting' : ''}`}>
          <Globe size={16} aria-hidden="true" />
          <div>
            <strong>Đơn web · {order.guestName}</strong> · <span className="num">{order.guestPhone}</span>
            <div>{awaiting
              ? `Chờ thanh toán (${order.payMethod === 'BANK_TRANSFER' ? 'khách chọn chuyển khoản' : 'khách trả tiền mặt tại quầy'}). Bếp chỉ nhận đơn sau khi thu tiền.`
              : `Khách đã trả ${order.payMethod === 'BANK_TRANSFER' ? 'bằng chuyển khoản' : 'tiền mặt'}.`}</div>
          </div>
        </div>
      )}

      {props.siblingOrders.length > 1 && (
        <div className="row" style={{ padding: '8px 20px', borderBottom: '1px solid var(--rule)', fontSize: 'var(--fs-13)' }}>
          Bàn có {props.siblingOrders.length} đơn:
          {props.siblingOrders.map((o) => (
            <button key={o.id} className="btn btn-sm" onClick={() => props.onPickSibling(o.id!)} aria-pressed={o.id === order?.id}>{o.code?.split('-').pop()}</button>
          ))}
        </div>
      )}

      <div className="order-lines">
        {error && <div style={{ margin: '10px 0' }}><ErrorNotice message={error} /></div>}
        {items.length === 0 && draft.length === 0 && (
          <Empty title={order ? 'Đơn chưa có món' : 'Chưa gọi món'}>Chạm vào món trên bảng để thêm.</Empty>
        )}

        {/* ── Submitted items ── */}
        {items.map((it) => {
          const cancelled = it.status === 'CANCELLED'
          const voidPending = it.status === 'VOID_REQUESTED'
          const isEditingVoid = voidItemId === it.id
          return (
            <div key={it.id} className={`line${cancelled ? ' cancelled' : ''}${voidPending ? ' void-pending' : ''}`}>
              <span className="lname with-thumb">
                <DishThumb src={menu.find((m) => m.menuItemId === it.menuItemId)?.imageUrl} name={it.itemName} size="sm" />
                <Strikable on={cancelled}>{it.quantity} × {it.itemName}</Strikable>
              </span>
              <span className="lamt">{money(it.amount)}</span>
              <span className="lsub">
                <ItemStatus status={it.status} />
                {it.cancelReason && <span>· {it.cancelReason}</span>}
                {voidPending && it.voidReason && <span className="void-reason-tag">"{it.voidReason}"</span>}
                <span style={{ marginLeft: 'auto' }} className="row">
                  {it.status === 'READY' && !paid && (
                    <button className="btn btn-sm btn-accent" onClick={() => serveItem(it)} disabled={busy}>
                      <HandPlatter size={15} aria-hidden="true" /> Bưng ra
                    </button>
                  )}
                  {!paid && !awaiting && it.status === 'PENDING' && (
                    <button className="icon-btn" title="Huỷ món" aria-label={`Huỷ ${it.itemName}`} onClick={() => cancelItem(it)} disabled={busy}>
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                  {!paid && !awaiting && can.cancelCooking(props.role) && (it.status === 'COOKING' || it.status === 'READY') && (
                    <button className="icon-btn" title="Huỷ món (quản lý)" aria-label={`Huỷ ${it.itemName}`} onClick={() => cancelItem(it)} disabled={busy}>
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                  {!paid && !awaiting && !can.cancelCooking(props.role) && (it.status === 'COOKING' || it.status === 'READY') && (
                    <button className="btn btn-sm btn-ghost void-req-btn" title="Yêu cầu bếp xem xét hủy"
                      onClick={() => { setVoidItemId(it.id ?? null); setVoidReason('') }} disabled={busy || voidPending}>
                      {voidPending ? 'Đã gửi bếp' : <><AlertTriangle size={14} aria-hidden="true" /> Báo bếp hủy</>}
                    </button>
                  )}
                </span>
              </span>
              {isEditingVoid && (
                <div className="void-dialog">
                  <input className="input" placeholder="Lý do hủy (khách đổi ý, món lỗi…)" autoFocus
                    value={voidReason} onChange={(e) => setVoidReason(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendVoidRequest(it)} />
                  <div className="row">
                    <button className="btn btn-sm btn-danger" onClick={() => sendVoidRequest(it)} disabled={busy || !voidReason.trim()}>Gửi bếp</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setVoidItemId(null)}>Thôi</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* ── Draft grouped by course ── */}
        {groupedDraft.map(({ course, lines }) => (
          <div key={course} className="course-group">
            <div className="course-group-head">
              <span className="course-group-label">{COURSE_LABEL[course]}</span>
              <button
                className="btn btn-sm btn-accent course-send-btn"
                disabled={busy}
                onClick={() => sendCourse(course)}
              >
                <Send size={13} aria-hidden="true" />
                {order ? `Gửi đợt ${COURSE_LABEL[course]}` : `Tạo đơn & gửi ${COURSE_LABEL[course]}`}
              </button>
            </div>
            {lines.map((l) => {
              const m = priceOf(l.menuItemId)
              return (
                <div key={`${l.menuItemId}-${course}`} className="line">
                  <span className="lname with-thumb">
                    <DishThumb src={m?.imageUrl} name={m?.name} size="sm" />
                    {m?.name}
                  </span>
                  <span className="lamt">{money((m?.price ?? 0) * l.quantity)}</span>
                  <span className="lsub">
                    <Chip tone="warn">Chưa gửi bếp</Chip>
                    <span className="qty-btns" style={{ marginLeft: 'auto' }}>
                      <button className="icon-btn" aria-label="Bớt"
                        onClick={() => setDraft((d) => d.map((x) => x.menuItemId === l.menuItemId && x.course === course ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}>
                        <Minus size={16} />
                      </button>
                      <span className="num" style={{ minWidth: 24, textAlign: 'center', fontWeight: 'var(--fw-semibold)', color: 'var(--ink)' }}>{l.quantity}</span>
                      <button className="icon-btn" aria-label="Thêm"
                        onClick={() => setDraft((d) => d.map((x) => x.menuItemId === l.menuItemId && x.course === course ? { ...x, quantity: x.quantity + 1 } : x))}>
                        <Plus size={16} />
                      </button>
                      <button className="icon-btn" aria-label="Bỏ món"
                        onClick={() => setDraft((d) => d.filter((x) => !(x.menuItemId === l.menuItemId && x.course === course)))}>
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Customer / promo extras for new orders */}
      {!order && draft.length > 0 && (
        <div className="extras">
          <div className="row">
            <UserRound size={18} aria-hidden="true" className="muted" />
            {customer ? (
              <span style={{ flex: 1 }}><strong>{customer.fullName ?? customer.phone}</strong> · <span className="num">{customer.points}</span> điểm</span>
            ) : (
              <>
                <input className="input" inputMode="tel" placeholder="SĐT khách (tích điểm)" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lookupCustomer()} />
                <button className="btn btn-sm" onClick={lookupCustomer} disabled={!phone.trim()}><Search size={15} aria-hidden="true" /> Tra</button>
              </>
            )}
            {customer && <button className="btn btn-sm btn-ghost" onClick={() => { setCustomer(null); setPoints(0) }}>Đổi</button>}
          </div>
          {notFound && (
            <div className="row">
              <input className="input" placeholder="Tên khách mới" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <button className="btn btn-sm" onClick={createCustomer} disabled={!newName.trim() || busy}>Tạo khách</button>
            </div>
          )}
          {customer && (customer.points ?? 0) > 0 && (
            <label className="row" style={{ fontSize: 'var(--fs-14)' }}>
              Dùng điểm
              <input className="input num" type="number" min={0} max={customer.points} value={points}
                onChange={(e) => setPoints(Math.max(0, Math.min(customer.points ?? 0, Number(e.target.value))))}
                style={{ width: 100, flex: 'none' }} />
              <span className="muted">= {money(points * 1000)}</span>
            </label>
          )}
          <div className="row">
            <Ticket size={18} aria-hidden="true" className="muted" />
            <input className="input" placeholder="Mã khuyến mãi" value={promo}
              onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoCheck(null) }} />
            <button className="btn btn-sm" onClick={checkPromo} disabled={!promo.trim() || busy}>Áp mã</button>
          </div>
          {promoCheck && <div className="notice notice-ok" style={{ padding: '8px 12px' }}><Check size={16} aria-hidden="true" /> {promoCheck.name}: giảm {money(promoCheck.discount)}</div>}
        </div>
      )}

      <div className="pos-paybar">
      <MoneyProof order={order} draftSubtotal={draftSubtotal} draftDiscount={promoCheck?.discount ?? 0} draftPoints={points} />

      {paying && order && !paid ? (
        <PayPanel
          total={order.totalAmount ?? 0}
          branchId={branchId}
          orderCode={order.code ?? String(order.id)}
          allowTransfer={order.orderType === 'DINE_IN' || order.orderType === 'TAKEAWAY'}
          busy={busy}
          onCancel={() => setPaying(false)}
          onPay={(method, cash) => run(async () => {
            const p = await post<PaymentResponse>('/payments', {
              orderId: order.id,
              paymentMethod: method,
              ...(method === 'CASH' ? { cashReceived: cash } : {}),
            })
            setPaying(false)
            await payment.reload()
            await props.onChanged()
            toast(method === 'BANK_TRANSFER'
              ? `Đã ghi nhận chuyển khoản ${money(p.amount)}`
              : `Đã thu ${money(p.cashReceived)} — thối ${money(p.changeAmount)}`)
          })}
        />
      ) : (
        <>
        {splitting && order && (
          <SplitModal
            order={order}
            onClose={() => setSplitting(false)}
          />
        )}
        <div className="order-actions">
          {/* Only show legacy "Gửi bếp all" if there are no courses in draft */}
          {draft.length === 0 && order && !paid && !can.cash(props.role) && (
            <div className="notice notice-ok">{awaiting ? 'Đơn web chờ thu ngân thu tiền.' : 'Gọi món xong. Khách thanh toán tiền mặt tại quầy thu ngân.'}</div>
          )}
          {order && awaiting && order.payMethod === 'BANK_TRANSFER' && (
            <>
              <button className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={confirmTransfer}>
                <Landmark size={18} aria-hidden="true" /> Đã nhận chuyển khoản · <span className="num">{money(order.totalAmount)}</span>
              </button>
              <button className="btn btn-block" disabled={busy} onClick={() => setPaying(true)}>
                <Wallet size={16} aria-hidden="true" /> Khách trả tiền mặt thay
              </button>
            </>
          )}
          {order && !paid && !awaiting && can.cash(props.role) && draft.length === 0 && (
            <button className="btn btn-primary btn-lg btn-block" onClick={() => setPaying(true)} disabled={busy || (order.totalAmount ?? 0) < 0}>
              <Wallet size={18} aria-hidden="true" /> Thanh toán hóa đơn · <span className="num">{money(order.totalAmount)}</span>
            </button>
          )}
          {order && paid && can.cash(props.role) && (
            <button className="btn btn-primary btn-lg btn-block" onClick={complete} disabled={busy || unfinished.length > 0}>
              <Check size={18} aria-hidden="true" /> {unfinished.length > 0 ? `Còn ${unfinished.length} món chưa bưng` : 'Hoàn tất đơn, trả bàn'}
            </button>
          )}
          {order && !paid && can.cash(props.role) && items.length > 0 && (
            <button className="btn btn-block" onClick={() => setSplitting(true)} disabled={busy}>
              <Scissors size={16} aria-hidden="true" /> Chia hóa đơn
            </button>
          )}
          {order && !paid && can.cash(props.role) && (
            <button className="btn btn-danger btn-block" onClick={cancelOrder} disabled={busy}>Huỷ đơn</button>
          )}
          {payment.data && paid && (
            <div className="muted num" style={{ fontSize: 'var(--fs-13)', textAlign: 'center' }}>
              {payment.data.method === 'BANK_TRANSFER'
                ? `Đã nhận chuyển khoản ${money(payment.data.amount)}`
                : `Khách đưa ${money(payment.data.cashReceived)} · thối ${money(payment.data.changeAmount)}`}
            </div>
          )}
        </div>
        </>
      )}
      </div>
    </aside>
  )
}

function ItemStatus({ status }: { status?: string }) {
  const tone = status === 'READY' ? 'warn' : status === 'SERVED' ? 'ok' : status === 'COOKING' ? 'info' : 'neutral'
  return <Chip tone={tone}>{ITEM_STATUS_LABEL[status ?? ''] ?? status}</Chip>
}

function MoneyProof({ order, draftSubtotal, draftDiscount, draftPoints }: {
  order?: OrderResponse; draftSubtotal: number; draftDiscount: number; draftPoints: number
}) {
  if (!order && draftSubtotal === 0) return null
  if (!order) {
    return (
      <div className="money-proof">
        <div className="mrow"><span>Tạm tính</span><span>{money(draftSubtotal)}</span></div>
        {draftDiscount > 0 && <div className="mrow minus"><span>Khuyến mãi</span><span>−{money(draftDiscount)}</span></div>}
        {draftPoints > 0 && <div className="mrow minus"><span>Điểm ({draftPoints})</span><span>−{money(draftPoints * 1000)}</span></div>}
        <div className="mrow"><span>VAT</span><span>tính khi gửi bếp</span></div>
      </div>
    )
  }
  return (
    <div className="money-proof">
      <div className="mrow"><span>Tạm tính</span><span>{money(order.subtotal)}</span></div>
      {(order.discountAmount ?? 0) > 0 && <div className="mrow minus"><span>Khuyến mãi</span><span>−{money(order.discountAmount)}</span></div>}
      {(order.pointsUsed ?? 0) > 0 && <div className="mrow minus"><span>Điểm ({order.pointsUsed})</span><span>−{money(order.pointsDiscount)}</span></div>}
      <div className="mrow"><span>VAT</span><span>+{money(order.vatAmount)}</span></div>
      <div className="total"><span>Tổng</span><strong className="num"><Counter value={money(order.totalAmount)} size="sm" /></strong></div>
    </div>
  )
}

function PayPanel({ total, branchId, orderCode, allowTransfer, busy, onPay, onCancel }: {
  total: number
  branchId: number
  orderCode: string
  allowTransfer: boolean
  busy: boolean
  onPay: (method: 'CASH' | 'BANK_TRANSFER', cash?: number) => void
  onCancel: () => void
}) {
  const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH')
  const [cash, setCash] = useState<number>(0)
  const [transferQrUrl, setTransferQrUrl] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const change = cash - total
  const suggestions = [total, ...QUICK_CASH.filter((v) => v > total)].slice(0, 6)

  useEffect(() => {
    if (method !== 'BANK_TRANSFER') return
    let current = true
    setQrLoading(true)
    setTransferQrUrl('')
    get<TransferQrSetting>(`/public/branches/${branchId}/transfer-qr?amount=${total}&reference=${encodeURIComponent(orderCode)}`)
      .then((result) => { if (current) setTransferQrUrl(mediaUrl(result.url)) })
      .catch(() => { if (current) setTransferQrUrl('') })
      .finally(() => { if (current) setQrLoading(false) })
    return () => { current = false }
  }, [method, branchId, total, orderCode])

  return (
    <div className="pay">
      {allowTransfer && (
        <div className="seg" role="group" aria-label="Phương thức thanh toán">
          <button type="button" aria-pressed={method === 'CASH'} onClick={() => setMethod('CASH')}>
            <Wallet size={15} aria-hidden="true" /> Tiền mặt
          </button>
          <button type="button" aria-pressed={method === 'BANK_TRANSFER'} onClick={() => setMethod('BANK_TRANSFER')}>
            <Landmark size={15} aria-hidden="true" /> Chuyển khoản
          </button>
        </div>
      )}
      {method === 'CASH' ? (
        <>
          <label className="field">
            Khách đưa (tiền mặt)
            <input className="input num" type="number" min={0} step={1000} autoFocus value={cash || ''} onChange={(e) => setCash(Number(e.target.value))} />
          </label>
          <div className="quick-cash">
            {suggestions.map((v, i) => (
              <button key={i} className="btn" aria-pressed={cash === v} onClick={() => setCash(v)}>{i === 0 ? 'Vừa đủ' : money(v)}</button>
            ))}
          </div>
          <div className={`change${change < 0 ? ' short' : ''}`} aria-live="polite">
            <span>{change < 0 ? 'Còn thiếu' : 'Tiền thối'}</span>
            <strong className="num">{money(Math.abs(change))}</strong>
          </div>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => onPay('CASH', cash)} disabled={busy || cash < total}>
            <Wallet size={18} aria-hidden="true" /> Xác nhận đã thu {money(cash)}
          </button>
        </>
      ) : (
        <>
          <div className="pay-transfer-qr">
            {qrLoading
              ? <span className="muted">Đang tải mã QR…</span>
              : transferQrUrl
                ? <img className="transfer-qr" src={transferQrUrl} alt={`Mã QR chuyển ${money(total)} cho đơn ${orderCode}`} onError={() => setTransferQrUrl('')} />
                : <span className="muted">Chi nhánh chưa cài mã QR chuyển khoản.</span>}
            <span className="muted">Nội dung chuyển khoản: <strong className="num">{orderCode}</strong></span>
          </div>
          <div className="notice notice-warn" role="note">
            Chỉ xác nhận sau khi kiểm tra giao dịch đã vào tài khoản nhà hàng.
          </div>
          <div className="change">
            <span>Khách cần chuyển</span>
            <strong className="num">{money(total)}</strong>
          </div>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => onPay('BANK_TRANSFER')} disabled={busy || qrLoading || !transferQrUrl}>
            <Landmark size={18} aria-hidden="true" /> Xác nhận đã nhận chuyển khoản
          </button>
        </>
      )}
      <button className="btn btn-ghost btn-block" onClick={onCancel}>Quay lại</button>
    </div>
  )
}

// ---------------------------------------------------------------- split modal

type SplitMode = 'even' | 'items'

function SplitModal({ order, onClose }: { order: OrderResponse; onClose: () => void }) {
  const activeItems = (order.items ?? []).filter((i) => i.status !== 'CANCELLED')
  const [mode, setMode] = useState<SplitMode>('even')
  const [people, setPeople] = useState(2)
  const [assignments, setAssignments] = useState<Record<number, Set<number>>>(() => {
    const map: Record<number, Set<number>> = {}
    for (let i = 1; i <= 8; i++) map[i] = new Set()
    return map
  })

  const evenAmount = Math.ceil((order.totalAmount ?? 0) / people)

  function assignItem(itemId: number, personIdx: number) {
    setAssignments((prev) => {
      const next: Record<number, Set<number>> = {}
      for (const k in prev) next[k] = new Set(prev[k])
      if (next[personIdx].has(itemId)) next[personIdx].delete(itemId)
      else { for (const k in next) next[k].delete(itemId); next[personIdx].add(itemId) }
      return next
    })
  }

  function personTotal(idx: number): number {
    return activeItems
      .filter((it) => assignments[idx]?.has(it.id!))
      .reduce((s, it) => s + (it.amount ?? 0), 0)
  }

  const unassigned = activeItems.filter((it) => !Object.values(assignments).some((s) => s.has(it.id!)))

  return (
    <div className="split-overlay" role="dialog" aria-modal="true" aria-label="Chia hóa đơn">
      <div className="split-card">
        <div className="split-head">
          <div>
            <strong>Chia hóa đơn</strong>
            <div className="split-code">{order.code} · {money(order.totalAmount)}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={18} /></button>
        </div>

        <div className="seg" role="group" aria-label="Kiểu chia" style={{ margin: '12px 16px 0' }}>
          <button aria-pressed={mode === 'even'} onClick={() => setMode('even')}>Chia đều</button>
          <button aria-pressed={mode === 'items'} onClick={() => setMode('items')}>Chia theo món</button>
        </div>

        {mode === 'even' ? (
          <div className="split-body">
            <label className="split-people-row">
              <span>Số người</span>
              <div className="bk-stepper">
                <button className="bk-step-btn" onClick={() => setPeople((p) => Math.max(2, p - 1))}>−</button>
                <span className="bk-step-val">{people}</span>
                <button className="bk-step-btn" onClick={() => setPeople((p) => Math.min(10, p + 1))}>+</button>
              </div>
            </label>
            <div className="split-result-list">
              {Array.from({ length: people }, (_, i) => (
                <div key={i} className="split-person-row">
                  <span>Người {i + 1}</span>
                  <strong className="num">{money(evenAmount)}</strong>
                </div>
              ))}
            </div>
            {(order.totalAmount ?? 0) % people !== 0 && (
              <div className="split-rounding">Làm tròn lên — người cuối trả {money(order.totalAmount ?? 0 - evenAmount * (people - 1))}</div>
            )}
          </div>
        ) : (
          <div className="split-body">
            <label className="split-people-row">
              <span>Số người</span>
              <div className="bk-stepper">
                <button className="bk-step-btn" onClick={() => setPeople((p) => Math.max(2, p - 1))}>−</button>
                <span className="bk-step-val">{people}</span>
                <button className="bk-step-btn" onClick={() => setPeople((p) => Math.min(8, p + 1))}>+</button>
              </div>
            </label>
            <div className="split-item-list">
              {activeItems.map((it) => {
                const owner = Object.entries(assignments).find(([, s]) => s.has(it.id!))?.[0]
                return (
                  <div key={it.id} className="split-item-row">
                    <span className="split-item-name">{it.quantity}× {it.itemName}</span>
                    <span className="split-item-price">{money(it.amount)}</span>
                    <div className="split-item-btns">
                      {Array.from({ length: people }, (_, i) => (
                        <button key={i}
                          className={`split-person-btn${owner === String(i + 1) ? ' on' : ''}`}
                          onClick={() => assignItem(it.id!, i + 1)}
                          aria-pressed={owner === String(i + 1)}
                        >{i + 1}</button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {unassigned.length > 0 && (
              <div className="split-warn"><AlertTriangle size={14} aria-hidden="true" /> {unassigned.length} món chưa gán cho ai</div>
            )}
            <div className="split-result-list" style={{ marginTop: 8 }}>
              {Array.from({ length: people }, (_, i) => (
                <div key={i} className="split-person-row">
                  <span>Người {i + 1}</span>
                  <strong className="num">{money(personTotal(i + 1))}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
          <button className="btn btn-primary btn-block" onClick={onClose}>Đóng — thu tiền bình thường</button>
        </div>
      </div>
    </div>
  )
}

function ReadyMadeStock({ items, branchId, onChanged }: { items: BranchMenuItemResponse[]; branchId: number; onChanged: () => Promise<void> }) {
  const toast = useToast()
  const [busy, setBusy] = useState<number | null>(null)
  async function toggle(m: BranchMenuItemResponse) {
    setBusy(m.menuItemId!)
    try {
      await put(`/branches/${branchId}/menu/${m.menuItemId}/availability`, { available: !m.available })
      await onChanged()
      toast(m.available ? `Đã báo hết ${m.name}` : `${m.name} bán lại`)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không cập nhật được', true)
    } finally {
      setBusy(null)
    }
  }
  return (
    <section className="ready-made panel panel-pad" aria-label="Món có sẵn">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>Đồ uống & món có sẵn</strong>
        <span className="muted" style={{ fontSize: 'var(--fs-13)' }}>Bấm để báo hết / bán lại. Món gắn kho tự hết khi kho hết.</span>
      </div>
      {items.length === 0 ? <span className="muted">Chưa có món nào được đặt là "Có sẵn" trong Menu chung.</span> : (
        <div className="row">
          {items.map((m) => (
            <button key={m.menuItemId} className="chip-toggle on-light" aria-pressed={!m.available} disabled={busy === m.menuItemId || m.outOfStock}
              title={m.outOfStock ? 'Hết trong kho: nhập thêm hàng ở Kho' : m.available ? 'Bấm để báo hết' : 'Bấm để bán lại'} onClick={() => toggle(m)}>
              <DishThumb src={m.imageUrl} name={m.name} size="sm" />
              <Strikable on={!m.available}>{m.name}</Strikable>
              {m.outOfStock && <span className="state state-bad">hết kho</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
