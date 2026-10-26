import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebsiteCMSPage } from './WebsiteCMSPage'
import { getWebsiteCms, saveWebsiteHoursWeek } from '../api/site'

vi.mock('../api/site', () => ({
  createWebsiteItem: vi.fn(),
  deleteWebsiteItem: vi.fn(),
  getWebsiteCms: vi.fn(),
  reorderWebsiteItems: vi.fn(),
  saveBranchPage: vi.fn(),
  saveWebsiteHoursWeek: vi.fn(),
  saveWebsiteSettings: vi.fn(),
  updateWebsiteItem: vi.fn(),
  uploadWebsiteMedia: vi.fn(),
}))

describe('WebsiteCMSPage content tabs', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getWebsiteCms).mockResolvedValue({
      settings: {},
      branches: [{ id: 1, name: 'CN1', slug: 'cn1' }],
      branchPages: [],
    })
  })

  it('does not expose CMS tabs removed from the backend', async () => {
    render(<WebsiteCMSPage />)
    await screen.findByRole('heading', { name: 'Website' })
    expect(screen.getAllByRole('button', { name: 'Thông tin trang' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Khối nội dung' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thư viện ảnh' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Giờ mở cửa' })).toBeInTheDocument()
    for (const removed of ['Ưu đãi', 'Giải thưởng', 'Đánh giá', 'Thực đơn PDF']) {
      expect(screen.queryByRole('button', { name: removed })).toBeNull()
    }
  })

  it('limits a branch manager to branch content and hides chain settings', async () => {
    render(<WebsiteCMSPage branchOnly />)
    await screen.findByRole('heading', { name: 'Website' })

    expect(screen.queryByRole('button', { name: 'Cài đặt chung' })).toBeNull()
    expect(screen.queryByLabelText('Chi nhánh')).toBeNull()
    expect(screen.getByRole('button', { name: 'Thông tin trang' })).toHaveClass('is-active')
  })

  it('requires opening and closing times unless the whole day is closed', async () => {
    render(<WebsiteCMSPage />)
    await screen.findByRole('heading', { name: 'Website' })
    fireEvent.click(screen.getByRole('button', { name: 'Giờ mở cửa' }))

    expect(screen.getAllByLabelText('Giờ mở cửa')[0]).toBeRequired()
    expect(screen.getAllByLabelText('Giờ đóng cửa')[0]).toBeRequired()

    fireEvent.click(screen.getAllByLabelText('Nghỉ cả ngày')[0])
    expect(screen.getAllByLabelText('Giờ mở cửa')[0]).not.toBeRequired()
    expect(screen.getAllByLabelText('Giờ đóng cửa')[0]).not.toBeRequired()
  })

  it('saves the seven opening-hour rows in one weekly request', async () => {
    render(<WebsiteCMSPage />)
    await screen.findByRole('heading', { name: 'Website' })
    fireEvent.change(screen.getByLabelText('Phạm vi website'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Giờ mở cửa' }))
    for (const input of screen.getAllByLabelText('Giờ mở cửa')) fireEvent.change(input, { target: { value: '17:00' } })
    for (const input of screen.getAllByLabelText('Giờ đóng cửa')) fireEvent.change(input, { target: { value: '23:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu giờ mở cửa' }))
    await waitFor(() => expect(saveWebsiteHoursWeek).toHaveBeenCalledWith(1, expect.arrayContaining([
      expect.objectContaining({ weekday: 1 }), expect.objectContaining({ weekday: 7 }),
    ])))
    expect(vi.mocked(saveWebsiteHoursWeek).mock.calls[0][1]).toHaveLength(7)
  })
})
