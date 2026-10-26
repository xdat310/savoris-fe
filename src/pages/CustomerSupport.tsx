import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiError, get, post } from '../api/client'

type Ticket = { referenceCode: string }
type Handoff = { question?: string; answer?: string }
type Branch = { id: number; name: string; code: string }

export function CustomerSupport() {
  const { state } = useLocation()
  const handoff = (state ?? {}) as Handoff
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [branchId, setBranchId] = useState('')
  const [issue, setIssue] = useState(handoff.question ?? '')
  const [busy, setBusy] = useState(false)
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  useEffect(() => { void get<Branch[]>('/public/branches').then(setBranches).catch(() => setBranches([])) }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const result = await post<Ticket>('/public/support-tickets', {
        customerName: name, customerPhone: phone, branchId: branchId ? Number(branchId) : null,
        issue, conversationContext: handoff.answer ? `Trả lời của trợ lý: ${handoff.answer}` : null,
      })
      setReference(result.referenceCode)
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Không gửi được yêu cầu, vui lòng thử lại.') }
    finally { setBusy(false) }
  }

  return <main className="guest-page" style={{ maxWidth: 680, margin: '4rem auto', padding: '1.5rem' }}>
    <p className="eyebrow">SAVORIS · CHĂM SÓC KHÁCH HÀNG</p>
    <h1>Để đội ngũ Savoris hỗ trợ bạn</h1>
    <p>Gửi câu hỏi và số điện thoại, đội ngũ Savoris sẽ liên hệ để hỗ trợ.</p>
    {reference ? <section role="status"><h2>Đã ghi nhận yêu cầu</h2><p>Mã yêu cầu: <strong>{reference}</strong>. Nhân viên sẽ liên hệ với bạn qua số điện thoại đã cung cấp.</p></section> :
      <form onSubmit={submit} style={{ display: 'grid', gap: '1rem' }}>
        <label>Họ và tên<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Số điện thoại<input required minLength={8} maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} /></label>
        <label>Chi nhánh liên quan (nếu có)<select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="">Chưa chọn</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}</select></label>
        <label>Bạn cần hỗ trợ gì?<textarea required maxLength={2000} rows={5} value={issue} onChange={e => setIssue(e.target.value)} /></label>
        {handoff.answer && <details><summary>Ngữ cảnh từ trợ lý</summary><p>{handoff.answer}</p></details>}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu hỗ trợ'}</button>
      </form>}
  </main>
}
