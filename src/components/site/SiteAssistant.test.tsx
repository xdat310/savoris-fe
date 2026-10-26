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
    fireEvent.click(screen.getByRole('button', { name: 'Mở Trợ lí alibibee' }))
    expect(screen.getByText('Trợ lí alibibee')).toBeInTheDocument()
    expect(screen.getByText('Xin chào, tôi có thể giúp gì cho bạn?')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Ảnh đại diện Trợ lí alibibee' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đóng trợ lý Savoris' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đóng trợ lý' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đặt bàn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chi nhánh & giờ mở cửa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thực đơn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mang về & thanh toán' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vấn đề khác' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Tin nhắn' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Vấn đề khác' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), { target: { value: 'Chi nhánh nào đang mở?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(await screen.findByText('Chi nhánh Hoàn Kiếm đang mở.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toHaveValue('')
    expect(screen.getByText('Chi nhánh nào đang mở?')).toBeInTheDocument()
    expect(screen.queryByText('Câu trả lời này đã giải quyết được vấn đề của bạn chưa?' )).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đã giải quyết' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Chưa, vẫn cần hỗ trợ' })).not.toBeInTheDocument()
    expect(send).toHaveBeenCalledWith('/public/ai/chat', expect.objectContaining({ message: 'Chi nhánh nào đang mở?', agentMode: true }))
  })

  it('shows a waiting state while the backend is answering', async () => {
    let finish: (value: unknown) => void = () => undefined
    send.mockReturnValue(new Promise(resolve => { finish = resolve }) as never)
    render(<MemoryRouter><SiteAssistant /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Mở Trợ lí alibibee' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vấn đề khác' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), { target: { value: 'Cho xem thực đơn' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(screen.getByText('Đang tìm thông tin…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi tin nhắn' })).toBeDisabled()
    finish({ reply: 'Mình sẽ tìm thực đơn cho bạn.' })
    expect(await screen.findByText('Mình sẽ tìm thực đơn cho bạn.')).toBeInTheDocument()
  })

  it('does not send a message when Enter only confirms Vietnamese text composition', async () => {
    send.mockResolvedValue({ reply: 'Mình có thể giúp bạn.' } as never)
    render(<MemoryRouter><SiteAssistant /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Mở Trợ lí alibibee' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vấn đề khác' }))
    const input = screen.getByRole('textbox', { name: 'Tin nhắn' })
    fireEvent.change(input, { target: { value: 'Tôi muốn đặt bàn' } })

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', isComposing: true })

    expect(send).not.toHaveBeenCalled()
    expect(input).toHaveValue('Tôi muốn đặt bàn')

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', isComposing: false })
    expect(await screen.findByText('Mình có thể giúp bạn.')).toBeInTheDocument()
    expect(send).toHaveBeenCalledTimes(1)
    expect(input).toHaveValue('')
  })

  it('routes an unresolved answer to customer support with the question context', async () => {
    send.mockResolvedValue({ reply: 'Bạn có thể xem các chi nhánh.' } as never)
    render(<MemoryRouter initialEntries={['/']}><Routes><Route path="/" element={<SiteAssistant />} /><Route path="/ho-tro" element={<RoutedSupport />} /></Routes></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Mở Trợ lí alibibee' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chi nhánh & giờ mở cửa' }))
    await screen.findByText('Bạn có thể xem các chi nhánh.')
    expect(screen.queryByRole('button', { name: 'Kết nối nhân viên hỗ trợ' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Chưa, vẫn cần hỗ trợ' }))
    expect(screen.getByText('Mình hiểu rồi. Bạn muốn chuyển cuộc trò chuyện này cho nhân viên Savoris chứ?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Kết nối nhân viên hỗ trợ' }))
    expect(await screen.findByText('Thông tin chi nhánh và giờ mở cửa')).toBeInTheDocument()
    expect(send).toHaveBeenCalledWith('/public/ai/chat', expect.objectContaining({ message: expect.stringMatching(/chi nhánh|giờ mở cửa/i) }))
  })

})
