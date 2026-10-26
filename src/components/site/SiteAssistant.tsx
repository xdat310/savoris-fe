import { LoaderCircle, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, post } from '../../api/client'
import './site-assistant.css'

type Turn = { role: 'user' | 'assistant'; content: string }
type ChatResponse = { reply: string }

const GREETING = 'Xin chào, tôi có thể giúp gì cho bạn?'
const FAQ_TOPICS = [
  { label: 'Đặt bàn', message: 'Cách đặt bàn như thế nào?' },
  { label: 'Chi nhánh & giờ mở cửa', message: 'Thông tin chi nhánh và giờ mở cửa' },
  { label: 'Thực đơn', message: 'Cho tôi xem thực đơn' },
  { label: 'Mang về & thanh toán', message: 'Cách đặt món mang về và thanh toán' },
]

function isGreeting(message: string) {
  const normalized = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim()
  return /^(hi|hello|hey|alo|chao( ban)?|xin chao( ban)?)$/.test(normalized)
}

export function SiteAssistant() {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([{ role: 'assistant', content: GREETING }])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [resolved, setResolved] = useState<number[]>([])
  const [unresolved, setUnresolved] = useState<number[]>([])
  const [answerIndexes, setAnswerIndexes] = useState<number[]>([])
  const [otherQuestion, setOtherQuestion] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && (turns.length > 1 || otherQuestion)) inputRef.current?.focus()
  }, [open, otherQuestion, turns.length])
  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === 'function') endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, open])
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  async function sendMessage(text: string) {
    const message = text.trim()
    if (!message || busy) return
    if (isGreeting(message)) {
      setDraft('')
      setTurns(current => [...current,
        { role: 'user', content: message },
        { role: 'assistant', content: 'Xin chào, mình là trợ lí alibibee. Bạn cần mình hỗ trợ gì?' },
      ])
      return
    }
    const previous = turns.slice(-10)
    setTurns(current => [...current, { role: 'user', content: message }])
    setDraft('')
    setBusy(true)
    try {
      const result = await post<ChatResponse>('/public/ai/chat', { message, history: previous, agentMode: otherQuestion })
      setAnswerIndexes(current => [...current, turns.length + 1])
      setTurns(current => [...current, { role: 'assistant', content: result.reply }])
    } catch (cause) {
      const note = cause instanceof ApiError && cause.code === 'AI_PROVIDER_FAILED'
        ? 'Dịch vụ AI đang gặp sự cố khi xử lý câu hỏi. Tin nhắn vẫn được giữ lại; bạn có thể thử gửi lại sau.'
        : cause instanceof ApiError && cause.status === 503
          ? 'Trợ lý đang tạm nghỉ. Bạn có thể gọi trực tiếp cho chi nhánh hoặc thử lại sau.'
          : cause instanceof ApiError && cause.status === 429
            ? 'Trợ lý đang nhận nhiều câu hỏi. Chờ một chút rồi thử lại nhé.'
            : cause instanceof ApiError
              ? 'Trợ lý chưa xử lý được câu hỏi này. Bạn thử gửi lại sau nhé.'
              : 'Mình chưa kết nối được lúc này. Kiểm tra mạng rồi thử gửi lại nhé.'
      setTurns(current => [...current, { role: 'assistant', content: note }])
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(draft)
  }

  function chooseOtherQuestion() {
    setOtherQuestion(true)
    setTurns(current => [...current,
      { role: 'user', content: 'Vấn đề khác' },
      { role: 'assistant', content: 'Được nhé. Bạn mô tả vấn đề cần hỗ trợ cho mình.' },
    ])
  }

  return (
    <div className="site-assistant">
      {open && (
        <section className="site-assistant__panel" aria-label="Trợ lí alibibee">
          <header className="site-assistant__head">
            <img className="site-assistant__mark" src="/images/alibibee-chat-avatar.jpg" alt="Ảnh đại diện Trợ lí alibibee" />
            <div><strong>Trợ lí alibibee</strong><span>Trợ lý hỗ trợ khách hàng</span></div>
            <button className="site-assistant__close" type="button" aria-label="Đóng trợ lý" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
          </header>
          <div className="site-assistant__messages" aria-live="polite" aria-relevant="additions text">
            {turns.map((turn, index) => (
              <div key={`${index}-${turn.role}`}>
              <p className={`site-assistant__bubble site-assistant__bubble--${turn.role}`} key={`${index}-${turn.role}`}>
                {turn.content}
              </p>
              {turn.role === 'assistant' && !otherQuestion && answerIndexes.includes(index) && !resolved.includes(index) && !unresolved.includes(index) && (
                <div className="site-assistant__resolution" key={`resolution-${index}`}>
                  <span>Câu trả lời này đã giải quyết được vấn đề của bạn chưa?</span>
                  <button type="button" onClick={() => setResolved(current => [...current, index])}>Đã giải quyết</button>
                  <button type="button" onClick={() => setUnresolved(current => [...current, index])}>Chưa, vẫn cần hỗ trợ</button>
                </div>
              )}
              {turn.role === 'assistant' && !otherQuestion && answerIndexes.includes(index) && unresolved.includes(index) && (
                <div className="site-assistant__resolution" key={`handoff-${index}`}>
                  <span>Mình hiểu rồi. Bạn muốn chuyển cuộc trò chuyện này cho nhân viên Savoris chứ?</span>
                  <button type="button" onClick={() => {
                    const question = [...turns.slice(0, index)].reverse().find(item => item.role === 'user')?.content ?? ''
                    navigate('/ho-tro', { state: { question, answer: turn.content } })
                  }}>Kết nối nhân viên hỗ trợ</button>
                </div>
              )}
              {turn.role === 'assistant' && resolved.includes(index) && <small className="site-assistant__thanks" key={`thanks-${index}`}>Cảm ơn bạn đã xác nhận. Savoris luôn sẵn sàng hỗ trợ!</small>}
              </div>
            ))}
            {turns.length === 1 && !otherQuestion && <div className="site-assistant__topics" aria-label="Câu hỏi thường gặp">
              <span>Câu hỏi thường gặp</span>
              {FAQ_TOPICS.map(topic => <button key={topic.label} type="button" onClick={() => void sendMessage(topic.message)}>{topic.label}</button>)}
              <button type="button" onClick={chooseOtherQuestion}>Vấn đề khác</button>
            </div>}
            {busy && <p className="site-assistant__typing"><LoaderCircle aria-hidden="true" /> Đang tìm thông tin…</p>}
            <div ref={endRef} />
          </div>
          {(turns.length > 1 || otherQuestion) && <form className="site-assistant__form" onSubmit={submit}>
            <label className="sr-only" htmlFor="site-assistant-message">Tin nhắn</label>
            <textarea id="site-assistant-message" ref={inputRef} aria-label="Tin nhắn" rows={1} maxLength={1500}
              placeholder="Nhập tin nhắn của bạn…" value={draft} onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key !== 'Enter' || event.shiftKey) return
                if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
                event.preventDefault()
                void sendMessage(draft)
              }} />
            <button type="submit" aria-label="Gửi tin nhắn" disabled={!draft.trim() || busy}>
              {busy ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
            </button>
          </form>}
          <p className="site-assistant__privacy"><Sparkles aria-hidden="true" /> Trợ lí alibibee có thể nhầm; xác nhận lại thông tin đặt bàn với nhà hàng.</p>
        </section>
      )}
      {!open && <button className="site-assistant__launcher" type="button" aria-label="Mở Trợ lí alibibee" aria-expanded={false} onClick={() => setOpen(true)}>
        <img src="/images/alibibee-chat-avatar.jpg" alt="" /><span>Trợ lí alibibee</span>
      </button>}
    </div>
  )
}
