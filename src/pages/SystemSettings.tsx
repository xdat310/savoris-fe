import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { get, put } from '../api/client'
import { useAuth } from '../auth'

interface VatSetting { percent: number }
interface BankAccount { bank: string; accountNumber: string; accountName: string; autoConfirm: boolean; webhookPath: string }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="cms-field"><span className="cms-field-label">{label}</span>{children}</label>
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="sys-section">
      <div className="sys-section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

export function SystemSettings() {
  const { branches } = useAuth()
  const [vat, setVat] = useState<number>(10)
  const [vatSaving, setVatSaving] = useState(false)
  const [vatMsg, setVatMsg] = useState('')

  const [selectedBranch, setSelectedBranch] = useState<number | null>(null)
  const [bank, setBank] = useState<BankAccount | null>(null)
  const [bankSaving, setBankSaving] = useState(false)
  const [bankMsg, setBankMsg] = useState('')

  useEffect(() => {
    get<VatSetting>('/settings/vat').then(v => setVat(Number(v.percent))).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedBranch == null) return
    get<BankAccount>(`/settings/branches/${selectedBranch}/bank-account`)
      .then(setBank)
      .catch(() => setBank({ bank: '', accountNumber: '', accountName: '', autoConfirm: false, webhookPath: '' }))
  }, [selectedBranch])

  async function saveVat() {
    setVatSaving(true); setVatMsg('')
    try {
      await put('/settings/vat', { percent: vat })
      setVatMsg('Đã lưu!')
    } catch { setVatMsg('Lỗi, thử lại.') }
    finally { setVatSaving(false) }
  }

  async function saveBank() {
    if (!bank || selectedBranch == null) return
    setBankSaving(true); setBankMsg('')
    try {
      await put(`/settings/branches/${selectedBranch}/bank-account`, {
        bank: bank.bank, accountNumber: bank.accountNumber, accountName: bank.accountName,
      })
      setBankMsg('Đã lưu!')
    } catch { setBankMsg('Lỗi, thử lại.') }
    finally { setBankSaving(false) }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Cài đặt hệ thống</h1>
      </div>

      {/* VAT */}
      <Section title="Thuế VAT" action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {vatMsg && <span className="sys-msg">{vatMsg}</span>}
          <button className="cms-save-btn" onClick={saveVat} disabled={vatSaving}>
            <Save size={14} /> {vatSaving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      }>
        <Field label="Thuế VAT (%)">
          <input className="cms-input" type="number" min={0} max={100} step={0.5}
            value={vat} onChange={e => setVat(Number(e.target.value))} style={{ width: 100 }} />
        </Field>
        <p className="sys-hint">Áp dụng cho các đơn hàng tạo sau khi thay đổi. Đơn cũ giữ nguyên thuế tại thời điểm tạo.</p>
      </Section>

      {/* Bank account per branch */}
      <Section title="Tài khoản chuyển khoản theo chi nhánh" action={
        bank && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {bankMsg && <span className="sys-msg">{bankMsg}</span>}
            <button className="cms-save-btn" onClick={saveBank} disabled={bankSaving}>
              <Save size={14} /> {bankSaving ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        )
      }>
        <Field label="Chi nhánh">
          <select className="cms-input" value={selectedBranch ?? ''} onChange={e => setSelectedBranch(Number(e.target.value))}>
            <option value="">— Chọn chi nhánh —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        {bank && (
          <>
            <div className="cms-two-col">
              <Field label="Ngân hàng (MBBank, Vietcombank…)">
                <input className="cms-input" value={bank.bank} onChange={e => setBank(b => b && ({ ...b, bank: e.target.value }))} />
              </Field>
              <Field label="Số tài khoản">
                <input className="cms-input" value={bank.accountNumber} onChange={e => setBank(b => b && ({ ...b, accountNumber: e.target.value }))} />
              </Field>
            </div>
            <Field label="Tên tài khoản">
              <input className="cms-input" value={bank.accountName} onChange={e => setBank(b => b && ({ ...b, accountName: e.target.value }))} />
            </Field>
            {bank.autoConfirm && (
              <p className="sys-hint sys-hint--ok">SePay tự xác nhận thanh toán (đã cấu hình API key).</p>
            )}
          </>
        )}
      </Section>

      {/* Roles reference */}
      <Section title="Phân quyền vai trò">
        <table className="sys-table">
          <thead>
            <tr>
              <th>Vai trò</th>
              <th>Mô tả</th>
              <th>Phạm vi</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['ADMIN', 'Quản trị viên hệ thống / Chủ chuỗi', 'Toàn bộ hệ thống'],
              ['MANAGER', 'Quản lý chi nhánh', '1 chi nhánh cố định'],
              ['CHEF', 'Đầu bếp / KDS', 'Bếp của chi nhánh'],
              ['STAFF', 'Nhân viên phục vụ / Thu ngân', 'Khu vực bàn ăn'],
            ].map(([role, desc, scope]) => (
              <tr key={role}>
                <td><span className="sys-role-badge">{role}</span></td>
                <td>{desc}</td>
                <td>{scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}
