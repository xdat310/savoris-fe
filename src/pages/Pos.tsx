import { AlertTriangle, Ban, Bell, Check, Clock, CupSoda, Globe, HandPlatter, Landmark, Minus, Plus, Search, Send, ShoppingBag, Ticket, Trash2, UtensilsCrossed, UserRound, Wallet, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ApiError, get, post, put } from '../api/client'
import type {
  AreaResponse, BranchLoadResponse, BranchMenuItemResponse, CustomerResponse, MenuCategoryResponse, OrderItemResponse,
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
import { countPosTableStates, filterPosMenu, filterPosTables, getOverdueReadyDishes, getPosTableState, type PosTableFilter } from '../lib/pos-logic'
import './pos.css'

type Selection =
  | { kind: 'table'; tableId: number }
  | { kind: 'order'; orderId: number }
  | { kind: 'new'; type: 'TAKEAWAY' | 'DELIVERY' }
  | null

interface DraftLine { menuItemId: number; quantity: number; notes: string }
const QUICK_CASH = [500000, 1000000]

export function Pos() {
  const { branchId, role, branches } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState<'floor' | 'takeaway'>('floor')
  const [selection, setSelection] = useState<Selection>(null)
  const [draft, setDraft] = useState<DraftLine[]>([])
  const [flashReadyTables, setFlashReadyTables] = useState<Set<number>>(new Set())
  const [tableFilter, setTableFilter] = useState<PosTableFilter>('ALL')
  const [tableSearch, setTableSearch] = useState('')
  const [menuSearch, setMenuSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null)
  const [selectedArea, setSelectedArea] = useState<number | 'ALL'>('ALL')
  const [viewBranchId, setViewBranchId] = useState(branchId)

  const tables = useData(() => get<TableResponse[]>(`/branches/${branchId}/tables`), [branchId], 10000)
  const areas = useData(() => get<AreaResponse[]>(`/branches/${branchId}/areas`), [branchId], 30000)
  const orders = useData(() => get<OrderResponse[]>(`/orders/branch/${branchId}`), [branchId], 8000)
  const menu   = useData(() => get<BranchMenuItemResponse[]>(`/branches/${branchId}/menu`), [branchId], 30000)
  const categories = useData(() => get<MenuCategoryResponse[]>('/menu-categories/search?q='), [])
  const load   = useData(() => get<BranchLoadResponse>(`/kitchen/branches/${branchId}/load`), [branchId], 15000)
  const branchDataReady = viewBranchId === branchId && !tables.loading && !areas.loading && !orders.loading

  const openOrders = useMemo(() => (orders.data ?? []).filter((order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED'), [orders.data])
  const servedOrders = useMemo(() => openOrders.filter((order) => {
    const live = (order.items ?? []).filter((item) => item.status !== 'CANCELLED')
    return live.length > 0 && live.every((item) => item.status === 'SERVED')
  }), [openOrders])
  const tablePayments = useData(() => Promise.all(servedOrders.filter((order) => order.id != null).map(async (order) => {
    try {
      const payment = await get<PaymentResponse>(`/payments/order/${order.id}`)
      return [order.id!, payment?.status ?? 'PENDING'] as const
    } catch (error) {
      return [order.id!, error instanceof ApiError && error.status === 404 ? 'PENDING' : 'UNKNOWN'] as const
    }
  })).then((entries) => new Map(entries)), [servedOrders.map((order) => `${order.id}:${order.updatedAt ?? ''}`).join('|')], 15000)

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

  useEffect(() => {
    setViewBranchId(branchId)
    setSelection(null)
    setDraft([])
    setMenuOpen(false)
    setSelectedFloor(null)
    setSelectedArea('ALL')
    setTableFilter('ALL')
    setTableSearch('')
  }, [branchId])

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
  const selectedTable = selection?.kind === 'table' ? tables.data?.find((table) => table.id === selection.tableId) : undefined
  const selectedAreaInfo = areas.data?.find((area) => area.id === selectedTable?.areaId)

  function select(next: Selection) { setSelection(next); setDraft(() => []); setMenuOpen(false) }

  function addDish(item: BranchMenuItemResponse) {
    if (!selection) { toast('Chọn bàn hoặc tạo đơn mang đi trước', true); return }
    setDraft((d) => {
      const existing = d.find((line) => line.menuItemId === item.menuItemId)
      return existing
        ? d.map((line) => line.menuItemId === item.menuItemId ? { ...line, quantity: line.quantity + 1 } : line)
        : [...d, { menuItemId: item.menuItemId!, quantity: 1, notes: '' }]
    })
  }

  async function refreshAll() {
    await Promise.all([orders.reload(), tables.reload(), load.reload(), menu.reload(), areas.reload()])
  }

  const takeawayPaused = load.data && !load.data.acceptingTakeaway
  const [stockPanel, setStockPanel] = useState(false)
  const readyMadeOut = (menu.data ?? []).filter((m) => !m.needsKitchen && !m.available).length
  const waitingWeb = openOrders.filter((o) => o.status === 'AWAITING_PAYMENT').length
  const overdueReadyDishes = getOverdueReadyDishes(openOrders)
  const branchName = branches.find((branch) => branch.id === branchId)?.name ?? `Chi nhánh #${branchId ?? '—'}`

  return (
    <div className="pos">
      <div className="pos-toolbar">
          <div className="seg" role="group" aria-label="Loại đơn">
            <button aria-pressed={mode === 'floor'} onClick={() => setMode('floor')}>Tại bàn</button>
            <button aria-pressed={mode === 'takeaway'} onClick={() => setMode('takeaway')}>
              Mang đi · Giao hàng
              {waitingWeb > 0 && <span className="seg-badge" aria-label={`${waitingWeb} đơn web chờ thanh toán`}>{waitingWeb}</span>}
            </button>
          </div>
          <button className="btn btn-accent" disabled={!!takeawayPaused}
            onClick={() => { setMode('takeaway'); select({ kind: 'new', type: 'TAKEAWAY' }) }}>
            <ShoppingBag size={16} aria-hidden="true" /> Tạo đơn mang đi
          </button>
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

      <div className="pos-notices">
        <ReadyDishAlerts alerts={overdueReadyDishes} tableName={(id) => tables.data?.find((table) => table.id === id)?.name ?? `#${id}`}
          onOpen={(orderId) => { setMode('floor'); select({ kind: 'order', orderId }) }} />
        <GuestOrderAlerts alerts={guestOrders.alerts} onDismiss={guestOrders.dismiss}
          tableName={(id) => `Bàn ${tables.data?.find((t) => t.id === id)?.name ?? ''}`.trim()}
          onOpen={(tableId) => { setMode('floor'); select({ kind: 'table', tableId }) }} />
        <TakeawayAlerts alerts={reminders.alerts} onDismiss={reminders.dismiss} onRefunded={refunded} settling={settling}
          onOpen={(orderId) => { setMode('takeaway'); select({ kind: 'order', orderId }) }} />
        {stockPanel && (
          <ReadyMadeStock items={(menu.data ?? []).filter((m) => !m.needsKitchen)} branchId={branchId!} canToggle={can.manage(role)} onChanged={menu.reload} />
        )}
      </div>

      <section className="pos-left" aria-label={mode === 'floor' ? 'Chọn bàn' : 'Đơn mang đi'}>
        {!branchDataReady ? <Loading label={`Đang tải dữ liệu ${branchName}…`} /> : mode === 'floor' ? (
          <FloorPlan
            branchName={branchName}
            tables={tables.data}
            areas={areas.data}
            areasError={areas.error}
            error={tables.error}
            ordersByTable={ordersByTable}
            flashReadyTables={flashReadyTables}
            paymentStatus={tablePayments.data}
            tableFilter={tableFilter}
            onTableFilter={setTableFilter}
            tableSearch={tableSearch}
            onTableSearch={setTableSearch}
            selectedTable={selection?.kind === 'table' ? selection.tableId ?? undefined : undefined}
            onSelect={(tableId) => select({ kind: 'table', tableId })}
            selectedFloor={selectedFloor}
            onSelectFloor={(floor) => { setSelectedFloor(floor); setSelectedArea('ALL') }}
            selectedArea={selectedArea}
            onSelectArea={setSelectedArea}
          />
        ) : (
          <TakeawayList
            orders={openOrders.filter((o) => o.orderType !== 'DINE_IN')}
            paused={!!takeawayPaused}
            wait={load.data?.estimatedWaitMinutes ?? undefined}
            selected={selection}
            onNew={(type) => select({ kind: 'new', type })}
            onSelect={(orderId) => select({ kind: 'order', orderId })}
          />
        )}
      </section>

      {selection && branchDataReady && <OrderColumn
        key={selection ? JSON.stringify(selection) + (currentOrder?.id ?? '') : 'none'}
        role={role}
        branchId={branchId!}
        selection={selection}
        order={currentOrder}
        siblingOrders={tableOrders}
        onPickSibling={(orderId) => select({ kind: 'order', orderId })}
        tableName={selection?.kind === 'table' ? tables.data?.find((t) => t.id === selection.tableId)?.name : undefined}
        tableCapacity={selectedTable?.capacity}
        tableArea={selectedAreaInfo?.name}
        tableFloor={selectedAreaInfo?.floorName}
        onDismiss={() => select(null)}
        onOpenMenu={() => { setMenuOpen(true); setMenuSearch('') }}
        menu={menu.data ?? []}
        draft={draft}
        setDraft={setDraft}
        onChanged={refreshAll}
        onCreated={(order) => {
          refreshAll()
          if (order.orderType !== 'DINE_IN') setSelection({ kind: 'order', orderId: order.id! })
        }}
        onClosed={() => { refreshAll(); select(null) }}
      />}

      {menuOpen && selection && branchDataReady && (
        <section className="pos-menu-overlay" aria-label="Thực đơn">
          <div className="pos-menu-overlay-head">
            <strong>Chọn món · {selection.kind === 'table' ? `Bàn ${selectedTable?.name ?? ''}` : 'Đơn mới'}</strong>
            <button className="btn btn-ghost" onClick={() => setMenuOpen(false)} aria-label="Đóng thực đơn">Đóng</button>
          </div>
          <MenuBoard items={menu.data} categories={categories.data} error={menu.error} onAdd={addDish}
            disabled={currentOrder?.status === 'AWAITING_PAYMENT'} search={menuSearch} onSearch={setMenuSearch} />
        </section>
      )}
    </div>
  )
}

function ReadyDishAlerts({ alerts, tableName, onOpen }: {
  alerts: ReturnType<typeof getOverdueReadyDishes>
  tableName: (tableId: number) => string
  onOpen: (orderId: number) => void
}) {
  if (alerts.length === 0) return null
  return (
    <section className="takeaway-alerts" aria-live="polite" aria-label="Món chờ bưng quá lâu">
      {alerts.map(({ order, item, minutes }) => (
        <div key={`${order.id}-${item.id}`} className="t-alert t-alert-uncollected">
          <Clock size={18} aria-hidden="true" />
          <div className="t-alert-text">
            <strong>{item.itemName} · Bàn {tableName(order.tableId!)} chờ bưng {minutes} phút</strong>
            <span>Món đã sẵn sàng nhưng chưa được xác nhận đã bưng.</span>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => onOpen(order.id!)}>Mở đơn</button>
        </div>
      ))}
    </section>
  )
}

// ---------------------------------------------------------------- floor plan

function FloorPlan({ branchName, tables, areas, areasError, error, ordersByTable, flashReadyTables, paymentStatus, tableFilter, onTableFilter, tableSearch, onTableSearch, selectedTable, onSelect, selectedFloor, onSelectFloor, selectedArea, onSelectArea }: {
  branchName: string
  tables?: TableResponse[]
  areas?: AreaResponse[]
  areasError: string | null
  error: string | null
  ordersByTable: Map<number, OrderResponse[]>
  flashReadyTables: Set<number>
  paymentStatus?: ReadonlyMap<number, string>
  tableFilter: PosTableFilter
  onTableFilter: (filter: PosTableFilter) => void
  tableSearch: string
  onTableSearch: (search: string) => void
  selectedTable?: number
  onSelect: (id: number) => void
  selectedFloor: string | null
  onSelectFloor: (floor: string) => void
  selectedArea: number | 'ALL'
  onSelectArea: (area: number | 'ALL') => void
}) {
  if (error) return <ErrorNotice message={error} />
  if (!tables) return <Loading label="Đang tải sơ đồ bàn…" />
  if (tables.length === 0) return <Empty title="Chi nhánh chưa có bàn">Quản lý cần tạo khu vực và bàn.</Empty>
  if (areasError) return <ErrorNotice message={areasError} />
  if (!areas) return <Loading label="Đang tải tầng và khu vực…" />

  const areaById = new Map(areas.map((area) => [area.id, area]))
  const floors = [...new Map(areas.map((area) => [area.floorName ?? area.name ?? '', {
    name: area.floorName ?? area.name ?? 'Tầng', order: area.floorSortOrder ?? 999,
  }])).values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'vi'))
  const activeFloor = floors.find((floor) => floor.name === selectedFloor)?.name ?? floors[0]?.name
  const floorAreas = areas.filter((area) => (area.floorName ?? area.name) === activeFloor)
  const floorAreaIds = new Set(floorAreas.map((area) => area.id))
  const floorTables = tables.filter((table) => floorAreaIds.has(table.areaId))
  const visibleTables = filterPosTables(floorTables, ordersByTable, tableFilter, tableSearch, paymentStatus)
    .filter((table) => selectedArea === 'ALL' || table.areaId === selectedArea)
  const counts = countPosTableStates(tables, ordersByTable, paymentStatus)
  const floorCounts = countPosTableStates(floorTables, ordersByTable, paymentStatus)
  const filterLabels: Record<PosTableFilter, string> = {
    ALL: 'Tất cả', EMPTY: 'Trống', SERVING: 'Đang phục vụ', READY: 'Có món ra', SERVED: 'Đã lên đủ món', WAITING_PAYMENT: 'Chờ thanh toán', RESERVED: 'Đã đặt', CLEANING: 'Đang dọn',
  }
  const stateLabels = { EMPTY: 'Trống', SERVING: 'Đang phục vụ', READY: 'Có món ra', SERVED: 'Đã lên đủ món', WAITING_PAYMENT: 'Chờ thanh toán', RESERVED: 'Đã đặt', CLEANING: 'Đang dọn' } as const
  const areaGroups = new Map<number, TableResponse[]>()
  for (const table of visibleTables) areaGroups.set(table.areaId!, [...(areaGroups.get(table.areaId!) ?? []), table])
  const allKitchenPortions = [...ordersByTable.values()].flat().reduce((sum, order) => sum + (order.items ?? [])
    .filter((item) => item.status === 'PENDING' || item.status === 'COOKING').reduce((quantity, item) => quantity + (item.quantity ?? 0), 0), 0)
  const openTableCount = [...ordersByTable.keys()].filter((tableId) => (ordersByTable.get(tableId) ?? []).length > 0).length

  return (
    <div className="floor-areas">
      <header className="pos-floor-header">
        <div><span className="pos-kicker">BÁN HÀNG / SƠ ĐỒ BÀN</span><h1>{branchName}</h1></div>
        <label className="pos-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Tìm bàn</span>
          <input aria-label="Tìm bàn" placeholder="Tìm bàn…" value={tableSearch} onChange={(event) => onTableSearch(event.target.value)} />
        </label>
      </header>
      <div className="pos-table-stats" aria-label="Tổng hợp bàn">
        <div><span>TỔNG BÀN</span><strong>{tables.length}</strong></div>
        <div><span>TRỐNG</span><strong className="is-empty">{counts.EMPTY}</strong></div>
        <div><span>ĐANG PHỤC VỤ</span><strong className="is-serving">{counts.SERVING}</strong></div>
        <div><span>CÓ MÓN READY</span><strong className="is-ready">{counts.READY}</strong></div>
        <div><span>CHỜ THANH TOÁN</span><strong className="is-payment">{counts.WAITING_PAYMENT}</strong></div>
        <div><span>PHẦN CẦN LÀM</span><strong>{allKitchenPortions}</strong></div>
        <div><span>ĐƠN ĐANG MỞ</span><strong>{openTableCount}</strong></div>
      </div>
      <div className="pos-table-tools">
        <div className="pos-table-filters" role="group" aria-label="Lọc bàn">
          {(Object.keys(filterLabels) as PosTableFilter[]).map((key) => (
            <button key={key} className={`pos-filter${tableFilter === key ? ' is-active' : ''}`} aria-pressed={tableFilter === key} onClick={() => onTableFilter(key)}>
              {filterLabels[key]} <span>{floorCounts[key]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="pos-floor-tabs" role="tablist" aria-label="Chọn tầng">
        {floors.map((floor) => <button key={floor.name} role="tab" aria-selected={activeFloor === floor.name}
          className={activeFloor === floor.name ? 'is-active' : ''} onClick={() => onSelectFloor(floor.name)}>
          {floor.name}<span>{tables.filter((table) => areas.some((area) => area.id === table.areaId && (area.floorName ?? area.name) === floor.name)).length}</span>
        </button>)}
      </div>
      <div className="pos-area-tabs" role="group" aria-label="Lọc khu vực">
        <button aria-pressed={selectedArea === 'ALL'} className={selectedArea === 'ALL' ? 'is-active' : ''} onClick={() => onSelectArea('ALL')}>Tất cả khu</button>
        {floorAreas.map((area) => <button key={area.id} aria-pressed={selectedArea === area.id} className={selectedArea === area.id ? 'is-active' : ''}
          onClick={() => onSelectArea(area.id!)}>{area.name}</button>)}
      </div>
      {visibleTables.length === 0 && <Empty title="Không tìm thấy bàn phù hợp">Thử đổi tầng, khu vực, trạng thái hoặc từ khóa.</Empty>}
      {[...areaGroups.entries()].map(([areaId, list]) => (
        <section key={areaId} className="pos-area-section">
          <div className="pos-area-heading"><h2 className="area-title">{areaById.get(areaId)?.name ?? 'Khu vực'}</h2><span>{list.length} bàn</span></div>
          <div className="floor pos-table-grid">
            {[...list].sort((a, b) => (a.positionY ?? 0) - (b.positionY ?? 0) || (a.positionX ?? 0) - (b.positionX ?? 0) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((t) => {
              const open     = ordersByTable.get(t.id!) ?? []
              const occupied = open.length > 0 || t.status === 'OCCUPIED'
              const total    = open.reduce((s, o) => s + (o.totalAmount ?? 0), 0)
              const state = getPosTableState(t, open, paymentStatus)
              const hasReady = state === 'READY' || flashReadyTables.has(t.id!)
              const tileState = state.toLowerCase()
              const stateLabel = stateLabels[state]
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

function MenuBoard({ items, categories, error, onAdd, disabled, search, onSearch }: {
  items?: BranchMenuItemResponse[]; categories?: MenuCategoryResponse[]; error: string | null
  onAdd: (item: BranchMenuItemResponse) => void; disabled: boolean
  search: string; onSearch: (value: string) => void
}) {
  if (error) return <ErrorNotice message={error} />
  if (!items) return <Loading label="Đang tải menu…" />
  const filteredItems = filterPosMenu(items, 'ALL', search)
  const groups = new Map<number, BranchMenuItemResponse[]>()
  for (const it of filteredItems) groups.set(it.categoryId!, [...(groups.get(it.categoryId!) ?? []), it])
  const catName = (id: number) => categories?.find((c) => c.id === id)?.name ?? 'Món'

  return (
    <section className="menu-board" id="menu-board" aria-label="Menu chi nhánh">
      <h3>
        <span className="board-title">Thực đơn</span>
        {disabled && <span style={{ fontSize: 'var(--fs-13)', fontWeight: 'var(--fw-medium)' }}>Chọn bàn để gọi món</span>}
      </h3>
      <label className="pos-search pos-menu-search">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">Tìm món</span>
        <input aria-label="Tìm món" placeholder="Tìm món…" value={search} onChange={(event) => onSearch(event.target.value)} />
      </label>
      {filteredItems.length === 0 && <Empty title="Không có món phù hợp">Thử đổi từ khóa tìm món.</Empty>}
      {[...groups.entries()].map(([catId, list]) => (
        <div key={catId}>
          <div className="menu-cat">{catName(catId)}</div>
          {list.map((it) => {
            const soldOut = it.available === false || it.outOfStock === true
            const unknownAvailability = it.available == null && !it.outOfStock
            return (
              <button
                key={it.menuItemId}
                className={`dish pos-dish${soldOut ? ' soldout' : ''}`}
                onClick={() => onAdd(it)}
                disabled={soldOut || unknownAvailability || disabled}
                aria-label={soldOut ? `${it.name}, hết món` : unknownAvailability ? `${it.name}, chưa xác định tình trạng` : `Thêm ${it.name}, ${money(it.price)}`}
              >
                <DishThumb src={it.imageUrl} name={it.name} size="sm" />
                <span className="dname"><Strikable on={soldOut}>{it.name}</Strikable></span>
                <span className="dots" aria-hidden="true" />
                {soldOut ? <span className="soldout-tag">HẾT MÓN</span> : unknownAvailability ? <span className="soldout-tag">ĐANG CẬP NHẬT</span> : <span className="dprice">{money(it.price)}</span>}
                {!soldOut && !unknownAvailability && <Plus className="add" size={18} aria-hidden="true" />}
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
  onPickSibling: (id: number) => void; tableName?: string; tableCapacity?: number; tableArea?: string; tableFloor?: string
  onOpenMenu: () => void; onDismiss: () => void; menu: BranchMenuItemResponse[]
  draft: DraftLine[]; setDraft: (fn: (d: DraftLine[]) => DraftLine[]) => void
  onChanged: () => Promise<void> | void; onCreated: (o: OrderResponse) => void; onClosed: () => void
}) {
  const { selection, order, draft, setDraft, menu, branchId } = props
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
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
    order?.status === 'AWAITING_PAYMENT' ? 4000 : undefined,
  )

  if (!selection) return null

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

  const sendDraft = () => {
    if (draft.length === 0) return
    const itemsToSend = draft.map(({ menuItemId, quantity, notes }) => ({
      menuItemId,
      quantity,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    }))

    if (order) {
      run(async () => {
        await post(`/orders/${order.id}/items`, { items: itemsToSend })
        setDraft(() => [])
        await props.onChanged()
      }, 'Đã gửi món xuống bếp')
    } else {
      run(async () => {
        const created = await post<OrderResponse>('/orders', {
          branchId,
          orderType: selection.kind === 'table' ? 'DINE_IN' : selection.kind === 'new' ? selection.type : 'TAKEAWAY',
          tableId: selection.kind === 'table' ? selection.tableId : undefined,
          customerId: customer?.id,
          promotionCode: promoCheck ? promo.trim() : undefined,
          pointsToUse: points > 0 ? points : undefined,
          items: itemsToSend,
        })
        props.onCreated(created)
        setDraft(() => [])
      }, 'Đã tạo đơn & gửi món xuống bếp')
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

  return (
    <aside className="pos-order" aria-label="Đơn hàng">
      <div className="order-head">
        <div>
          {selection.kind === 'table'
            ? <div className="big"><UtensilsCrossed size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />Bàn {title}</div>
            : <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-20)' }}>{title}</div>}
          <div className="code">{order ? `${order.code} · ${ORDER_TYPE_LABEL[order.orderType!]} · mở lúc ${time(order.createdAt)}` : 'Đơn mới'}</div>
          {selection.kind === 'table' && <div className="pos-table-context">{props.tableFloor ?? 'Chưa gán tầng'} · {props.tableArea ?? 'Chưa gán khu'} · {props.tableCapacity ?? 0} chỗ</div>}
        </div>
        <div className="pos-order-head-actions">
          {paid && <Chip tone="ok"><Check size={14} aria-hidden="true" /> Đã thu tiền</Chip>}
          <button className="btn btn-accent pos-add-dish" onClick={props.onOpenMenu} disabled={awaiting}>
            <Plus size={18} aria-hidden="true" /> Gọi thêm món
          </button>
          <button className="pos-drawer-close" aria-label="Đóng chi tiết bàn" onClick={props.onDismiss}><X size={20} /></button>
        </div>
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
                {it.notes && <span className="order-item-notes">Ghi chú: {it.notes}</span>}
                {it.cancelReason && <span>· {it.cancelReason}</span>}
                {voidPending && it.voidReason && <span className="void-reason-tag">"{it.voidReason}"</span>}
                <span style={{ marginLeft: 'auto' }} className="row">
                  {it.status === 'READY' && !awaiting && (
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

        {draft.map((line) => {
          const m = priceOf(line.menuItemId)
          return (
            <div key={line.menuItemId} className="line">
              <span className="lname with-thumb">
                <DishThumb src={m?.imageUrl} name={m?.name} size="sm" />
                {m?.name}
              </span>
              <span className="lamt">{money((m?.price ?? 0) * line.quantity)}</span>
              <span className="lsub">
                <Chip tone="warn">Chưa gửi bếp</Chip>
                <span className="qty-btns" style={{ marginLeft: 'auto' }}>
                  <button className="icon-btn" aria-label="Bớt"
                    onClick={() => setDraft((d) => d.map((x) => x.menuItemId === line.menuItemId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}>
                    <Minus size={16} />
                  </button>
                  <span className="num" style={{ minWidth: 24, textAlign: 'center', fontWeight: 'var(--fw-semibold)', color: 'var(--ink)' }}>{line.quantity}</span>
                  <button className="icon-btn" aria-label="Thêm"
                    onClick={() => setDraft((d) => d.map((x) => x.menuItemId === line.menuItemId ? { ...x, quantity: x.quantity + 1 } : x))}>
                    <Plus size={16} />
                  </button>
                  <button className="icon-btn" aria-label="Bỏ món"
                    onClick={() => setDraft((d) => d.filter((x) => x.menuItemId !== line.menuItemId))}>
                    <Trash2 size={16} />
                  </button>
                </span>
              </span>
              <div className="draft-notes">
                <label htmlFor={`draft-note-${line.menuItemId}`}>Ghi chú món</label>
                <div className="draft-note-presets">
                  {['Không hành', 'Ít cay', 'Không đá', 'Medium', 'Well done'].map((preset) => (
                    <button key={preset} type="button" className="pos-note-preset" aria-pressed={line.notes === preset}
                      onClick={() => setDraft((d) => d.map((x) => x.menuItemId === line.menuItemId ? { ...x, notes: x.notes === preset ? '' : preset } : x))}>
                      {preset}
                    </button>
                  ))}
                </div>
                <input id={`draft-note-${line.menuItemId}`} className="input" aria-label={`Ghi chú ${m?.name ?? 'món'}`} maxLength={240} placeholder="Ghi chú riêng cho món này…"
                  value={line.notes} onChange={(event) => setDraft((d) => d.map((x) => x.menuItemId === line.menuItemId ? { ...x, notes: event.target.value } : x))} />
              </div>
            </div>
          )
        })}
        {draft.length > 0 && (
          <button className="btn btn-accent btn-block" disabled={busy} onClick={sendDraft}>
            <Send size={15} aria-hidden="true" /> {order ? 'Gửi món xuống bếp' : 'Tạo đơn & gửi bếp'}
          </button>
        )}
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
            toast(p.status === 'PAID'
              ? method === 'BANK_TRANSFER' ? `Đã xác nhận chuyển khoản ${money(p.amount)}` : `Đã thu ${money(p.cashReceived)} — thối ${money(p.changeAmount)}`
              : 'Đang chờ backend xác nhận thanh toán')
          })}
        />
      ) : (
        <>
        <div className="order-actions">
          {/* Staff without cashier permissions should send kitchen items before leaving the table */}
          {draft.length === 0 && order && !paid && !can.cash(props.role) && (
            <div className="notice notice-ok">{awaiting ? 'Đơn web chờ thu ngân thu tiền.' : 'Gọi món xong. Khách thanh toán tiền mặt tại quầy thu ngân.'}</div>
          )}
          {order && awaiting && order.orderType !== 'DINE_IN' && order.payMethod === 'BANK_TRANSFER' && (
            <div className="notice notice-warn" role="status">
              Đang chờ SePay xác nhận giao dịch. Đơn chưa PAID nên bếp chưa nhận món; không xác nhận chỉ dựa trên mã QR hoặc thông báo của khách.
            </div>
          )}
          {order && awaiting && order.orderType !== 'DINE_IN' && order.payMethod !== 'BANK_TRANSFER' && can.cash(props.role) && (
            <button className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={() => setPaying(true)}>
              <Wallet size={16} aria-hidden="true" /> Thu tiền mặt tại quầy
            </button>
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

function ReadyMadeStock({ items, branchId, canToggle, onChanged }: { items: BranchMenuItemResponse[]; branchId: number; canToggle: boolean; onChanged: () => Promise<void> }) {
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
        <span className="muted" style={{ fontSize: 'var(--fs-13)' }}>{canToggle ? 'Bấm để báo hết / bán lại. Món gắn kho tự hết khi kho hết.' : 'Tình trạng do hệ thống cập nhật; tài khoản hiện tại chỉ có quyền xem.'}</span>
      </div>
      {items.length === 0 ? <span className="muted">Chưa có món nào được đặt là "Có sẵn" trong Menu chung.</span> : (
        <div className="row">
          {items.map((m) => canToggle ? (
            <button key={m.menuItemId} className="chip-toggle on-light" aria-pressed={!m.available} disabled={busy === m.menuItemId || m.outOfStock}
              title={m.outOfStock ? 'Hết trong kho: nhập thêm hàng ở Kho' : m.available ? 'Bấm để báo hết' : 'Bấm để bán lại'} onClick={() => toggle(m)}>
              <DishThumb src={m.imageUrl} name={m.name} size="sm" />
              <Strikable on={!m.available}>{m.name}</Strikable>
              {m.outOfStock && <span className="state state-bad">hết kho</span>}
            </button>
          ) : (
            <span key={m.menuItemId} className="chip-toggle on-light" aria-label={`${m.name}: ${m.available ? 'đang bán' : 'hết món'}`}>
              <DishThumb src={m.imageUrl} name={m.name} size="sm" />
              <Strikable on={!m.available}>{m.name}</Strikable>
              <span className={`state ${m.available ? 'state-ok' : 'state-bad'}`}>{m.outOfStock ? 'hết kho' : m.available ? 'đang bán' : 'hết món'}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
