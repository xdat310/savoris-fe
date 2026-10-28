import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { get, post, put } from '../api/client'
import type { OrderResponse } from '../api/types'
import { Pos } from './Pos'

vi.mock('../auth', () => ({
  can: { pos: () => true, cash: () => true, cancelCooking: () => false },
  useAuth: () => ({ branchId: 2, role: 'STAFF', branches: [{ id: 2, name: 'Cầu Giấy' }] }),
}))
vi.mock('../components/Toast', () => ({ useToast: () => vi.fn() }))

vi.mock('../api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return { ...actual, get: vi.fn(), post: vi.fn(), put: vi.fn() }
})

const tables = [{ id: 10, areaId: 1, name: 'B01', capacity: 4, status: 'AVAILABLE' }]
const areas = [{ id: 1, branchId: 2, name: 'Sảnh chính', floorName: 'Tầng 1', floorSortOrder: 1 }]
const menu = [
  { menuItemId: 7, categoryId: 4, name: 'Phở bò', price: 85000, available: true, needsKitchen: true },
  { menuItemId: 8, categoryId: 5, name: 'Trà đào', price: 45000, available: false, needsKitchen: false },
  { menuItemId: 9, categoryId: 5, name: 'Cà phê sữa đá', price: 30000, available: true, needsKitchen: true },
]
const openOrder: OrderResponse = { id: 99, tableId: 10, code: 'SV-100', orderType: 'DINE_IN', status: 'OPEN', totalAmount: 85000, items: [] }

function setupApi(order: OrderResponse = openOrder, options: { loadStatus?: string; acceptingTakeaway?: boolean } = {}) {
  vi.mocked(get).mockImplementation(async path => {
    if (path === '/branches/2/tables') return tables as never
    if (path === '/branches/2/areas') return areas as never
    if (path === '/orders/branch/2') return [order] as never
    if (path === '/branches/2/menu') return menu as never
    if (path === '/menu-categories/search?q=') return [{ id: 4, name: 'Món chính' }, { id: 5, name: 'Đồ uống' }] as never
    if (path === '/kitchen/branches/2/load') return { status: options.loadStatus ?? 'NORMAL', loadPercent: 35, estimatedWaitMinutes: 8, acceptingTakeaway: options.acceptingTakeaway ?? true } as never
    if (path === '/orders/branch/2/refunds-due') return [] as never
    if (path === `/payments/order/${order.id}`) return null as never
    return [] as never
  })
  vi.mocked(post).mockResolvedValue([] as never)
  vi.mocked(put).mockResolvedValue({} as never)
}

