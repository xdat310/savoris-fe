import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, api, get } from '../api/client'
import './support-inbox.css'

type Ticket = { id: number; referenceCode: string; customerName: string; customerPhone: string; branchId: number | null; issue: string; conversationContext?: string; status: string; createdAt: string }
type Message = { id: number; senderType: 'CUSTOMER' | 'STAFF' | 'ASSISTANT'; body: string; createdAt: string }
const LABEL: Record<string, string> = { OPEN: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết' }

function TicketConversation({ ticket }: { ticket: Ticket }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  async function loadMessages() {
    try { setMessages(await get<Message[]>(`/support-tickets/${ticket.id}/messages`)) }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Không tải được hội thoại.') }
  }
  useEffect(() => {
    void loadMessages()
    const timer = window.setInterval(() => { void loadMessages() }, 5000)
    return () => window.clearInterval(timer)
  }, [ticket.id])
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [messages])
  async function send(event: FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true); setError('')
    try { setMessages(await api<Message[]>('POST', `/support-tickets/${ticket.id}/messages`, { body })); setDraft('') }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Không gửi được phản hồi.') }
    finally { setBusy(false) }
  }
  const sender = (type: Message['senderType']) => type === 'CUSTOMER' ? ticket.customerName : type === 'STAFF' ? 'Bạn · nhân viên' : 'Trợ lí alibibee'
  return <section className="support-inbox__conversation" aria-label={`Hội thoại ${ticket.referenceCode}`}>
    <h3>Hội thoại với khách</h3>
    <div className="support-inbox__messages" aria-live="polite">
      {messages.map(message => <article className={`support-inbox__message support-inbox__message--${message.senderType.toLowerCase()}`} key={message.id}>
        <small>{sender(message.senderType)}</small><p>{message.body}</p>
      </article>)}<div ref={endRef} />
    </div>
    {error && <p role="alert">{error}</p>}
    <form className="support-inbox__reply" onSubmit={send}>
      <label className="sr-only" htmlFor={`support-reply-${ticket.id}`}>Trả lời khách</label>
      <textarea id={`support-reply-${ticket.id}`} aria-label="Trả lời khách" rows={2} maxLength={2000} placeholder="Nhập phản hồi cho khách…" value={draft} onChange={event => setDraft(event.target.value)} />
      <button type="submit" disabled={!draft.trim() || busy}>{busy ? 'Đang gửi…' : 'Gửi phản hồi'}</button>
    </form>
  </section>
}

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
  useEffect(() => {
    void load()
    const timer = window.setInterval(() => { void load() }, 15000)
    return () => window.clearInterval(timer)
  }, [])
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
      <TicketConversation ticket={ticket} />
      <div style={{ display: 'flex', gap: '.5rem' }}>
        {ticket.status !== 'IN_PROGRESS' && ticket.status !== 'RESOLVED' && <button onClick={() => void update(ticket, 'IN_PROGRESS')}>Nhận xử lý</button>}
        {ticket.status !== 'RESOLVED' && <button onClick={() => void update(ticket, 'RESOLVED')}>Đánh dấu đã giải quyết</button>}
      </div>
    </article>)}</div>
  </section>
}
