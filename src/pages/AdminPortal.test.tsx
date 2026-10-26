import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { get, put } from '../api/client'
import { AdminRoutes } from './AdminPortal'

const { mockRole } = vi.hoisted(() => ({ mockRole: { value: 'ADMIN' } }))
vi.mock('../api/client', () => ({ del: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('../auth', () => ({
  homeFor: () => '/admin/overview',
  useAuth: () => ({
    session: { staff: { id: 10, role: mockRole.value, branchId: mockRole.value === 'MANAGER' ? 1 : undefined, fullName: mockRole.value === 'MANAGER' ? 'Quản lý' : 'Admin', branchName: 'Toàn chuỗi' } },
    authLoading: false,
    role: mockRole.value,
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
    mockRole.value = 'ADMIN'
    vi.mocked(get).mockImplementation(async (path: string) => {
      if (path === '/branches/1') return { id: 1, code: 'CN01', name: 'Hoàn Kiếm', address: '12 Hàng Bài, Hoàn Kiếm', city: 'Hà Nội', phone: '0241234567', email: 'hk@savoris.vn' } as never
      if (path === '/branches/2') return { id: 2, code: 'CN02', name: 'Long Biên', address: '20 Nguyễn Văn Cừ, Long Biên', city: 'Hà Nội', phone: '0247654321', email: 'lb@savoris.vn' } as never
      if (path === '/staff/branch/1') return [{ id: 10, fullName: 'Quản lý', username: 'manager', email: 'manager@savoris.vn', phone: '0900000000', role: 'MANAGER', status: 'ACTIVE', branchId: 1, hourlyRate: 30000 }] as never
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

  it('preserves a manager role when editing the manager account', async () => {
    mockRole.value = 'MANAGER'
    render(<MemoryRouter initialEntries={['/admin/staff']}><AdminRoutes /></MemoryRouter>)
    await screen.findByText('Quản lý')
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }))

    await waitFor(() => expect(put).toHaveBeenCalledWith('/staff/10', expect.objectContaining({ role: 'MANAGER', branchId: 1 })))
  })
})
