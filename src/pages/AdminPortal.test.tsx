import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { get, put } from '../api/client'
import { AdminRoutes } from './AdminPortal'

vi.mock('../api/client', () => ({ del: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('../auth', () => ({
  homeFor: () => '/admin/overview',
  useAuth: () => ({
    session: { staff: { role: 'ADMIN', fullName: 'Admin', branchName: 'Toàn chuỗi' } },
    authLoading: false,
    role: 'ADMIN',
    branchId: 1,
    branches: [
      { id: 1, code: 'CN01', name: 'Hoàn Kiếm' },
      { id: 2, code: 'CN02', name: 'Long Biên' },
    ],
    setBranchId: vi.fn(),
    reloadBranches: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

describe('Admin branch editor', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(get).mockImplementation(async (path: string) => {
      if (path === '/branches/1') return { id: 1, code: 'CN01', name: 'Hoàn Kiếm', address: '12 Hàng Bài, Hoàn Kiếm', city: 'Hà Nội', phone: '0241234567', email: 'hk@savoris.vn' } as never
      if (path === '/branches/2') return { id: 2, code: 'CN02', name: 'Long Biên', address: '20 Nguyễn Văn Cừ, Long Biên', city: 'Hà Nội', phone: '0247654321', email: 'lb@savoris.vn' } as never
      return [] as never
    })
    vi.mocked(put).mockResolvedValue({} as never)
  })

  it('refreshes uncontrolled branch fields when the admin switches branch', async () => {
    render(<MemoryRouter initialEntries={['/admin/branch']}><AdminRoutes /></MemoryRouter>)
    const name = await screen.findByLabelText('Tên chi nhánh') as HTMLInputElement
    expect(name.value).toBe('Hoàn Kiếm')

    fireEvent.change(screen.getByLabelText('Chọn chi nhánh'), { target: { value: '2' } })

    await waitFor(() => expect((screen.getByLabelText('Tên chi nhánh') as HTMLInputElement).value).toBe('Long Biên'))
    expect((screen.getByLabelText('Địa chỉ đầy đủ (số nhà, phố, quận)') as HTMLInputElement).value).toBe('20 Nguyễn Văn Cừ, Long Biên')
  })
})
