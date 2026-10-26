import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, Copy, Landmark, Upload, WalletCards } from 'lucide-react'
import { ApiError, apiOrigin, get, put, upload } from '../api/client'
import type { BankAccountSetting, TransferQrSetting } from '../api/types'
import { useAuth } from '../auth'
import { ErrorNotice } from '../components/Feedback'
import { useToast } from '../components/Toast'
import { mediaUrl } from '../api/site'
import './payment-settings.css'

const emptyBank: BankAccountSetting = { bank: '', accountNumber: '', accountName: '', autoConfirm: false, webhookPath: '' }

export function PaymentSettingsPage() {
  const { role, branches, branchId, setBranchId, session } = useAuth()
  const toast = useToast()
  const isAdmin = role === 'ADMIN'
  const activeBranchId = isAdmin ? branchId : session?.staff.branchId ?? branchId
  const activeBranch = branches.find(branch => branch.id === activeBranchId)
  const [bank, setBank] = useState<BankAccountSetting | null>(null)
  const [qr, setQr] = useState<TransferQrSetting>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeBranchId) { setBank(null); setQr({}); return }
    let active = true
    setLoading(true)
    setError('')
    setBank(null)
    Promise.all([
      get<BankAccountSetting>(`/settings/branches/${activeBranchId}/bank-account`),
      get<TransferQrSetting>(`/settings/branches/${activeBranchId}/transfer-qr`),
    ]).then(([account, image]) => {
      if (!active) return
      setBank({ ...emptyBank, ...account })
      setQr(image ?? {})
    }).catch(cause => {
      if (active) {
        setBank({ ...emptyBank })
        setQr({})
        setError(cause instanceof ApiError ? cause.message : 'Không tải được cài đặt thanh toán.')
      }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activeBranchId])

  async function saveAccount() {
    if (!activeBranchId || !bank) return
    setSaving(true); setError('')
    try {
      const saved = await put<BankAccountSetting>(`/settings/branches/${activeBranchId}/bank-account`, {
        bank: bank.bank?.trim() ?? '', accountNumber: bank.accountNumber?.replace(/\D/g, '') ?? '', accountName: bank.accountName?.trim() ?? '',
      })
      setBank({ ...emptyBank, ...saved })
      toast('Đã lưu tài khoản nhận tiền')
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Không lưu được tài khoản ngân hàng.') }
    finally { setSaving(false) }
  }

  async function uploadQr(file?: File) {
    if (!file || !activeBranchId) return
    setError('')
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Chỉ nhận ảnh PNG, JPG hoặc WebP.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Ảnh mã QR tối đa 2MB.'); return }
    setSaving(true)
    try {
      const result = await upload<TransferQrSetting>(`/settings/branches/${activeBranchId}/transfer-qr/image`, file)
      setQr(result ?? {})
      toast('Đã lưu ảnh mã QR cho chi nhánh')
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Không tải được ảnh mã QR.') }
    finally { setSaving(false) }
  }

  async function removeQr() {
    if (!activeBranchId || !window.confirm('Xóa ảnh mã QR của chi nhánh này?')) return
    setSaving(true); setError('')
    try {
      setQr(await put<TransferQrSetting>(`/settings/branches/${activeBranchId}/transfer-qr`, { url: '' }))
      toast('Đã xóa ảnh QR')
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Không xóa được ảnh QR.') }
    finally { setSaving(false) }
  }

  async function copyWebhook() {
    if (!bank?.webhookPath) return
    try { await navigator.clipboard.writeText(webhookUrl); toast('Đã chép địa chỉ webhook') }
    catch { toast('Không chép được địa chỉ webhook', true) }
  }

  const sepayReady = Boolean(bank?.autoConfirm && bank.accountNumber)
  const qrSrc = mediaUrl(qr.url)
  const webhookUrl = bank?.webhookPath ? `${apiOrigin()}${bank.webhookPath}` : ''

  return <div className="ap-page ap-payment-page">
    <div className="ap-heading"><div><span className="ap-kicker">THANH TOÁN · MANG VỀ</span><h1>QR &amp; SePay</h1><p>Cấu hình tài khoản nhận tiền và mã QR riêng cho từng chi nhánh.</p></div>
      {isAdmin
        ? <label>Chi nhánh<select aria-label="Chi nhánh thanh toán" value={activeBranchId ?? ''} onChange={event => setBranchId(event.target.value ? Number(event.target.value) : null)}><option value="">Chọn chi nhánh</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}</select></label>
        : <span className="ap-forecast-branch"><Building2 size={14} />{activeBranch ? `${activeBranch.code} · ${activeBranch.name}` : 'Chi nhánh của bạn'}</span>}
    </div>
    {error && <ErrorNotice message={error} />}
    {!activeBranchId ? <div className="ap-empty"><WalletCards size={30}/><h2>Chọn chi nhánh</h2><p>Mỗi chi nhánh có tài khoản nhận tiền và ảnh QR riêng.</p></div>
      : loading || !bank ? <div className="ap-empty" aria-busy="true">Đang tải cài đặt thanh toán…</div>
      : <div className="ap-payment-grid">
        <section className="ap-payment-card">
          <div className="ap-payment-card-head"><span><Landmark size={18}/></span><div><h2>Tài khoản nhận chuyển khoản</h2><p>Dùng để tạo QR có sẵn số tiền và mã đơn cho khách.</p></div></div>
          <div className="ap-payment-fields">
            <label>Ngân hàng<input value={bank.bank ?? ''} placeholder="MBBank, Vietcombank…" onChange={event => setBank({ ...bank, bank: event.target.value.replace(/\s/g, '') })}/></label>
            <label>Số tài khoản<input inputMode="numeric" value={bank.accountNumber ?? ''} placeholder="Nhập số tài khoản" onChange={event => setBank({ ...bank, accountNumber: event.target.value.replace(/\D/g, '') })}/></label>
            <label className="ap-payment-wide">Tên chủ tài khoản<input value={bank.accountName ?? ''} placeholder="Tên hiển thị trên tài khoản" maxLength={100} onChange={event => setBank({ ...bank, accountName: event.target.value.toUpperCase() })}/></label>
          </div>
          <div className="ap-payment-actions"><button className="ap-payment-primary" disabled={saving || !(bank.bank && bank.accountNumber)} onClick={() => void saveAccount()}>{saving ? 'Đang lưu…' : 'Lưu tài khoản'}</button></div>
          {bank.bank && bank.accountNumber && <div className="ap-payment-dynamic-qr"><img src={`https://qr.sepay.vn/img?acc=${encodeURIComponent(bank.accountNumber)}&bank=${encodeURIComponent(bank.bank)}&template=compact`} alt="QR xem trước tài khoản ngân hàng"/><span>QR xem trước tài khoản. QR của từng đơn sẽ có số tiền và mã đơn riêng.</span></div>}
        </section>

        <section className="ap-payment-card">
          <div className="ap-payment-card-head"><span><Upload size={18}/></span><div><h2>Ảnh mã QR của chi nhánh</h2><p>Tải ảnh bạn cung cấp lên để khách quét khi thanh toán.</p></div></div>
          <div className="ap-payment-qr-preview">{qrSrc ? <img src={qrSrc} alt={`Mã QR chuyển khoản ${activeBranch?.name ?? ''}`}/> : <div><Upload size={24}/><span>Chưa có ảnh mã QR</span></div>}</div>
          <div className="ap-payment-actions"><label className="ap-payment-primary ap-payment-upload">{saving ? 'Đang tải…' : qrSrc ? 'Thay ảnh QR' : 'Tải ảnh QR'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={saving} onChange={event => { void uploadQr(event.target.files?.[0]); event.target.value = '' }}/></label>{qrSrc && <button className="ap-payment-secondary" disabled={saving} onClick={() => void removeQr()}>Xóa ảnh</button>}</div>
          <p className="ap-payment-note">Ảnh cố định không tự điền tiền và mã đơn. Khách sẽ thấy số tiền cùng nội dung cần chuyển để nhập khi thanh toán. Để SePay tự khớp giao dịch, hãy lưu đúng tài khoản nhận tiền ở ô bên cạnh.</p>
        </section>

        <section className="ap-payment-card ap-payment-sepay">
          <div className="ap-payment-card-head"><span><CheckCircle2 size={18}/></span><div><h2>Tự xác nhận qua SePay</h2><p>Đơn chỉ được đưa vào bếp sau khi hệ thống xác nhận đã nhận đủ tiền.</p></div></div>
          <div className={`ap-sepay-state${sepayReady ? ' is-ready' : ''}`}><i/>{sepayReady ? 'SePay đã bật cho chi nhánh này' : bank.autoConfirm ? 'Cần lưu thông tin tài khoản chi nhánh' : 'Backend chưa bật SEPAY_API_KEY'}</div>
          {webhookUrl && <div className="ap-webhook-copy"><code>{webhookUrl}</code><button onClick={() => void copyWebhook()} aria-label="Chép địa chỉ webhook"><Copy size={15}/></button></div>}
          <p className="ap-payment-note">Trong SePay, tạo webhook nhận giao dịch tiền vào với xác thực API Key và dán địa chỉ trên. Đặt cùng khóa API vào biến môi trường <code>SEPAY_API_KEY</code> của backend. Nội dung chuyển khoản phải giữ nguyên mã đơn để hệ thống đối chiếu.</p>
        </section>
      </div>}
  </div>
}
