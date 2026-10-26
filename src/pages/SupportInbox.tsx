import { useEffect, useState } from 'react'
import { ApiError, api, get } from '../api/client'

type Ticket = { id: number; referenceCode: string; customerName: string; customerPhone: string; branchId: number | null; issue: string; conversationContext?: string; status: string; createdAt: string }
const LABEL: Record<string, string> = { OPEN: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết' }

export function SupportInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  async function load() {
    setError('')
    try { setTickets(await get<Ticket[]>('/support-tickets')) }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Không tải được yêu cầu hỗ trợ.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  async function update(ticket: Ticket, status: string) {
    try { await api('PATCH', `/support-tickets/${ticket.id}`, { status }); await load() }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Không cập nhật được trạng thái.') }
  }
  return <section style={{ padding: '1.5rem' }}>
    <h2>Yêu cầu hỗ trợ khách hàng</h2><p>Các yêu cầu thuộc phạm vi chi nhánh được phân quyền.</p>
    {error && <p role="alert">{error}</p>}{loading && <p>Đang tải…</p>}
    {!loading && tickets.length === 0 && <p>Chưa có yêu cầu hỗ trợ.</p>}
    <div style={{ display: 'grid', gap: '1rem' }}>{tickets.map(ticket => <article key={ticket.id} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: 12 }}>
      <header><strong>{ticket.referenceCode}</strong> · {LABEL[ticket.status] ?? ticket.status}</header>
      <p>{ticket.customerName} · <a href={`tel:${ticket.customerPhone}`}>{ticket.customerPhone}</a></p>
      <p>{ticket.issue}</p>{ticket.conversationContext && <details><summary>Ngữ cảnh hội thoại</summary><p>{ticket.conversationContext}</p></details>}
      <div style={{ display: 'flex', gap: '.5rem' }}>
        {ticket.status !== 'IN_PROGRESS' && ticket.status !== 'RESOLVED' && <button onClick={() => void update(ticket, 'IN_PROGRESS')}>Nhận xử lý</button>}
        {ticket.status !== 'RESOLVED' && <button onClick={() => void update(ticket, 'RESOLVED')}>Đánh dấu đã giải quyết</button>}
      </div>
    </article>)}</div>
  </section>
}
