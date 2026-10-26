import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, get } from '../api/client'
import { SupportInbox } from './SupportInbox'

vi.mock('../api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return { ...actual, get: vi.fn(), api: vi.fn() }
})

describe('SupportInbox', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('shows the customer thread and sends a staff reply into the same conversation', async () => {
    const ticket = {
      id: 41, referenceCode: 'SV-ABC12345', customerName: 'Nguyễn An', customerPhone: '0912345678',
      branchId: 3, issue: 'Món ăn có đậu phộng không?', status: 'OPEN', createdAt: '2026-10-26T10:00:00',
    }
    const history = [
      { id: 1, senderType: 'CUSTOMER', body: ticket.issue },
      { id: 2, senderType: 'ASSISTANT', body: 'Xin chào, tôi là Trợ lí alibibee.' },
    ]
    vi.mocked(get).mockImplementation(async path => path === '/support-tickets' ? [ticket] as never : history as never)
    vi.mocked(api).mockResolvedValue([...history,
      { id: 3, senderType: 'STAFF', body: 'Món này không có đậu phộng.' },
    ] as never)

    render(<SupportInbox />)
    expect(await screen.findByText('SV-ABC12345')).toBeInTheDocument()
    expect(await screen.findByText('Xin chào, tôi là Trợ lí alibibee.')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Trả lời khách' }), { target: { value: 'Món này không có đậu phộng.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }))
    expect(await screen.findByText('Món này không có đậu phộng.')).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('POST', '/support-tickets/41/messages', { body: 'Món này không có đậu phộng.' })
  })
})
