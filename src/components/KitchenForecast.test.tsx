import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from '../api/client'
import { KitchenForecast } from './KitchenForecast'

vi.mock('../api/client', () => ({ get: vi.fn(), post: vi.fn(), apiUrl: (path: string) => `/api/v1${path}` }))
const load = vi.mocked(get)

describe('KitchenForecast', () => {
  beforeEach(() => load.mockReset())
  afterEach(cleanup)

  it('loads a forecast only after the manager requests one', async () => {
    load.mockResolvedValue({
      branchId: 4, branchName: 'Hoàn Kiếm', kitchenCapacity: 40, activeChefAccounts: 3,
      pendingPortions: 12, cookingPortions: 8, currentLoadPercent: 50,
      history: [],
      forecast: [{ hour: '19h', predictedLoad: 110, risk: 'OVERLOADED' }, { hour: '20h', predictedLoad: 80, risk: 'HIGH' }],
      alert: 'Bếp có nguy cơ quá tải lúc 19h', actions: ['Tạm ngưng nhận đơn mang về'], suggestedPauseAt: '18:30', dataNote: 'Tài khoản ACTIVE không phải dữ liệu chấm công.',
    } as never)
    render(<KitchenForecast branchId={4} />)
    expect(load).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Phân tích tải bếp' }))

    expect(await screen.findByText('Bếp có nguy cơ quá tải lúc 19h')).toBeInTheDocument()
    expect(screen.getByText('110%')).toBeInTheDocument()
    expect(screen.getAllByText('Quá tải')).toHaveLength(2)
    expect(load).toHaveBeenCalledWith('/dashboard/branch/4/kitchen-forecast')
  })


  it('runs the AI against the synthetic peak-hour scenario on request', async () => {
    load.mockResolvedValue({
      branchId: 4, branchName: 'Hoàn Kiếm', kitchenCapacity: 50, activeChefAccounts: 4,
      pendingPortions: 24, cookingPortions: 8, currentLoadPercent: 64, history: [], forecast: [],
      alert: 'Bếp có nguy cơ quá tải', actions: ['Bổ sung đầu bếp'], suggestedPauseAt: '19:30',
      dataNote: 'DỮ LIỆU MÔ PHỎNG', sampleData: true,
    } as never)
    render(<KitchenForecast branchId={4} />)
    fireEvent.click(screen.getByRole('button', { name: 'Thử AI với dữ liệu mẫu' }))

    expect(await screen.findByText('Bếp có nguy cơ quá tải')).toBeInTheDocument()
    expect(load).toHaveBeenCalledWith('/dashboard/branch/4/kitchen-forecast?sampleData=true')
  })
})
