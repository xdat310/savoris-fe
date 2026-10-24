import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BookingPage } from './BookingPage'

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))
vi.mock('../api/client', () => ({ ApiError: class extends Error {}, get: getMock, post: postMock }))

describe('Public booking page', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockImplementation((path: string) => path === '/public/site'
      ? Promise.resolve({ branches: [{ id: 1, code: 'CN01', name: 'Hoàn Kiếm', slug: 'hoan-kiem', address: 'Số 1 phố Mẫu' }] })
      : Promise.resolve([{ slotTime: '2026-10-26T15:30:00', available: true }]))
    postMock.mockResolvedValue({ id: 41 })
  })

  it('prefills the branch slug, offers API slots, and confirms the created reservation', async () => {
    render(<MemoryRouter initialEntries={['/dat-ban?chi-nhanh=hoan-kiem']}><Routes><Route path="/dat-ban" element={<BookingPage />} /></Routes></MemoryRouter>)
    expect(await screen.findByText('Số 1 phố Mẫu')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: '15:30' }))
    fireEvent.change(screen.getByLabelText('Họ tên'), { target: { value: 'Khách demo' } })
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0912345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu đặt bàn' }))
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/reservations/guest', expect.objectContaining({
      branchId: 1, guestName: 'Khách demo', guestPhone: '0912345678', reservationDate: '2026-10-26T15:30:00', numberOfGuests: 2,
    })))
    expect(await screen.findByText('DB-41')).toBeInTheDocument()
  })
})
