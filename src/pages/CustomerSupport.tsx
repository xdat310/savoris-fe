import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiError, get, post, getWithHeaders, postWithHeaders } from '../api/client'
import './customer-support.css'

type Ticket = { referenceCode: string; accessToken: string; status: string }
type Handoff = { question?: string; answer?: string }
type Branch = { id: number; name: string; code: string }
type SupportMessage = { id: number; senderType: 'CUSTOMER' | 'STAFF' | 'ASSISTANT'; body: string; createdAt: string }
const ACTIVE_TICKET_KEY = 'alibibee.support.active'

function readActiveTicket(): Ticket | null {
  try { return JSON.parse(sessionStorage.getItem(ACTIVE_TICKET_KEY) ?? 'null') as Ticket | null } catch { return null }
}

export function CustomerSupport() {
  const { state } = useLocation()
  const handoff = (state ?? {}) as Handoff
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [branchId, setBranchId] = useState('')
  const [issue, setIssue] = useState(handoff.question ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(readActiveTicket)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [chatDraft, setChatDraft] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  useEffect(() => { void get<Branch[]>('/public/branches').then(setBranches).catch(() => setBranches([])) }, [])

  useEffect(() => {
    if (!activeTicket) return
    let live = true
    const refresh = async () => {
      try {
        const result = await getWithHeaders<SupportMessage[]>(`/public/support-tickets/${activeTicket.referenceCode}/messages`, { 'X-Support-Token': activeTicket.accessToken })
        if (live) setMessages(result)
      } catch { if (live) setError('Mình đang thử kết nối lại với nhân viên hỗ trợ…') }
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 4000)
    return () => { live = false; window.clearInterval(timer) }
  }, [activeTicket])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const result = await post<Ticket>('/public/support-tickets', {
        customerName: name, customerPhone: phone, branchId: branchId ? Number(branchId) : null,
        issue, conversationContext: handoff.answer ? `Trả lời của trợ lý: ${handoff.answer}` : null,
      })
      sessionStorage.setItem(ACTIVE_TICKET_KEY, JSON.stringify(result))
      setActiveTicket(result)
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Không gửi được yêu cầu, vui lòng thử lại.') }
    finally { setBusy(false) }
  }

  async function sendChatMessage(event: FormEvent) {
    event.preventDefault()
    const body = chatDraft.trim()
    if (!activeTicket || !body || chatBusy) return
    setChatBusy(true); setError('')
    try {
      const result = await postWithHeaders<SupportMessage[]>(`/public/support-tickets/${activeTicket.referenceCode}/messages`, { body }, { 'X-Support-Token': activeTicket.accessToken })
      setMessages(result); setChatDraft('')
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Chưa gửi được tin nhắn. Bạn thử lại nhé.') }
    finally { setChatBusy(false) }
  }

  function senderName(senderType: SupportMessage['senderType']) {
    return senderType === 'CUSTOMER' ? 'Bạn' : senderType === 'STAFF' ? 'Nhân viên Savoris' : 'Trợ lí alibibee'
  }

  return <main className="customer-support">
    <header className="customer-support__hero"><a href="/" className="customer-support__brand">SAVORIS <span>HOSPITALITY</span></a><p className="customer-support__eyebrow">CHĂM SÓC KHÁCH HÀNG</p>
      <h1>{activeTicket ? 'Cuộc trò chuyện của bạn' : 'Chúng tôi luôn sẵn sàng lắng nghe'}</h1>
      <p>{activeTicket ? 'Nhân viên Savoris sẽ tiếp tục hỗ trợ bạn trong khung chat này.' : 'Gửi yêu cầu đến đội ngũ Savoris. Cuộc trò chuyện được lưu trong phiên trình duyệt này.'}</p>
    </header>
    {activeTicket ? <section className="support-chat" aria-label={`Cuộc trò chuyện ${activeTicket.referenceCode}`}>
      <div className="support-chat__ticket"><span className="customer-support__eyebrow">YÊU CẦU CỦA BẠN</span><strong>{activeTicket.referenceCode}</strong><span>Trợ lí alibibee đã chuyển yêu cầu đến nhân viên Savoris.</span></div>
      <div className="support-chat__messages" aria-live="polite">
        {messages.length === 0 && <p className="support-chat__waiting">Đang kết nối với nhân viên hỗ trợ…</p>}
        {messages.map(message => <article key={message.id} className={`support-chat__message support-chat__message--${message.senderType.toLowerCase()}`}>
          <small>{senderName(message.senderType)}{message.createdAt && <time>{new Date(message.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</time>}</small><p>{message.body}</p>
        </article>)}
      </div>
      {error && <p role="status">{error}</p>}
      <form className="support-chat__form" onSubmit={sendChatMessage}>
        <label className="sr-only" htmlFor="support-chat-message">Tin nhắn cho nhân viên</label>
        <textarea id="support-chat-message" aria-label="Tin nhắn cho nhân viên" rows={2} maxLength={2000} placeholder="Nhập tin nhắn…" value={chatDraft} onChange={event => setChatDraft(event.target.value)} />
        <button type="submit" disabled={!chatDraft.trim() || chatBusy}>{chatBusy ? 'Đang gửi…' : 'Gửi'}</button>
      </form>
    </section> :
      <form className="customer-support__form" onSubmit={submit}>
        <label>Họ và tên<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Số điện thoại<input required minLength={8} maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} /></label>
        <label>Chi nhánh liên quan (nếu có)<select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="">Chưa chọn</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}</select></label>
        <label>Bạn cần hỗ trợ gì?<textarea required maxLength={2000} rows={5} value={issue} onChange={e => setIssue(e.target.value)} /></label>
        <p className="support-chat__intro"><strong>Trợ lí alibibee</strong><br />Xin chào, tôi sẽ chuyển cuộc trò chuyện này cho nhân viên Savoris. Cho tôi xin tên và số điện thoại để nhân viên hỗ trợ bạn nhé.</p>
        {handoff.answer && <details className="customer-support__context"><summary>Ngữ cảnh từ trợ lý</summary><p>{handoff.answer}</p></details>}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu hỗ trợ'}</button>
      </form>}
  </main>
}
