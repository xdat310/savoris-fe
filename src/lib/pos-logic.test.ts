import { describe, expect, it } from 'vitest'
import { countPosTableStates, filterPosMenu, filterPosTables, getPosTableState } from './pos-logic'

describe('POS service helpers', () => {
  it('prioritizes an item ready to serve when deriving table state', () => {
    expect(getPosTableState({ status: 'OCCUPIED' }, [{ status: 'OPEN', items: [{ status: 'READY' }] }])).toBe('READY')
  })

  it('keeps reserved and cleaning table states separate from active service', () => {
    expect(getPosTableState({ status: 'RESERVED' }, [])).toBe('RESERVED')
    expect(getPosTableState({ status: 'CLEANING' }, [])).toBe('CLEANING')
  })

  it('does not mark paid orders complete while any item is not served or cancelled', () => {
    expect(getPosTableState({ status: 'OCCUPIED' }, [{ status: 'OPEN', items: [{ status: 'SERVED' }, { status: 'PENDING' }] }])).toBe('SERVING')
  })



  it('filters menu by Vietnamese name and backend category while retaining sold-out state', () => {
    const items = [
      { menuItemId: 1, categoryId: 4, name: 'Phở bò', available: true },
      { menuItemId: 2, categoryId: 5, name: 'Trà đào', available: false },
    ]
    expect(filterPosMenu(items, 'ALL', 'pho')).toEqual([items[0]])
    expect(filterPosMenu(items, 5, '')).toEqual([items[1]])
  })

  it('counts and filters tables using the same live backend state', () => {
    const tables = [
      { id: 1, name: 'B01', status: 'AVAILABLE' as const },
      { id: 2, name: 'B02', status: 'OCCUPIED' as const },
    ]
    const orders = new Map([[2, [{ status: 'OPEN' as const, items: [{ status: 'READY' as const }] }]]])
    expect(countPosTableStates(tables, orders)).toMatchObject({ ALL: 2, EMPTY: 1, READY: 1 })
    expect(filterPosTables(tables, orders, 'READY', '')).toEqual([tables[1]])
  })

  it('distinguishes a served unpaid table from a paid table using backend payment status', () => {
    const table = { id: 3, status: 'OCCUPIED' as const }
    const orders = [{ id: 30, status: 'OPEN' as const, items: [{ status: 'SERVED' as const }] }]
    expect(getPosTableState(table, orders, new Map([[30, 'PENDING']]))).toBe('WAITING_PAYMENT')
    expect(getPosTableState(table, orders, new Map([[30, 'PAID']]))).toBe('SERVED')
  })
})
