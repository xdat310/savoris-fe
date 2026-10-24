import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebsiteCMSPage } from './WebsiteCMSPage'
import { createWebsiteItem, getWebsiteCms, uploadWebsiteMedia } from '../api/site'

vi.mock('../api/site', () => ({
  createWebsiteItem: vi.fn(),
  deleteWebsiteItem: vi.fn(),
  getWebsiteCms: vi.fn(),
  reorderWebsiteItems: vi.fn(),
  saveBranchPage: vi.fn(),
  saveWebsiteSettings: vi.fn(),
  updateWebsiteItem: vi.fn(),
  uploadWebsiteMedia: vi.fn(),
}))

describe('WebsiteCMSPage menu PDFs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getWebsiteCms).mockResolvedValue({
      settings: {},
      branches: [{ id: 1, name: 'CN1', slug: 'cn1' }],
      branchPages: [],
      menus: [],
    })
    vi.mocked(uploadWebsiteMedia).mockResolvedValue({ url: 'https://res.cloudinary.com/savoris/image/upload/v1/menu-cover.webp', alt: 'menu-cover' })
    vi.mocked(createWebsiteItem).mockResolvedValue({ id: 1 })
  })

  it('lets an admin upload and save a cover image with a PDF menu', async () => {
    render(<WebsiteCMSPage />)
    await screen.findByRole('heading', { name: 'Website' })
    fireEvent.click(screen.getByRole('button', { name: 'Thực đơn PDF' }))

    const coverInput = screen.getByLabelText('Ảnh bìa thực đơn') as HTMLInputElement
    expect(coverInput.type).toBe('file')
    fireEvent.change(coverInput, { target: { files: [new File(['cover'], 'cover.webp', { type: 'image/webp' })] } })
    await waitFor(() => expect(uploadWebsiteMedia).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('Tên thực đơn'), { target: { value: 'Thực đơn tối' } })
    fireEvent.change(screen.getByLabelText('Đường dẫn PDF'), { target: { value: 'https://example.com/menu.pdf' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mục' }))

    await waitFor(() => expect(createWebsiteItem).toHaveBeenCalledWith('menus', expect.objectContaining({
      title: 'Thực đơn tối',
      fileUrl: 'https://example.com/menu.pdf',
      imageUrl: 'https://res.cloudinary.com/savoris/image/upload/v1/menu-cover.webp',
      branchId: 1,
    })))
  })
})
