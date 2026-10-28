import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get, put, subscribeEvents } from '../api/client'
import type { BranchLoadResponse, KitchenTicketResponse } from '../api/types'
import { Kitchen } from './Kitchen'

vi.mock('../auth', () => ({ useAuth: () => ({ branchId: 1, role: 'CHEF', branches: [{ id: 1, name: 'Hoàn Kiếm' }] }) }))
vi.mock('../components/Toast', () => ({ useToast: () => vi.fn() }))
vi.mock('../api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return { ...actual, get: vi.fn(), put: vi.fn(), subscribeEvents: vi.fn(() => vi.fn()) }
})

const pending: KitchenTicketResponse = { itemId: 21, orderId: 11, orderCode: 'SV-001', orderType: 'DINE_IN', tableId: 8, menuItemId: 4, itemName: 'Phở bò tái', quantity: 2, note: 'Không hành', status: 'PENDING', waitingMinutes: 8, orderedAt: new Date(Date.now() - 8 * 60_000).toISOString() }
const cooking: KitchenTicketResponse = { ...pending, itemId: 22, orderId: 12, orderCode: 'SV-002', tableId: 3, quantity: 1, note: 'Chín kỹ', status: 'COOKING' }
const voidRequest: KitchenTicketResponse = { ...pending, status: 'VOID_REQUESTED', voidReason: 'Khách đổi món', voidRequestedAt: new Date().toISOString() }
const normalLoad: BranchLoadResponse = { pendingPortions: 2, cookingPortions: 1, kitchenCapacity: 30, loadPercent: 10, estimatedWaitMinutes: 12, status: 'NORMAL', acceptingTakeaway: true }

function setup(queue: KitchenTicketResponse[] = [pending], load: BranchLoadResponse = normalLoad, voids: KitchenTicketResponse[] = []) {
  vi.mocked(get).mockImplementation(async path => {
    if (path === '/kitchen/branches/1/queue') return queue as never
    if (path === '/kitchen/branches/1/void-queue') return voids as never
    if (path === '/kitchen/branches/1/load') return load as never
    if (path === '/branches/1/tables') return [{ id: 8, name: 'A08' }, { id: 3, name: 'A03' }] as never
    return [] as never
  })
  vi.mocked(put).mockResolvedValue({} as never)
  render(<Kitchen />)
}

describe('Kitchen KDS', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => cleanup())

  it('shows summary totals and preserves each order and cooking note in the ticket grid', async () => {
    setup([pending, cooking])
    expect((await screen.findAllByText('Phở bò tái')).length).toBeGreaterThan(0)
    expect(screen.getByText('2 đơn · 2 dòng món')).toBeInTheDocument()
    expect(screen.getByText('Bàn A08')).toBeInTheDocument()
    expect(screen.getByText('Bàn A03')).toBeInTheDocument()
    expect(screen.queryByText('SV-001')).not.toBeInTheDocument()
    expect(screen.getAllByText('Không hành').length).toBeGreaterThan(0)
    expect(screen.getByText('Chín kỹ')).toBeInTheDocument()
    expect(screen.getByText('×2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bắt đầu/ })).not.toBeInTheDocument()
  })

  it('marks a pending item READY directly and ignores rapid double taps', async () => {
    setup()
    const button = await screen.findByRole('button', { name: 'Hoàn thành món' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(put).toHaveBeenCalledWith('/kitchen/items/21/ready')
    expect(put).not.toHaveBeenCalledWith('/kitchen/items/21/start')
  })

  it.each([['ACCEPT', 'CHẤP NHẬN HỦY'], ['REJECT', 'TỪ CHỐI HỦY']] as const)(
    'resolves cancellation with the %s business result', async (resolution, label) => {
      setup([], normalLoad, [voidRequest])
      fireEvent.click(await screen.findByRole('button', { name: label }))
      await waitFor(() => expect(put).toHaveBeenCalledWith('/orders/11/items/21/void-resolve', { resolution }))
      expect(screen.getByText('Không hành')).toBeInTheDocument()
      expect(screen.getByText('Khách đổi món')).toBeInTheDocument()
    },
  )

  it('uses SSE notifications to refresh the source-of-truth queue and shows offline recovery state', async () => {
    setup()
    await waitFor(() => expect(subscribeEvents).toHaveBeenCalledWith('/kitchen/branches/1/events', expect.any(Function), expect.any(Function)))
    const setConnection = vi.mocked(subscribeEvents).mock.calls[0]?.[2]
    setConnection?.(true)
    setConnection?.(false)
    expect(await screen.findByText(/Đang kết nối lại/)).toBeInTheDocument()
  })

  it('switches to rush density automatically from backend kitchen load', async () => {
    setup([pending], { ...normalLoad, loadPercent: 82, status: 'BUSY', estimatedWaitMinutes: 25 })
    expect(await screen.findByRole('status', { name: /tải từ 70%/ })).toHaveTextContent('Giờ cao điểm · tự động')
    expect(screen.queryByText('Chế độ thường')).not.toBeInTheDocument()
    expect(screen.getByText(/Ưu tiên món sắp quá hạn/)).toBeInTheDocument()
  })

  it('renders a hundred simultaneous orders without hiding their full notes', async () => {
    const flood = Array.from({ length: 100 }, (_, index): KitchenTicketResponse => ({
      ...pending, itemId: index + 1, orderId: index + 100, orderCode: `SV-${String(index + 1).padStart(3, '0')}`,
      note: index === 99 ? 'Dị ứng đậu phộng · nước dùng để riêng' : `Ít cay ${index + 1}`,
    }))
    setup(flood, { ...normalLoad, pendingPortions: 200, loadPercent: 250, status: 'OVERLOADED' })
    expect(await screen.findByText('100 đơn · 100 dòng món')).toBeInTheDocument()
    expect(screen.getAllByText('Dị ứng đậu phộng · nước dùng để riêng').length).toBeGreaterThan(0)
    expect(screen.getByRole('status', { name: /tải từ 70%/ })).toHaveTextContent('Giờ cao điểm · tự động')
  })

  it('keeps cancellation requests visible while the normal queue remains on screen', async () => {
    setup([pending], normalLoad, [voidRequest])
    expect(await screen.findByText('Khách đổi món')).toBeInTheDocument()
    expect(screen.getAllByText('Bàn A08').length).toBeGreaterThan(0)
    expect(screen.queryByText('SV-001')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CHẤP NHẬN HỦY' })).toBeInTheDocument()
  })

  it('collapses the cancellation panel when there are no pending requests', async () => {
    setup()
    expect((await screen.findAllByText(/Không hành/)).length).toBeGreaterThan(0)
    const panel = screen.getByLabelText('Yêu cầu hủy món: 0 đang chờ')
    expect(panel).toHaveClass('is-empty')
    expect(panel).toHaveTextContent('Chờ hủy')
    expect(panel).toHaveTextContent('0')
  })

  it('keeps a dedicated order code on takeaway tickets', async () => {
    setup([{ ...pending, orderType: 'TAKEAWAY', orderCode: 'B1-261028-0001' }])
    expect(await screen.findByText('Mang về · B1-261028-0001')).toBeInTheDocument()
  })
})
