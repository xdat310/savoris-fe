import { Bot, LoaderCircle, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, post } from '../../api/client'
import './site-assistant.css'

type Turn = { role: 'user' | 'assistant'; content: string }
type ChatResponse = { reply: string }

const GREETING = 'Xin chào, mình có thể giúp bạn xem chi nhánh, thực đơn hoặc đặt bàn.'
const QUICK_PROMPTS = ['Chi nhánh nào đang mở?', 'Cho tôi xem thực đơn', 'Tôi muốn đặt bàn']

export function SiteAssistant() {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([{ role: 'assistant', content: GREETING }])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resolved, setResolved] = useState<number[]>([])
  const navigate = useNavigate()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])
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
    const previous = turns.slice(-10)
    setTurns(current => [...current, { role: 'user', content: message }])
    setDraft('')
    setError('')
    setBusy(true)
    try {
      const result = await post<ChatResponse>('/public/ai/chat', { message, history: previous })
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
      setError(note)
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(draft)
  }

  return (
    <div className="site-assistant">
      {open && (
        <section className="site-assistant__panel" aria-label="Trợ lý Savoris">
          <header className="site-assistant__head">
            <span className="site-assistant__mark"><Bot aria-hidden="true" /></span>
            <div><strong>Trợ lý Savoris</strong><span>Chi nhánh · thực đơn · đặt bàn</span></div>
            <button className="site-assistant__close" type="button" aria-label="Đóng trợ lý" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
          </header>
          <div className="site-assistant__messages" aria-live="polite" aria-relevant="additions text">
            {turns.map((turn, index) => (
              <div key={`${index}-${turn.role}`}>
              <p className={`site-assistant__bubble site-assistant__bubble--${turn.role}`} key={`${index}-${turn.role}`}>
                {turn.content}
              </p>
              {turn.role === 'assistant' && index > 0 && !resolved.includes(index) && (
                <div className="site-assistant__resolution" key={`resolution-${index}`}>
                  <span>Câu trả lời này đã giải quyết được vấn đề của bạn chưa?</span>
                  <button type="button" onClick={() => setResolved(current => [...current, index])}>Đã giải quyết</button>
                  <button type="button" onClick={() => {
                    const question = [...turns.slice(0, index)].reverse().find(item => item.role === 'user')?.content ?? ''
                    navigate('/ho-tro', { state: { question, answer: turn.content } })
                  }}>Chưa, cần hỗ trợ</button>
                </div>
              )}
              {turn.role === 'assistant' && resolved.includes(index) && <small className="site-assistant__thanks" key={`thanks-${index}`}>Cảm ơn bạn đã xác nhận. Savoris luôn sẵn sàng hỗ trợ!</small>}
              </div>
            ))}
            {busy && <p className="site-assistant__typing"><LoaderCircle aria-hidden="true" /> Đang tìm thông tin…</p>}
            {error && <div className="site-assistant__error" role="alert"><p>{error}</p><button type="button" onClick={() => {
              const question = [...turns].reverse().find(item => item.role === 'user')?.content ?? ''
              navigate('/ho-tro', { state: { question, answer: error } })
            }}>Liên hệ chuyên gia hỗ trợ</button></div>}
            <div ref={endRef} />
          </div>
          {turns.length === 1 && (
            <div className="site-assistant__quick" aria-label="Gợi ý câu hỏi">
              {QUICK_PROMPTS.map(prompt => <button key={prompt} type="button" disabled={busy} onClick={() => void sendMessage(prompt)}>{prompt}</button>)}
            </div>
          )}
          <form className="site-assistant__form" onSubmit={submit}>
            <label className="sr-only" htmlFor="site-assistant-message">Tin nhắn</label>
            <textarea id="site-assistant-message" ref={inputRef} aria-label="Tin nhắn" rows={1} maxLength={1500}
              placeholder="Bạn cần tìm gì?" value={draft} onChange={event => setDraft(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(draft) } }} />
            <button type="submit" aria-label="Gửi tin nhắn" disabled={!draft.trim() || busy}>
              {busy ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
            </button>
          </form>
          <p className="site-assistant__privacy"><Sparkles aria-hidden="true" /> Trợ lý có thể nhầm; xác nhận lại thông tin đặt bàn với nhà hàng.</p>
        </section>
      )}
      {!open && <button className="site-assistant__launcher" type="button" aria-label="Mở trợ lý Savoris" aria-expanded={false} onClick={() => setOpen(true)}>
        <MessageCircle aria-hidden="true" /><span>Hỏi Savoris</span>
      </button>}
    </div>
  )
}
