import type { BranchMenuItemResponse, OrderResponse, TableResponse } from '../api/types'

export type PosTableState = 'EMPTY' | 'SERVING' | 'READY' | 'SERVED' | 'WAITING_PAYMENT' | 'RESERVED' | 'CLEANING'
export type PosTableFilter = 'ALL' | PosTableState

export const READY_DISH_WARNING_MINUTES = 10

export interface OverdueReadyDish {
  order: OrderResponse
  item: NonNullable<OrderResponse['items']>[number]
  minutes: number
}

export function getPosTableState(table: Pick<TableResponse, 'status'>, orders: Pick<OrderResponse, 'id' | 'status' | 'items'>[], paymentStatus: ReadonlyMap<number, string> = new Map()): PosTableState {
  if (orders.some((order) => order.status === 'AWAITING_PAYMENT')) return 'WAITING_PAYMENT'
  if (orders.some((order) => order.items?.some((item) => item.status === 'READY'))) return 'READY'
  const liveItems = orders.flatMap((order) => order.items ?? []).filter((item) => item.status !== 'CANCELLED')
  const allOrdersServed = orders.length > 0 && orders.every((order) => {
    const orderItems = (order.items ?? []).filter((item) => item.status !== 'CANCELLED')
    return orderItems.length > 0 && orderItems.every((item) => item.status === 'SERVED')
  })
  if (liveItems.length > 0 && liveItems.every((item) => item.status === 'SERVED') && allOrdersServed) {
    return orders.some((order) => paymentStatus.get(order.id ?? -1) === 'PENDING') ? 'WAITING_PAYMENT' : 'SERVED'
  }
  if (table.status === 'RESERVED') return 'RESERVED'
  if (table.status === 'CLEANING') return 'CLEANING'
  if (orders.length > 0 || table.status !== 'AVAILABLE') return 'SERVING'
  return 'EMPTY'
}

export function getOverdueReadyDishes(orders: OrderResponse[], now = Date.now()): OverdueReadyDish[] {
  return orders.flatMap((order) => {
    if (order.status !== 'OPEN' || order.orderType !== 'DINE_IN' || order.tableId == null) return []
    return (order.items ?? []).flatMap((item) => {
      if (item.status !== 'READY' || !item.readyAt) return []
      const readyAt = Date.parse(item.readyAt)
      const minutes = Math.floor((now - readyAt) / 60_000)
      return Number.isFinite(readyAt) && minutes >= READY_DISH_WARNING_MINUTES ? [{ order, item, minutes }] : []
    })
  }).sort((a, b) => b.minutes - a.minutes)
}


export function filterPosMenu(
  items: BranchMenuItemResponse[],
  categoryId: number | 'ALL',
  query: string,
): BranchMenuItemResponse[] {
  const normalize = (value: string) => value.trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  const normalized = normalize(query)
  return items.filter((item) => {
    const categoryMatches = categoryId === 'ALL' || item.categoryId === categoryId
    const nameMatches = !normalized || normalize(item.name ?? '').includes(normalized)
    return categoryMatches && nameMatches
  })
}

export function filterPosTables(
  tables: TableResponse[],
  ordersByTable: Map<number, OrderResponse[]>,
  filter: PosTableFilter,
  query: string,
  paymentStatus: ReadonlyMap<number, string> = new Map(),
): TableResponse[] {
  const normalized = query.trim().toLocaleLowerCase('vi')
  return tables.filter((table) => {
    const matchesState = filter === 'ALL' || getPosTableState(table, ordersByTable.get(table.id ?? -1) ?? [], paymentStatus) === filter
    const matchesQuery = !normalized || (table.name ?? '').toLocaleLowerCase('vi').includes(normalized)
    return matchesState && matchesQuery
  })
}

export function countPosTableStates(tables: TableResponse[], ordersByTable: Map<number, OrderResponse[]>, paymentStatus: ReadonlyMap<number, string> = new Map()) {
  return tables.reduce<Record<PosTableFilter, number>>((counts, table) => {
    const state = getPosTableState(table, ordersByTable.get(table.id ?? -1) ?? [], paymentStatus)
    counts.ALL += 1
    counts[state] += 1
    return counts
  }, { ALL: 0, EMPTY: 0, SERVING: 0, READY: 0, SERVED: 0, WAITING_PAYMENT: 0, RESERVED: 0, CLEANING: 0 })
}
