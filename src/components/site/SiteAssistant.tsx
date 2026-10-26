import { Bot, LoaderCircle, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
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
      const note = cause instanceof ApiError && cause.status === 503
        ? 'Trợ lý đang tạm nghỉ. Bạn có thể gọi trực tiếp cho chi nhánh hoặc thử lại sau.'
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
              <p className={`site-assistant__bubble site-assistant__bubble--${turn.role}`} key={`${index}-${turn.role}`}>
                {turn.content}
              </p>
            ))}
            {busy && <p className="site-assistant__typing"><LoaderCircle aria-hidden="true" /> Đang tìm thông tin…</p>}
            {error && <p className="site-assistant__error" role="alert">{error}</p>}
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
