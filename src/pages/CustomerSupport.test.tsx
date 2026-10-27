import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { getWithHeaders, post, postWithHeaders } from '../api/client'
import { CustomerSupport } from './CustomerSupport'

vi.mock('../api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return { ...actual, post: vi.fn(), getWithHeaders: vi.fn(), postWithHeaders: vi.fn() }
})

describe('CustomerSupport', () => {
  afterEach(() => { cleanup(); sessionStorage.clear() })
  it('submits the handoff and shows the ticket reference', async () => {
    vi.mocked(post).mockResolvedValue({ referenceCode: 'SV-ABC12345', accessToken: 'test-access-token', status: 'OPEN' } as never)
    vi.mocked(getWithHeaders).mockResolvedValue([
      { id: 1, senderType: 'CUSTOMER', body: 'Món này có đậu phộng không?' },
      { id: 2, senderType: 'ASSISTANT', body: 'Xin chào, tôi là Trợ lí alibibee.' },
    ] as never)
    vi.mocked(postWithHeaders).mockResolvedValue([
      { id: 1, senderType: 'CUSTOMER', body: 'Món này có đậu phộng không?' },
      { id: 2, senderType: 'ASSISTANT', body: 'Xin chào, tôi là Trợ lí alibibee.' },
      { id: 3, senderType: 'CUSTOMER', body: 'Mình bị dị ứng đậu phộng.' },
      { id: 4, senderType: 'STAFF', body: 'Nhân viên đang kiểm tra cho bạn.' },
    ] as never)
    render(<MemoryRouter initialEntries={[{ pathname: '/ho-tro', state: { question: 'Món này có đậu phộng không?', answer: 'Mình chưa có dữ liệu dị ứng.' } }]}><CustomerSupport /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn An' } })
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0912345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu hỗ trợ' }))
    expect(await screen.findByText(/SV-ABC12345/)).toBeInTheDocument()
    expect(await screen.findByText('Xin chào, tôi là Trợ lí alibibee.')).toBeInTheDocument()
    expect(vi.mocked(post)).toHaveBeenCalledWith('/public/support-tickets', expect.objectContaining({ issue: 'Món này có đậu phộng không?', customerPhone: '0912345678' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn cho nhân viên' }), { target: { value: 'Mình bị dị ứng đậu phộng.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }))
    expect(await screen.findByText('Nhân viên đang kiểm tra cho bạn.')).toBeInTheDocument()
    expect(postWithHeaders).toHaveBeenCalledWith('/public/support-tickets/SV-ABC12345/messages', { body: 'Mình bị dị ứng đậu phộng.' }, { 'X-Support-Token': 'test-access-token' })
  })

  it('restores the existing conversation from this browser session', async () => {
    sessionStorage.setItem('alibibee.support.active', JSON.stringify({ referenceCode: 'SV-KEEP1234', accessToken: 'session-token', status: 'IN_PROGRESS' }))
    vi.mocked(getWithHeaders).mockResolvedValue([{ id: 8, senderType: 'STAFF', body: 'Nhân viên đã nhận yêu cầu.' }] as never)
    render(<MemoryRouter initialEntries={['/ho-tro']}><CustomerSupport /></MemoryRouter>)
    expect(await screen.findByText('SV-KEEP1234')).toBeInTheDocument()
    expect(await screen.findByText('Nhân viên đã nhận yêu cầu.')).toBeInTheDocument()
    expect(getWithHeaders).toHaveBeenCalledWith('/public/support-tickets/SV-KEEP1234/messages', { 'X-Support-Token': 'session-token' })
  })
})
