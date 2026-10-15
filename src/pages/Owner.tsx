import { Copy, KeyRound, Plus, Power, RefreshCw, Upload, UserMinus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError, del, get, post, put, upload } from '../api/client'
import type {
  AuditLogResponse, BranchResponse, BranchSummary, ChainDashboardResponse, CreateBranchRequest, CreateStaffRequest,
  StaffDetailResponse, TransferQrSetting, UpdateBranchRequest, BankAccountSetting,
} from '../api/types'
import { useAuth } from '../auth'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { Chip, LoadState, loadColor } from '../components/State'
import { useToast } from '../components/Toast'
import { dateTime, money, time } from '../lib/format'
import { useData } from '../lib/useData'

type Tab = 'overview' | 'manage' | 'logs'
type ManageSub = 'accounts' | 'transfer' | 'branches'

export function Owner() {
  const [tab, setTab] = useState<Tab>('overview')
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Mọi chi nhánh trên một màn hình.</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {([
          ['overview', 'Tổng quan'],
          ['manage',   'Quản lý'],
          ['logs',     'Nhật ký'],
        ] as const).map(([id, label]) => (
          <button key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'overview' && <Dashboard />}
      {tab === 'manage'   && <Manage />}
      {tab === 'logs'     && <AuditLogs />}
    </div>
  )
}

// ---------------------------------------------------------------- dashboard helpers

function cmpMoney(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

function MetricCard({ label, value, sub, accent, warn }: {
  label: string; value: string; sub?: string; accent?: boolean; warn?: boolean
}) {
  return (
    <div className="panel" style={{ padding: '18px 22px' }}>
      <div className="muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div className="num" style={{
        fontSize: accent ? 28 : 34, fontWeight: 700,
        color: accent ? 'var(--accent)' : warn ? 'var(--red-ink)' : 'var(--ink)',
      }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function BarChart({ bars, formatVal }: {
  bars: { label: string; value: number; color: string }[];
  formatVal: (v: number) => string;
}) {
  if (bars.length === 0) return <span className="muted" style={{ fontSize: 13 }}>Chưa có dữ liệu</span>
  const max = Math.max(...bars.map(b => b.value), 1)
  const H = 100
  const BW = 44
  const GAP = 18
  const W = bars.length * (BW + GAP) - GAP
  return (
    <svg viewBox={`-1 -16 ${W + 2} ${H + 36}`} style={{ width: '100%', overflow: 'visible' }}>
      {bars.map((b, i) => {
        const bh = Math.max(3, (b.value / max) * H)
        const x = i * (BW + GAP)
        const y = H - bh
        return (
          <g key={i}>
            <rect x={x} y={y} width={BW} height={bh} rx={3} fill={b.color} opacity={0.82} />
            <text x={x + BW / 2} y={y - 4} textAnchor="middle" fontSize="9" fill="#A8A4A0">{formatVal(b.value)}</text>
            <text x={x + BW / 2} y={H + 14} textAnchor="middle" fontSize="10" fill="#686460">{b.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{title}</div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------- dashboard

function Dashboard() {
  const dash = useData(() => get<ChainDashboardResponse>('/dashboard/chain'), [], 15000)
  if (dash.error) return <ErrorNotice message={dash.error} onRetry={dash.reload} />
  if (!dash.data) return <Loading />
  const d = dash.data
  const branches = d.branches ?? []
  const overloaded = d.overloadedBranches ?? 0

  const revBars  = branches.map(b => ({ label: b.code ?? '?', value: b.revenueToday       ?? 0, color: '#2EC4BE' }))
  const doneBars = branches.map(b => ({ label: b.code ?? '?', value: b.completedOrdersToday ?? 0, color: '#6a9de8' }))
  const openBars = branches.map(b => ({ label: b.code ?? '?', value: b.openOrders           ?? 0, color: '#e8a030' }))

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
        <MetricCard label="Doanh thu hôm nay" value={money(d.revenueToday)} sub="(đã trừ hoàn tiền)" accent />
        <MetricCard label="Đơn hoàn tất" value={String(d.completedOrdersToday)} />
        <MetricCard label="Đơn đang mở" value={String(d.openOrders)} />
        <MetricCard
          label="Bếp quá tải"
          value={String(overloaded)}
          sub={overloaded === 0 ? 'Tất cả bình thường' : `${overloaded} chi nhánh`}
          warn={overloaded > 0}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        <ChartPanel title="Doanh thu (hôm nay)">
          <BarChart bars={revBars} formatVal={cmpMoney} />
        </ChartPanel>
        <ChartPanel title="Đơn hoàn tất (hôm nay)">
          <BarChart bars={doneBars} formatVal={String} />
        </ChartPanel>
        <ChartPanel title="Đơn đang mở">
          <BarChart bars={openBars} formatVal={String} />
        </ChartPanel>
      </div>

      <p className="muted" style={{ fontSize: 12, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
        <RefreshCw size={11} aria-hidden="true" />
        Cập nhật lúc {time(d.generatedAt)} · tự làm mới mỗi 15 giây
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- bank transfer QR (web takeaway)

// Bank short names SePay and VietQR recognise
const BANKS = ['Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'MBBank', 'Techcombank', 'ACB', 'VPBank', 'TPBank', 'Sacombank', 'VIB', 'HDBank', 'OCB', 'SHB', 'MSB']

// The chain's account: every web takeaway order gets its own QR with the amount and the order code filled in,
// and with SePay connected the money confirms the order by itself
function BankTransfer() {
  const toast = useToast()
  const setting = useData(() => get<BankAccountSetting>('/settings/bank-account'), [])
  const [form, setForm] = useState<{ bank: string; accountNumber: string; accountName: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [previewBroken, setPreviewBroken] = useState(false)
  if (setting.loading) return <Loading />
  const s = setting.data
  const f = form ?? { bank: s?.bank ?? '', accountNumber: s?.accountNumber ?? '', accountName: s?.accountName ?? '' }
  const saved = Boolean(s?.bank && s?.accountNumber)
  const webhookUrl = `${window.location.origin}${s?.webhookPath ?? ''}`
  const local = /^(localhost|127\.|192\.168\.|10\.)/.test(window.location.hostname)

  async function save(next: typeof f, ok: string) {
    setError(null)
    setBusy(true)
    try {
      await put('/settings/bank-account', next)
      setForm(null)
      setPreviewBroken(false)
      await setting.reload()
      toast(ok)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được')
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast('Đã chép')
    } catch {
      toast('Không chép được, hãy chọn và chép tay', true)
    }
  }

  return (
    <div className="panel panel-pad transfer-setting">
      <div>
        <h2 style={{ margin: 0 }}>Tài khoản nhận chuyển khoản</h2>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>
          Mỗi đơn mang về sẽ có mã QR riêng, điền sẵn số tiền và nội dung là mã đơn: khách chỉ cần quét và bấm chuyển.
        </p>
      </div>
      {error && <ErrorNotice message={error} />}

      <form className="bank-form" onSubmit={(e) => { e.preventDefault(); save(f, 'Đã lưu tài khoản') }}>
        <label className="field">Ngân hàng
          <input className="input" list="bank-names" placeholder="MBBank" value={f.bank} spellCheck={false}
            onChange={(e) => setForm({ ...f, bank: e.target.value.replace(/\s/g, '') })} />
          <datalist id="bank-names">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
        </label>
        <label className="field">Số tài khoản
          <input className="input num" inputMode="numeric" placeholder="0123456789" value={f.accountNumber}
            onChange={(e) => setForm({ ...f, accountNumber: e.target.value.replace(/\D/g, '') })} />
        </label>
        <label className="field bank-form-wide">Chủ tài khoản <span className="muted">(khách thấy để yên tâm chuyển đúng)</span>
          <input className="input" placeholder="CONG TY TNHH SAVORIS" value={f.accountName} maxLength={100}
            onChange={(e) => setForm({ ...f, accountName: e.target.value.toUpperCase() })} />
        </label>
        <div className="row bank-form-wide">
          <button className="btn btn-primary" disabled={busy || !f.bank || !f.accountNumber}>
            {busy && <span className="spinner" aria-hidden="true" />} Lưu tài khoản
          </button>
          {saved && (
            <button type="button" className="btn btn-danger" disabled={busy}
              onClick={() => window.confirm('Bỏ tài khoản? Khách sẽ thấy ảnh QR cố định bên dưới, nếu có.') && save({ bank: '', accountNumber: '', accountName: '' }, 'Đã bỏ tài khoản')}>
              Bỏ tài khoản
            </button>
          )}
        </div>
      </form>

      {saved && (
        <div className="bank-preview">
          {previewBroken
            ? <span className="muted">Không tạo được mã QR: kiểm tra lại tên ngân hàng.</span>
            : <img src={`https://qr.sepay.vn/img?acc=${encodeURIComponent(s!.accountNumber!)}&bank=${encodeURIComponent(s!.bank!)}&template=compact`}
                alt="Mã QR mẫu của tài khoản" onError={() => setPreviewBroken(true)} />}
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Mã mẫu chưa có số tiền. Quét thử bằng app ngân hàng để chắc chắn đúng tên chủ tài khoản.</p>
        </div>
      )}

      {s?.autoConfirm
        ? <div className="sepay-status sepay-on">
            <strong>Tự xác nhận bằng SePay: đang bật</strong>
            <p>Trong SePay, mục Webhooks, thêm webhook gửi tới địa chỉ dưới đây, chứng thực kiểu “API Key” với đúng khoá đã đặt ở SEPAY_API_KEY.</p>
            <div className="sepay-url"><code>{webhookUrl}</code>
              <button type="button" className="btn btn-sm" onClick={() => copy(webhookUrl)}><Copy size={14} aria-hidden="true" /> Chép</button></div>
            {local && <p className="muted">Địa chỉ này chỉ dùng được trong mạng nội bộ: SePay cần địa chỉ công khai, hãy mở trang quản lý qua link ngrok rồi chép lại.</p>}
          </div>
        : <div className="sepay-status">
            <strong>Tự xác nhận bằng SePay: chưa bật</strong>
            <p>Thu ngân đang xác nhận tiền về bằng tay. Để bật: đặt biến môi trường SEPAY_API_KEY cho backend rồi khởi động lại.</p>
          </div>}
    </div>
  )
}

function TransferQr() {
  const toast = useToast()
  const qr = useData(() => get<TransferQrSetting>('/settings/transfer-qr'), [])
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [broken, setBroken] = useState(false)
  if (qr.loading) return <Loading />
  const current = qr.data?.url ?? ''

  async function act(fn: () => Promise<unknown>, ok: string) {
    setError(null)
    setBusy(true)
    try {
      await fn()
      toast(ok)
      setBroken(false)
      await qr.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được')
    } finally {
      setBusy(false)
    }
  }

  function pick(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Chỉ nhận ảnh PNG, JPG hoặc WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Ảnh tối đa 2MB. Hãy chụp màn hình mã QR hoặc giảm kích thước ảnh.')
      return
    }
    act(async () => {
      try {
        await upload('/settings/transfer-qr/image', file)
      } catch (err) {
        // The server reads the file itself: a renamed or damaged file is not an image
        if (err instanceof ApiError && err.code === 'INVALID_REQUEST') throw new Error('File không phải ảnh PNG, JPG hoặc WebP hợp lệ, hoặc lớn hơn 2MB.')
        throw err
      }
    }, 'Đã cập nhật ảnh mã QR')
  }

  function saveLink(e: FormEvent) {
    e.preventDefault()
    act(async () => {
      await put('/settings/transfer-qr', { url: link.trim() })
      setLink('')
    }, 'Đã lưu link ảnh mã QR')
  }

  return (
    <div className="panel panel-pad transfer-setting">
      <div>
        <h2 style={{ margin: 0 }}>Ảnh mã QR cố định</h2>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>
          Chỉ dùng khi chưa nhập tài khoản ở trên. Khách thấy ảnh này kèm số tiền và nội dung là mã đơn, tự gõ số tiền khi chuyển.
          Thu ngân thấy tiền về thì bấm xác nhận, bếp mới làm.
        </p>
      </div>
      {error && <ErrorNotice message={error} />}

      <div className="qr-upload">
        <div className="qr-preview">
          {current && !broken
            ? <img src={current} alt="Mã QR chuyển khoản đang dùng" onError={() => setBroken(true)} />
            : <span>{broken ? 'Không mở được ảnh hiện tại' : 'Chưa có mã QR: khách chỉ trả được tiền mặt'}</span>}
        </div>
        <div className="qr-upload-actions">
          <label className={`btn btn-primary${busy ? ' is-busy' : ''}`}>
            {busy ? <span className="spinner" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
            {current ? 'Đổi ảnh QR' : 'Tải ảnh QR lên'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy}
              onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Ảnh PNG, JPG hoặc WebP, tối đa 2MB. Ảnh chụp màn hình mã QR từ app ngân hàng là được.</p>
          {current && (
            <button type="button" className="btn btn-sm btn-danger" disabled={busy}
              onClick={() => window.confirm('Tắt chuyển khoản? Khách mang về sẽ chỉ trả được tiền mặt.') && act(() => put('/settings/transfer-qr', { url: '' }), 'Đã tắt chuyển khoản')}>
              Tắt chuyển khoản
            </button>
          )}
        </div>
      </div>

      <form className="row" onSubmit={saveLink}>
        <label className="field" style={{ flex: 1, minWidth: 220 }}>Hoặc dán link ảnh
          <input className="input" type="url" placeholder="https://…/ma-qr.png" value={link} onChange={(e) => setLink(e.target.value)} spellCheck={false} />
        </label>
        <button className="btn" style={{ alignSelf: 'flex-end' }} disabled={busy || !link.trim()}>Dùng link này</button>
      </form>
    </div>
  )
}

// The owner ticks the branches that sell one dish; the others do not show it on any of their menus
// ---------------------------------------------------------------- branches (ADMIN)

function Branches() {
  const { reloadBranches } = useAuth()
  const list = useData(() => get<BranchResponse[]>('/branches'), [])
  const dash = useData(() => get<ChainDashboardResponse>('/dashboard/chain'), [], 15000)
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const blank: CreateBranchRequest = { code: '', name: '', address: '', city: '', phone: '' }
  const [f, setF] = useState(blank)

  const metricOf = (id?: number): BranchSummary | undefined =>
    dash.data?.branches?.find((b) => b.branchId === id)

  async function act(fn: () => Promise<unknown>, ok: string) {
    setError(null)
    try { await fn(); toast(ok) } catch (e) { setError(e instanceof ApiError ? e.message : 'Có lỗi xảy ra') }
  }

  function create(e: FormEvent) {
    e.preventDefault()
    act(async () => {
      await post('/branches', f)
      setF(blank)
      await list.reload()
      await reloadBranches()
    }, 'Đã tạo chi nhánh')
  }

  function close(b: BranchResponse) {
    if (!window.confirm(`Đóng cửa ${b.name}? Thao tác này đánh dấu chi nhánh KHÔNG hoạt động.`)) return
    act(async () => {
      await del(`/branches/${b.id}`)
      await list.reload()
      await reloadBranches()
    }, `Đã đóng cửa ${b.name}`)
  }

  function save(b: BranchResponse, patch: Partial<UpdateBranchRequest>) {
    act(async () => {
      await put(`/branches/${b.id}`, { name: b.name!, address: b.address!, city: b.city!, phone: b.phone, ...patch })
      await list.reload()
      await reloadBranches()
    }, 'Đã cập nhật chi nhánh')
  }

  if (list.loading) return <Loading />

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {error && <ErrorNotice message={error} />}

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {list.data?.map((b) => {
          const m = metricOf(b.id)
          return (
            <div key={b.id} className="panel">
              <div style={{ padding: '14px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                  <span className="bcode">{b.code}</span>
                  <strong style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</strong>
                  {b.status === 'ACTIVE' ? <Chip tone="ok">Hoạt động</Chip>
                    : b.status === 'CLOSED' ? <Chip tone="bad">Đóng cửa</Chip>
                    : <Chip tone="neutral">Tạm ngưng</Chip>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing(editing === b.id ? null : b.id!)}>
                    {editing === b.id ? 'Xong' : 'Sửa'}
                  </button>
                  {b.status === 'ACTIVE' && (
                    <button className="btn btn-sm btn-danger" onClick={() => close(b)}>
                      <Power size={13} aria-hidden="true" /> Đóng
                    </button>
                  )}
                </div>
              </div>

              {m && (
                <div style={{ padding: '10px 18px 14px', borderTop: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 8px' }}>
                  <div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>Doanh thu hôm nay</div>
                    <div className="chalk num" style={{ fontSize: 18, color: 'var(--accent)', fontWeight: 700 }}>{money(m.revenueToday)}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>Đơn đang mở</div>
                    <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{m.openOrders}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>Hoàn tất</div>
                    <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{m.completedOrdersToday}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <LoadState status={m.kitchen?.status} />
                      <div style={{ flex: 1, height: 5, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: loadColor(m.kitchen?.status), transform: `scaleX(${Math.min(100, m.kitchen?.loadPercent ?? 0) / 100})`, transformOrigin: 'left' }} />
                      </div>
                      <span className="num muted" style={{ fontSize: 12 }}>{m.kitchen?.loadPercent ?? 0}%</span>
                    </div>
                  </div>
                </div>
              )}

              {editing === b.id && (
                <div className="grid-form" style={{ padding: '14px 18px', borderTop: '1px solid var(--rule)' }}>
                  <label className="field">Tên chi nhánh
                    <input className="input" defaultValue={b.name ?? ''} key={`name-${b.id}-${b.name}`}
                      onBlur={(e) => e.target.value !== b.name && save(b, { name: e.target.value })} />
                  </label>
                  <label className="field">Địa chỉ
                    <input className="input" defaultValue={b.address ?? ''} key={`addr-${b.id}-${b.address}`}
                      onBlur={(e) => e.target.value !== b.address && save(b, { address: e.target.value })} />
                  </label>
                  <label className="field">Thành phố
                    <input className="input" defaultValue={b.city ?? ''} key={`city-${b.id}-${b.city}`}
                      onBlur={(e) => e.target.value !== b.city && save(b, { city: e.target.value })} />
                  </label>
                  <label className="field">Điện thoại
                    <input className="input" defaultValue={b.phone ?? ''} key={`phone-${b.id}-${b.phone}`}
                      onBlur={(e) => e.target.value !== b.phone && save(b, { phone: e.target.value })} />
                  </label>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <form className="panel panel-pad" onSubmit={create} style={{ display: 'grid', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>Thêm chi nhánh mới</h2>
        <div className="grid-form">
          <label className="field">Mã CN (VD: HK)<input className="input" required minLength={2} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></label>
          <label className="field">Tên chi nhánh<input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="field">Địa chỉ<input className="input" required value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
          <label className="field">Thành phố<input className="input" required value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
          <label className="field">Điện thoại<input className="input" inputMode="tel" value={f.phone ?? ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <button className="btn btn-primary"><Plus size={16} aria-hidden="true" /> Tạo chi nhánh</button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------- manage (sub-tabs wrapper)

function Manage() {
  const [sub, setSub] = useState<ManageSub>('accounts')
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="tabs" role="tablist" style={{ marginBottom: 0 }}>
        {([
          ['accounts', 'Tài khoản QL'],
          ['transfer', 'Chuyển khoản'],
          ['branches', 'Chi nhánh'],
        ] as const).map(([id, label]) => (
          <button key={id} role="tab" className="tab" aria-selected={sub === id} onClick={() => setSub(id)}>{label}</button>
        ))}
      </div>
      {sub === 'accounts' && <ManagerAccounts />}
      {sub === 'transfer' && <div className="transfer-tab"><BankTransfer /><TransferQr /></div>}
      {sub === 'branches' && <Branches />}
    </div>
  )
}

// ---------------------------------------------------------------- manager accounts (ADMIN)

function ManagerAccounts() {
  const { branches } = useAuth()
  const [branchId, setBranchId] = useState<number | null>(branches[0]?.id ?? null)
  const staff = useData(
    () => branchId ? get<StaffDetailResponse[]>(`/staff/branch/${branchId}`) : Promise.resolve([]),
    [branchId]
  )
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const blank = { fullName: '', username: '', phone: '', email: '', password: '', hourlyRate: '0' }
  const [f, setF] = useState(blank)

  async function act(fn: () => Promise<unknown>, ok: string) {
    setError(null)
    try { await fn(); toast(ok) } catch (e) { setError(e instanceof ApiError ? e.message : 'Có lỗi xảy ra') }
  }

  function hire(e: FormEvent) {
    e.preventDefault()
    if (!branchId) return
    act(async () => {
      await post('/staff', {
        code: `QL${Date.now() % 1000000}`, fullName: f.fullName.trim(), username: f.username.trim(),
        email: f.email.trim(), phone: f.phone.trim(), role: 'BRANCH_MANAGER' as CreateStaffRequest['role'],
        branchId, hourlyRate: Number(f.hourlyRate), password: f.password,
      } satisfies CreateStaffRequest)
      setF(blank)
      await staff.reload()
    }, 'Đã tạo tài khoản Quản lý')
  }

  function resetPw(s: StaffDetailResponse) {
    const pw = window.prompt(`Mật khẩu mới cho ${s.fullName} (ít nhất 5 ký tự):`)
    if (!pw) return
    act(() => put(`/staff/${s.id}/password`, { newPassword: pw }), `Đã đặt lại mật khẩu cho ${s.fullName}`)
  }

  function revoke(s: StaffDetailResponse) {
    if (!window.confirm(`Khoá tài khoản ${s.fullName}? Họ sẽ không đăng nhập được nữa.`)) return
    act(async () => {
      await del(`/staff/${s.id}`)
      await staff.reload()
    }, `Đã khoá ${s.fullName}`)
  }

  const managers = staff.data?.filter((s) => s.role === 'BRANCH_MANAGER') ?? []

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {error && <ErrorNotice message={error} />}
      <div className="row" style={{ alignItems: 'center', gap: 12 }}>
        <label className="field" style={{ margin: 0 }}>
          <span className="muted" style={{ fontSize: 13 }}>Chi nhánh</span>
          <select className="select" value={branchId ?? ''} onChange={(e) => setBranchId(Number(e.target.value))}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      </div>
      <div className="panel">
        <div className="panel-head"><h2>Quản lý chi nhánh</h2></div>
        {staff.loading ? <Loading /> : managers.length === 0 ? <Empty title="Chi nhánh chưa có Quản lý" /> : (
          <table className="data">
            <thead><tr><th>Họ tên</th><th>Tài khoản</th><th>Điện thoại</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {managers.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                  <td className="muted">{s.username}</td>
                  <td className="num">{s.phone}</td>
                  <td>
                    {s.status === 'ACTIVE' ? <Chip tone="ok">Hoạt động</Chip>
                      : s.status === 'RESIGNED' ? <Chip tone="bad">Đã khoá</Chip>
                      : <Chip tone="neutral">{s.status}</Chip>}
                  </td>
                  <td className="right">
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" onClick={() => resetPw(s)}><KeyRound size={14} /> Đặt lại mật khẩu</button>
                      {s.status === 'ACTIVE' && (
                        <button className="btn btn-sm btn-danger" onClick={() => revoke(s)}><UserMinus size={14} /> Khoá tài khoản</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <form className="panel panel-pad" onSubmit={hire} style={{ display: 'grid', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>Cấp tài khoản Quản lý mới</h2>
        <div className="grid-form">
          <label className="field">Họ tên<input className="input" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></label>
          <label className="field">Tên đăng nhập<input className="input" required minLength={3} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
          <label className="field">Mật khẩu ban đầu<input className="input" required minLength={5} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
          <label className="field">Điện thoại<input className="input" required inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <label className="field">Email<input className="input" required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <button className="btn btn-primary" disabled={!branchId}><Plus size={16} aria-hidden="true" /> Tạo tài khoản Quản lý</button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------- audit logs (ADMIN)

function AuditLogs() {
  const { branches } = useAuth()
  const [branchId, setBranchId] = useState<string>('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const logs = useData(
    () => get<AuditLogResponse[]>(`/audit-logs?size=100${branchId ? `&branchId=${branchId}` : ''}${action ? `&action=${action}` : ''}${entityType ? `&entityType=${entityType}` : ''}`),
    [branchId, action, entityType]
  )

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <label className="field" style={{ margin: 0 }}>
          <span className="muted" style={{ fontSize: 13 }}>Chi nhánh</span>
          <select className="select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Tất cả</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span className="muted" style={{ fontSize: 13 }}>Hành động</span>
          <select className="select" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Tất cả</option>
            {['CREATE', 'UPDATE', 'DELETE', 'RESIGN', 'PAYMENT', 'VOID_REQUEST', 'VOID_RESOLVE'].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span className="muted" style={{ fontSize: 13 }}>Loại đối tượng</span>
          <select className="select" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">Tất cả</option>
            {['STAFF', 'ORDER', 'ORDER_ITEM', 'BRANCH', 'PAYMENT'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="panel">
        <div className="panel-head"><h2>Nhật ký hoạt động</h2><span className="muted" style={{ fontSize: 13 }}>100 mục gần nhất</span></div>
        {logs.loading ? <Loading /> : (logs.data?.length ?? 0) === 0 ? <Empty title="Chưa có nhật ký" /> : (
          <table className="data">
            <thead><tr><th>Thời gian</th><th>Hành động</th><th>Đối tượng</th><th>ID</th><th>Nhân viên</th><th>Chi nhánh</th><th>Giá trị mới</th></tr></thead>
            <tbody>
              {logs.data!.map((l) => (
                <tr key={l.id}>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>{dateTime(l.createdAt)}</td>
                  <td><span className="sys-role-badge">{l.action}</span></td>
                  <td className="muted">{l.entityType}</td>
                  <td className="num muted">{l.entityId}</td>
                  <td className="num">{l.staffId ?? '—'}</td>
                  <td className="num">{l.branchId ? branches.find((b) => b.id === l.branchId)?.name ?? l.branchId : '—'}</td>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }} className="muted">
                    {l.newValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
