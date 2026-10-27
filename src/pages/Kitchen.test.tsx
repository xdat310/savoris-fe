import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get, put } from '../api/client'
import type { BranchLoadResponse, KitchenTicketResponse } from '../api/types'
import { KitchenInsight } from '../components/KitchenInsight'
import { Kitchen } from './Kitchen'

vi.mock('../auth', () => ({
  useAuth: () => ({ branchId: 1, role: 'CHEF', branches: [{ id: 1, name: 'Hoàn Kiếm' }] }),
}))
vi.mock('../components/Toast', () => ({ useToast: () => vi.fn() }))
vi.mock('../api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return { ...actual, get: vi.fn(), put: vi.fn() }
})

const pending: KitchenTicketResponse = { itemId: 21, orderId: 11, orderCode: 'SV-001', orderType: 'DINE_IN', tableId: 8, itemName: 'Beef Steak', quantity: 2, note: 'Medium · Không hành', status: 'PENDING', waitingMinutes: 8 }
const cooking: KitchenTicketResponse = { ...pending, status: 'COOKING', cookingStartedAt: new Date(Date.now() - 6 * 60_000).toISOString() }
const ready: KitchenTicketResponse = { ...pending, status: 'READY' }
const voidRequest: KitchenTicketResponse = { ...pending, status: 'VOID_REQUESTED', voidReason: 'Khách đổi món' }

function setup(queue: KitchenTicketResponse[] = [pending], load: BranchLoadResponse = { pendingPortions: 2, cookingPortions: 0, kitchenCapacity: 30, loadPercent: 10, estimatedWaitMinutes: 12, status: 'NORMAL', acceptingTakeaway: true }, voids: KitchenTicketResponse[] = []) {
  vi.mocked(get).mockImplementation(async path => {
    if (path === '/kitchen/branches/1/queue') return queue as never
    if (path === '/kitchen/branches/1/void-queue') return voids as never
    if (path === '/kitchen/branches/1/load') return load as never
    if (path === '/kitchen/branches/1/insight') throw new Error('AI offline')
    if (path === '/branches/1/menu' || path === '/branches/1/tables') return [] as never
    return [] as never
  })
  vi.mocked(put).mockResolvedValue({} as never)
  render(<Kitchen />)
}

describe('Kitchen KDS', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('shows backend note and starts a pending item through the existing endpoint', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu' }))
    expect(screen.getByText('Medium · Không hành')).toBeInTheDocument()
    await waitFor(() => expect(put).toHaveBeenCalledWith('/kitchen/items/21/start'))
  })

  it('moves cooking items to READY through the existing endpoint and leaves READY for service staff', async () => {
    setup([cooking, ready])
    fireEvent.click(await screen.findByRole('button', { name: /Đang nấu/ }))
    fireEvent.click(within(screen.getByRole('region', { name: /Đang nấu,/ })).getByRole('button', { name: 'Hoàn thành' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/kitchen/items/21/ready'))
    fireEvent.click(screen.getByRole('button', { name: /^Hoàn thành$/ }))
    expect(within(screen.getByRole('region', { name: /Hoàn thành \/ chờ bưng/ })).getAllByText('Sẵn sàng bưng')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Đã phục vụ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đã giao' })).not.toBeInTheDocument()
  })

  it.each([
    ['NORMAL', 25, true, 'Bình thường'],
    ['BUSY', 72, true, 'Tải cao'],
    ['OVERLOADED', 105, false, 'Quá tải'],
  ] as const)('renders backend load state %s and takeaway acceptance', async (status, loadPercent, acceptingTakeaway, label) => {
    setup([pending], { pendingPortions: 2, cookingPortions: 3, kitchenCapacity: 30, loadPercent, estimatedWaitMinutes: 15, status, acceptingTakeaway })
    expect(await screen.findByText(new RegExp(label))).toBeInTheDocument()
    expect(await screen.findByText('~15 phút')).toBeInTheDocument()
    if (!acceptingTakeaway) expect(screen.getByText(/tạm ngưng nhận đơn mang về/i)).toBeInTheDocument()
  })

  it.each([
    ['ACCEPT', 'Chấp nhận hủy'],
    ['REMAKE', 'Làm lại'],
    ['CHARGE', 'Giữ món / vẫn tính tiền'],
  ] as const)('maps void action to %s', async (resolution, label) => {
    setup([], undefined as never, [voidRequest])
    fireEvent.click(await screen.findByRole('button', { name: label }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/orders/11/items/21/void-resolve', { resolution }))
    expect(screen.getByText(/Khách đổi món/)).toBeInTheDocument()
  })

  it('hides an unavailable AI insight while the kitchen queue remains usable', async () => {
    setup()
    await waitFor(() => expect(screen.queryByLabelText('AI Kitchen Insight')).not.toBeInTheDocument())
    expect(await screen.findByText('Beef Steak')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeEnabled()
  })

  it('hides AI insight after its request times out', async () => {
    vi.useFakeTimers()
    vi.mocked(get).mockReturnValue(new Promise(() => {}) as never)
    render(<KitchenInsight branchId={1} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(screen.queryByLabelText('AI Kitchen Insight')).not.toBeInTheDocument()
  })

  it('keeps unpaid takeaway items out of the start action', async () => {
    setup([{ ...pending, orderType: 'TAKEAWAY', awaitingPayment: true }])
    expect(await screen.findByRole('button', { name: 'Chờ thanh toán' })).toBeDisabled()
    expect(put).not.toHaveBeenCalled()
  })

  it('groups matching dishes for display but starts only the selected source order item', async () => {
    setup([pending, { ...pending, itemId: 22, orderId: 12, orderCode: 'SV-002', tableId: 3, quantity: 1, note: 'Chín kỹ' }])
    fireEvent.click(await screen.findByRole('button', { name: 'Gộp món giống nhau' }))
    expect(await screen.findByText('Beef Steak')).toBeInTheDocument()
    expect(screen.getByText('2 đơn · 3 món')).toBeInTheDocument()
    expect(screen.getByText('Chín kỹ')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu · SV-002' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/kitchen/items/22/start'))
    expect(put).not.toHaveBeenCalledWith('/kitchen/items/21/start')
  })
})
