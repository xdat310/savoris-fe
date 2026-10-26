import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get, post, put } from '../api/client'
import { MenuManagementPage } from './MenuManagementPage'

vi.mock('../api/client', () => ({
  del: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn(), upload: vi.fn(),
}))

describe('MenuManagementPage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(get).mockImplementation(async (path: string) => {
      if (path === '/menu-categories/search?q=') return [{ id: 3, name: 'Món chính', sortOrder: 1, isActive: true }] as never
      if (path === '/menu-items/search?q=') return [] as never
      if (path === '/branches') return [{ id: 1, code: 'CN01', name: 'Hoàn Kiếm' }] as never
      if (path === '/branches/1/menu') return [] as never
      return [] as never
    })
    vi.mocked(post).mockImplementation(async (path: string) => path === '/menu-items' ? { id: 7 } as never : { id: 3 } as never)
    vi.mocked(put).mockResolvedValue([] as never)
  })

  it('creates a menu item and assigns it to the selected branch', async () => {
    render(<MenuManagementPage />)
    await screen.findByRole('heading', { name: 'Thực đơn' })
    fireEvent.click(screen.getByRole('button', { name: /Thêm món/ }))
    fireEvent.change(screen.getByLabelText('Mã món'), { target: { value: 'M01' } })
    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: 'Phở cuốn' } })
    fireEvent.change(screen.getByLabelText('Danh mục'), { target: { value: '3' } })
    const priceInput = screen.getByLabelText('Giá (VND)') as HTMLInputElement
    fireEvent.change(priceInput, { target: { value: '95000' } })
    expect(priceInput.checkValidity()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu món' }))

    await waitFor(() => expect(post).toHaveBeenCalledWith('/menu-items', expect.objectContaining({
      code: 'M01', name: 'Phở cuốn', categoryId: 3, basePrice: 95000, takeawayAvailable: true,
    })))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/menu-items/7/branches', { branchIds: [1] }))
  })
})
