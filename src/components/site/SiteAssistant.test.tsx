import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../../api/client'
import { SiteAssistant } from './SiteAssistant'

vi.mock('../../api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../../api/client')>()
  return { ...actual, post: vi.fn() }
})

const send = vi.mocked(post)

describe('SiteAssistant', () => {
  beforeEach(() => send.mockReset())
  afterEach(() => cleanup())

  it('submits the guest message and shows the assistant reply', async () => {
    send.mockResolvedValue({ reply: 'Chi nhánh Hoàn Kiếm đang mở.' } as never)
    render(<SiteAssistant />)
    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý Savoris' }))
    expect(screen.queryByRole('button', { name: 'Đóng trợ lý Savoris' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đóng trợ lý' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), { target: { value: 'Chi nhánh nào đang mở?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(await screen.findByText('Chi nhánh Hoàn Kiếm đang mở.')).toBeInTheDocument()
    expect(send).toHaveBeenCalledWith('/public/ai/chat', expect.objectContaining({ message: 'Chi nhánh nào đang mở?' }))
  })

  it('shows a waiting state while the backend is answering', async () => {
    let finish: (value: unknown) => void = () => undefined
    send.mockReturnValue(new Promise(resolve => { finish = resolve }) as never)
    render(<SiteAssistant />)
    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý Savoris' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), { target: { value: 'Cho xem thực đơn' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(screen.getByText('Đang tìm thông tin…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi tin nhắn' })).toBeDisabled()
    finish({ reply: 'Mình sẽ tìm thực đơn cho bạn.' })
    expect(await screen.findByText('Mình sẽ tìm thực đơn cho bạn.')).toBeInTheDocument()
  })
})