describe('Pos', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('shows branch floors and keeps the menu closed until staff asks to add dishes', async () => {
    setupApi()
    render(<Pos />)

    expect(await screen.findByRole('button', { name: 'Trống 0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đang phục vụ 1' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Tầng 1/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sảnh chính' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Tìm món' })).not.toBeInTheDocument()
    expect(document.querySelector('.pos-left')).toBeInTheDocument()
    expect(document.querySelector('.pos-center')).not.toBeInTheDocument()
    expect(document.querySelector('.pos-order')).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: /Bàn B01/ }))
    expect(await screen.findByRole('button', { name: /Gọi thêm món/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Gọi thêm món/ }))
    expect(await screen.findByRole('textbox', { name: 'Tìm món' })).toBeInTheDocument()
    expect(screen.getByText('Món chính')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trà đào, hết món' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm món' }), { target: { value: 'phở' } })
    expect(screen.getByRole('button', { name: 'Thêm Phở bò, 85.000 ₫' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Trà đào, hết món' })).not.toBeInTheDocument()
  })

  it('sends all dishes in one batch without asking staff to assign courses', async () => {
    setupApi()
    render(<Pos />)
    fireEvent.click(await screen.findByRole('button', { name: 'Bàn B01, đang phục vụ' }))
    fireEvent.click(screen.getByRole('button', { name: /Gọi thêm món/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò, 85.000 ₫' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Ghi chú Phở bò' }), { target: { value: 'Không hành' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Cà phê sữa đá, 30.000 ₫' }))

    expect(screen.queryByRole('group', { name: 'Đợt gọi món' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Gửi món xuống bếp' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/orders/99/items', {
      items: [
        { menuItemId: 7, quantity: 1, notes: 'Không hành' },
        { menuItemId: 9, quantity: 1 },
      ],
    }))
  })

  it('starts a walk-in takeaway order directly from the POS toolbar', async () => {
    setupApi()
    vi.mocked(post).mockResolvedValue({ id: 101, orderType: 'TAKEAWAY', status: 'OPEN' } as never)
    render(<Pos />)
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo đơn mang đi' }))
    fireEvent.click(await screen.findByRole('button', { name: /Gọi thêm món/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò, 85.000 ₫' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đơn & gửi bếp' }))

    await waitFor(() => expect(post).toHaveBeenCalledWith('/orders', expect.objectContaining({
      branchId: 2,
      orderType: 'TAKEAWAY',
      items: [{ menuItemId: 7, quantity: 1 }],
    })))
  })

  it('allows a paid ready item to be served and keeps completion blocked until served', async () => {
    const paidReady: OrderResponse = { ...openOrder, items: [{ id: 501, itemName: 'Phở bò', menuItemId: 7, quantity: 1, amount: 85000, status: 'READY' }] }
    setupApi(paidReady)
    vi.mocked(get).mockImplementation(async path => {
      if (path === '/branches/2/tables') return tables as never
      if (path === '/branches/2/areas') return areas as never
      if (path === '/orders/branch/2') return [paidReady] as never
      if (path === '/branches/2/menu') return menu as never
      if (path === '/menu-categories/search?q=') return [{ id: 4, name: 'Món chính' }] as never
      if (path === '/kitchen/branches/2/load') return { status: 'NORMAL', loadPercent: 35, acceptingTakeaway: true } as never
      if (path === '/orders/branch/2/refunds-due') return [] as never
      if (path === '/payments/order/99') return { status: 'PAID', method: 'CASH', amount: 85000 } as never
      return [] as never
    })
    render(<Pos />)
    fireEvent.click(await screen.findByRole('button', { name: /Bàn B01/ }))
    expect(await screen.findByRole('button', { name: /Bưng ra/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Còn 1 món chưa bưng/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Bưng ra/ }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/kitchen/items/501/served'))
  })


  it('warns about dine-in dishes that have been ready and unserved for ten minutes', async () => {
    const staleReady: OrderResponse = {
      ...openOrder,
      items: [{ id: 501, itemName: 'Phở bò', quantity: 1, status: 'READY', readyAt: new Date(Date.now() - 11 * 60_000).toISOString() }],
    }
    setupApi(staleReady)
    render(<Pos />)

    expect(await screen.findByRole('region', { name: /Món chờ bưng quá lâu/ })).toHaveTextContent('Phở bò')
    expect(screen.getByRole('region', { name: /Món chờ bưng quá lâu/ })).toHaveTextContent('Bàn B01')
    expect(screen.getByRole('region', { name: /Món chờ bưng quá lâu/ })).toHaveTextContent('11 phút')
  })

  it('collects cash once and sends the received amount for backend change calculation', async () => {
    const servedOrder = { ...openOrder, items: [{ id: 501, itemName: 'Phở bò', quantity: 1, amount: 85000, status: 'SERVED' as const }] }
    setupApi(servedOrder)
    vi.mocked(post).mockResolvedValue({ status: 'PAID', method: 'CASH', cashReceived: 500000, changeAmount: 415000 } as never)
    render(<Pos />)
    fireEvent.click(await screen.findByRole('button', { name: /Bàn B01/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Thanh toán hóa đơn/ }))
    fireEvent.change(screen.getByLabelText(/Khách đưa/), { target: { value: '500000' } })
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận đã thu 500\.000/ }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/payments', { orderId: 99, paymentMethod: 'CASH', cashReceived: 500000 }))
  })

  it('loads a branch transfer QR for the order amount and confirms only through payment API', async () => {
    setupApi()
    vi.mocked(get).mockImplementation(async path => {
      if (path === '/branches/2/tables') return tables as never
      if (path === '/branches/2/areas') return areas as never
      if (path === '/orders/branch/2') return [openOrder] as never
      if (path === '/branches/2/menu') return menu as never
      if (path === '/menu-categories/search?q=') return [{ id: 4, name: 'Món chính' }] as never
      if (path === '/kitchen/branches/2/load') return { status: 'NORMAL', loadPercent: 35, acceptingTakeaway: true } as never
      if (path === '/orders/branch/2/refunds-due') return [] as never
      if (path === '/payments/order/99') return null as never
      if (path === '/public/branches/2/transfer-qr?amount=85000&reference=SV-100') return { url: 'https://cdn.example/qr.png' } as never
      return [] as never
    })
    vi.mocked(post).mockResolvedValue({ status: 'PENDING', method: 'BANK_TRANSFER', amount: 85000 } as never)
    render(<Pos />)
    fireEvent.click(await screen.findByRole('button', { name: /Bàn B01/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Thanh toán hóa đơn/ }))
    fireEvent.click(screen.getByRole('button', { name: /Chuyển khoản/ }))
    expect(await screen.findByRole('img', { name: /Mã QR chuyển 85\.000 ₫ cho đơn SV-100/ })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/public/branches/2/transfer-qr?amount=85000&reference=SV-100')
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận đã nhận chuyển khoản/ }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/payments', { orderId: 99, paymentMethod: 'BANK_TRANSFER' }))
  })

  it('keeps an unpaid web transfer pending and out of the kitchen flow', async () => {
    const webOrder: OrderResponse = { ...openOrder, orderType: 'TAKEAWAY', status: 'AWAITING_PAYMENT', payMethod: 'BANK_TRANSFER' }
    setupApi(webOrder)
    render(<Pos />)
    fireEvent.click(screen.getByRole('button', { name: /Mang đi · Giao hàng/ }))
    fireEvent.click(await screen.findByRole('button', { name: /SV-100/ }))
    expect(await screen.findByText(/Đang chờ SePay xác nhận giao dịch/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Đã nhận chuyển khoản/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gọi thêm món/ })).toBeDisabled()
    expect(post).not.toHaveBeenCalled()
  })

  it('pauses new takeaway orders when the kitchen rejects them but keeps dine-in tables selectable', async () => {
    setupApi(openOrder, { loadStatus: 'OVERLOADED', acceptingTakeaway: false })
    render(<Pos />)
    fireEvent.click(screen.getByRole('button', { name: /Mang đi · Giao hàng/ }))
    expect(await screen.findByRole('button', { name: 'Tạo đơn mang đi' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Tại bàn' }))
    expect(screen.getByRole('button', { name: /Bàn B01/ })).toBeEnabled()
  })

  it('lets staff request a kitchen void for a cooking item with a reason', async () => {
    const cookingOrder = { ...openOrder, items: [{ id: 501, itemName: 'Phở bò', menuItemId: 7, quantity: 1, amount: 85000, status: 'COOKING' as const }] }
    setupApi(cookingOrder)
    render(<Pos />)
    fireEvent.click(await screen.findByRole('button', { name: /Bàn B01/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Báo bếp hủy/ }))
    fireEvent.change(screen.getByPlaceholderText(/Lý do hủy/), { target: { value: 'Khách đổi ý' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi bếp' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/orders/99/items/501/void-request', { reason: 'Khách đổi ý' }))
  })

  it('completes an order only after payment and all live items are served', async () => {
    const servedOrder = { ...openOrder, items: [{ id: 501, itemName: 'Phở bò', quantity: 1, amount: 85000, status: 'SERVED' as const }] }
    setupApi(servedOrder)
    vi.mocked(get).mockImplementation(async path => {
      if (path === '/branches/2/tables') return tables as never
      if (path === '/branches/2/areas') return areas as never
      if (path === '/orders/branch/2') return [servedOrder] as never
      if (path === '/branches/2/menu') return menu as never
      if (path === '/menu-categories/search?q=') return [{ id: 4, name: 'Món chính' }] as never
      if (path === '/kitchen/branches/2/load') return { status: 'NORMAL', loadPercent: 35, acceptingTakeaway: true } as never
      if (path === '/orders/branch/2/refunds-due') return [] as never
      if (path === '/payments/order/99') return { status: 'PAID', method: 'CASH' } as never
      return [] as never
    })
    render(<Pos />)
    fireEvent.click(await screen.findByRole('button', { name: /Bàn B01/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tất đơn, trả bàn' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/orders/99/complete'))
  })
})
