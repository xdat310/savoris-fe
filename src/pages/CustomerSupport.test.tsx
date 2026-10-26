import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { post } from '../api/client'
import { CustomerSupport } from './CustomerSupport'

vi.mock('../api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return { ...actual, post: vi.fn() }
})

describe('CustomerSupport', () => {
  afterEach(() => cleanup())
  it('submits the handoff and shows the ticket reference', async () => {
    vi.mocked(post).mockResolvedValue({ referenceCode: 'SV-ABC12345' } as never)
    render(<MemoryRouter initialEntries={[{ pathname: '/ho-tro', state: { question: 'Món này có đậu phộng không?', answer: 'Mình chưa có dữ liệu dị ứng.' } }]}><CustomerSupport /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn An' } })
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0912345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu hỗ trợ' }))
    expect(await screen.findByText('SV-ABC12345')).toBeInTheDocument()
    expect(vi.mocked(post)).toHaveBeenCalledWith('/public/support-tickets', expect.objectContaining({ issue: 'Món này có đậu phộng không?', customerPhone: '0912345678' }))
  })
})
