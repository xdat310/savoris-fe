import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ApiError, api, get } from '../api/client'
import './support-inbox.css'

type Ticket = { id: number; referenceCode: string; customerName: string; customerPhone: string; branchId: number | null; issue: string; conversationContext?: string; status: string; createdAt: string; updatedAt?: string }
type Message = { id: number; senderType: 'CUSTOMER' | 'STAFF' | 'ASSISTANT'; body: string; createdAt: string }
type Branch = { id: number; name: string; code?: string }
type Filter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
const LABEL: Record<string, string> = { OPEN: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết' }
const FILTERS: { key: Filter; label: string }[] = [{ key: 'ALL', label: 'Tất cả' }, { key: 'OPEN', label: 'Mới' }, { key: 'IN_PROGRESS', label: 'Đang xử lý' }, { key: 'RESOLVED', label: 'Đã giải quyết' }]
const timeLabel = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : ''

function TicketConversation({ ticket }: { ticket: Ticket }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  async function loadMessages() {
    try { setMessages(await get<Message[]>(`/support-tickets/${ticket.id}/messages`)); setError('') }
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
    if (!body || busy || ticket.status === 'RESOLVED') return
    setBusy(true); setError('')
    try { setMessages(await api<Message[]>('POST', `/support-tickets/${ticket.id}/messages`, { body })); setDraft('') }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Không gửi được phản hồi.') }
    finally { setBusy(false) }
  }
  const sender = (type: Message['senderType']) => type === 'CUSTOMER' ? ticket.customerName : type === 'STAFF' ? 'Nhân viên Savoris' : 'Trợ lí alibibee'
  return <section className="support-inbox__conversation" aria-label={`Hội thoại ${ticket.referenceCode}`}>
    <header className="support-inbox__panel-head"><div><span className="support-inbox__eyebrow">TRAO ĐỔI TRỰC TIẾP</span><h2>Hội thoại</h2></div><span className={`support-inbox__status support-inbox__status--${ticket.status.toLowerCase()}`}>{LABEL[ticket.status] ?? ticket.status}</span></header>
    <div className="support-inbox__messages" aria-live="polite">
      {messages.length === 0 && <p className="support-inbox__empty">Chưa có tin nhắn trong hội thoại.</p>}
      {messages.map(message => <article className={`support-inbox__message support-inbox__message--${message.senderType.toLowerCase()}`} key={message.id}>
        <small>{sender(message.senderType)}{message.createdAt && <time>{timeLabel(message.createdAt)}</time>}</small><p>{message.body}</p>
      </article>)}<div ref={endRef} />
    </div>
    {error && <p className="support-inbox__error" role="alert">{error}</p>}
    {ticket.status === 'RESOLVED' ? <p className="support-inbox__closed">Yêu cầu đã đóng. Hãy mở lại ticket bằng cách nhận xử lý nếu cần tiếp tục trao đổi.</p> :
      <form className="support-inbox__reply" onSubmit={send}>
        <label className="sr-only" htmlFor={`support-reply-${ticket.id}`}>Trả lời khách</label>
        <textarea id={`support-reply-${ticket.id}`} aria-label="Trả lời khách" rows={2} maxLength={2000} placeholder="Nhập phản hồi cho khách…" value={draft} onChange={event => setDraft(event.target.value)} />
        <button type="submit" disabled={!draft.trim() || busy}>{busy ? 'Đang gửi…' : 'Gửi phản hồi'}</button>
      </form>}
  </section>
}

export function SupportInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [error, setError] = useState('')
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  async function load() {
    try { setTickets(await get<Ticket[]>('/support-tickets')); setError(''); setLoadFailed(false) }
    catch (cause) { setLoadFailed(true); setError(cause instanceof ApiError ? cause.message : 'Không tải được yêu cầu hỗ trợ.') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    void load()
    void get<Branch[]>('/public/branches').then(setBranches).catch(() => setBranches([]))
    const timer = window.setInterval(() => { void load() }, 15000)
    return () => window.clearInterval(timer)
  }, [])
  const counts = useMemo(() => ({ ALL: tickets.length, OPEN: tickets.filter(t => t.status === 'OPEN').length, IN_PROGRESS: tickets.filter(t => t.status === 'IN_PROGRESS').length, RESOLVED: tickets.filter(t => t.status === 'RESOLVED').length }), [tickets])
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('vi')
    return tickets.filter(ticket => (filter === 'ALL' || ticket.status === filter) && (!needle || [ticket.referenceCode, ticket.customerName, ticket.customerPhone, ticket.issue].some(value => value?.toLocaleLowerCase('vi').includes(needle))))
  }, [tickets, filter, search])
  const selected = visible.find(ticket => ticket.id === selectedId) ?? visible[0] ?? null
  const branchName = selected?.branchId == null ? 'Chưa chọn chi nhánh' : branches.find(branch => branch.id === selected.branchId)?.name ?? `Chi nhánh #${selected.branchId}`
  async function update(ticket: Ticket, status: string) {
    try { await api('PATCH', `/support-tickets/${ticket.id}`, { status }); await load() }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Không cập nhật được trạng thái.') }
  }
  return <main className="support-inbox">
    <header className="support-inbox__top"><div><span className="support-inbox__eyebrow">SAVORIS · SERVICE DESK</span><h1>Hỗ trợ khách hàng</h1><p>Tiếp nhận yêu cầu và trò chuyện trực tiếp với khách tại chi nhánh của bạn.</p></div><button className="support-inbox__refresh" onClick={() => void load()} aria-label="Làm mới yêu cầu">Làm mới</button></header>
    {error && <p className="support-inbox__error" role="alert">{error}</p>}
    <div className="support-inbox__filters" role="group" aria-label="Lọc yêu cầu">
      {FILTERS.map(item => <button key={item.key} className={filter === item.key ? 'is-active' : ''} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}<span>{counts[item.key]}</span></button>)}
      <label className="support-inbox__search"><span className="sr-only">Tìm yêu cầu hỗ trợ</span><input aria-label="Tìm yêu cầu hỗ trợ" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo tên, SĐT hoặc mã yêu cầu…" /></label>
    </div>
    <div className="support-inbox__workspace">
      <aside className="support-inbox__ticket-list" aria-label="Danh sách ticket">
        <div className="support-inbox__list-head"><span>YÊU CẦU</span><strong>{visible.length}</strong></div>
        {loading && <p className="support-inbox__empty">Đang tải yêu cầu…</p>}
        {!loading && visible.length === 0 && <p className="support-inbox__empty">{loadFailed ? 'Không tải được danh sách yêu cầu.' : 'Không có yêu cầu phù hợp.'}</p>}
        {visible.map(ticket => <button key={ticket.id} className={`support-inbox__ticket${selected?.id === ticket.id ? ' is-selected' : ''}`} onClick={() => setSelectedId(ticket.id)} aria-pressed={selected?.id === ticket.id}>
          <span className="support-inbox__ticket-top"><strong>{ticket.referenceCode}</strong><time>{timeLabel(ticket.createdAt)}</time></span><span className="support-inbox__customer-name">{ticket.customerName}</span><span className="support-inbox__preview">{ticket.issue}</span><span className={`support-inbox__status support-inbox__status--${ticket.status.toLowerCase()}`}>{LABEL[ticket.status] ?? ticket.status}</span>
        </button>)}
      </aside>
      {selected ? <>
        <TicketConversation key={selected.id} ticket={selected} />
        <aside className="support-inbox__details" aria-label="Thông tin yêu cầu">
          <span className="support-inbox__eyebrow">HỒ SƠ YÊU CẦU</span><h2>{selected.referenceCode}</h2>
          <div className="support-inbox__customer"><span className="support-inbox__avatar">{selected.customerName.trim().charAt(0)}</span><div><strong>{selected.customerName}</strong><a href={`tel:${selected.customerPhone}`}>{selected.customerPhone}</a></div></div>
          <dl><div><dt>Chi nhánh</dt><dd>{branchName}</dd></div><div><dt>Ngày tạo</dt><dd>{timeLabel(selected.createdAt)}</dd></div><div><dt>Trạng thái</dt><dd><span className={`support-inbox__status support-inbox__status--${selected.status.toLowerCase()}`}>{LABEL[selected.status] ?? selected.status}</span></dd></div></dl>
          <div className="support-inbox__issue"><span className="support-inbox__eyebrow">NỘI DUNG BAN ĐẦU</span><p>{selected.issue}</p></div>
          {selected.conversationContext && <details className="support-inbox__context"><summary>Ngữ cảnh từ trợ lý</summary><p>{selected.conversationContext}</p></details>}
          <div className="support-inbox__actions">
            {selected.status === 'OPEN' && <button className="support-inbox__primary" onClick={() => void update(selected, 'IN_PROGRESS')}>Nhận xử lý</button>}
            {selected.status !== 'RESOLVED' && <button className="support-inbox__secondary" onClick={() => void update(selected, 'RESOLVED')}>Đánh dấu đã giải quyết</button>}
            {selected.status === 'RESOLVED' && <button className="support-inbox__secondary" onClick={() => void update(selected, 'IN_PROGRESS')}>Mở lại yêu cầu</button>}
          </div>
        </aside>
      </> : <section className="support-inbox__no-selection"><span>✦</span><h2>{loading ? 'Đang kết nối hộp thư' : loadFailed ? 'Hộp thư chưa kết nối' : 'Chưa có yêu cầu hỗ trợ'}</h2><p>{loading || loadFailed ? 'Các yêu cầu trong phạm vi chi nhánh sẽ xuất hiện tại đây khi kết nối được khôi phục.' : 'Khi khách gửi yêu cầu, bạn có thể tiếp nhận và trò chuyện tại đây.'}</p></section>}
    </div>
  </main>
}
