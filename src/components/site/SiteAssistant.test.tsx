import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { post } from '../../api/client'
import { SiteAssistant } from './SiteAssistant'

vi.mock('../../api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../../api/client')>()
  return { ...actual, post: vi.fn() }
})

const send = vi.mocked(post)
function RoutedSupport() { const location = useLocation(); return <p>{(location.state as { question?: string })?.question}</p> }

describe('SiteAssistant', () => {
  beforeEach(() => send.mockReset())
  afterEach(() => cleanup())

  it('submits the guest message and shows the assistant reply', async () => {
    send.mockResolvedValue({ reply: 'Chi nhánh Hoàn Kiếm đang mở.' } as never)
    render(<MemoryRouter><SiteAssistant /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý Savoris' }))
    expect(screen.queryByRole('button', { name: 'Đóng trợ lý Savoris' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đóng trợ lý' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), { target: { value: 'Chi nhánh nào đang mở?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(await screen.findByText('Chi nhánh Hoàn Kiếm đang mở.')).toBeInTheDocument()
    expect(screen.getByText('Câu trả lời này đã giải quyết được vấn đề của bạn chưa?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đã giải quyết' }))
    expect(screen.getByText(/Cảm ơn bạn đã xác nhận/)).toBeInTheDocument()
    expect(send).toHaveBeenCalledWith('/public/ai/chat', expect.objectContaining({ message: 'Chi nhánh nào đang mở?' }))
  })

  it('shows a waiting state while the backend is answering', async () => {
    let finish: (value: unknown) => void = () => undefined
    send.mockReturnValue(new Promise(resolve => { finish = resolve }) as never)
    render(<MemoryRouter><SiteAssistant /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý Savoris' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), { target: { value: 'Cho xem thực đơn' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(screen.getByText('Đang tìm thông tin…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi tin nhắn' })).toBeDisabled()
    finish({ reply: 'Mình sẽ tìm thực đơn cho bạn.' })
    expect(await screen.findByText('Mình sẽ tìm thực đơn cho bạn.')).toBeInTheDocument()
  })

  it('routes an unresolved answer to customer support with the question context', async () => {
    send.mockResolvedValue({ reply: 'Bạn có thể xem các chi nhánh.' } as never)
    render(<MemoryRouter initialEntries={['/']}><Routes><Route path="/" element={<SiteAssistant />} /><Route path="/ho-tro" element={<RoutedSupport />} /></Routes></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý Savoris' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), { target: { value: 'Chi nhánh nào có chỗ ngồi ngoài trời?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))
    await screen.findByText('Bạn có thể xem các chi nhánh.')
    fireEvent.click(screen.getByRole('button', { name: 'Chưa, cần hỗ trợ' }))
    expect(await screen.findByText('Chi nhánh nào có chỗ ngồi ngoài trời?')).toBeInTheDocument()
  })

})
