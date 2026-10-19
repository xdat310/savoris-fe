import { LocateFixed, MapPinned, Plus, Store } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError, del, post, put } from '../api/client'
import type { BranchResponse } from '../api/types'
import { useAuth } from '../auth'
import { ErrorNotice } from '../components/Feedback'
import { useToast } from '../components/Toast'
import { confirmDialog } from '../components/ui/Dialog'

const blank = (v?: string) => (v && v !== 'Chưa cập nhật' ? v : '')

// Map position from a street address, via OpenStreetMap's free geocoder (no key needed)
async function geocode(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const q = new URLSearchParams({ q: `${address}, ${city}`, format: 'json', limit: '1', countrycodes: 'vn' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, { headers: { 'Accept-Language': 'vi' } })
  if (!res.ok) return null
  const found = (await res.json()) as { lat: string; lon: string }[]
  return found[0] ? { lat: Number(Number(found[0].lat).toFixed(6)), lng: Number(Number(found[0].lon).toFixed(6)) } : null
}

// Branch details (name, address, map position, kitchen capacity); the owner also adds and closes branches here
export function BranchSettings({ branch }: { branch: BranchResponse }) {
  const { role, branches, setBranchId, reloadBranches } = useAuth()
  const owner = role === 'ADMIN'
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {owner && <BranchList branches={branches} current={branch.id} onPick={setBranchId} />}
      <BranchForm key={branch.id} branch={branch} owner={owner} onSaved={reloadBranches} />
      {owner && <NewBranch existing={branches} onCreated={async (id) => { await reloadBranches(); setBranchId(id) }} />}
    </div>
  )
}

function BranchList({ branches, current, onPick }: { branches: BranchResponse[]; current?: number; onPick: (id: number) => void }) {
  return (
    <div className="panel">
      <div className="panel-head"><h2>Các chi nhánh</h2><span className="muted" style={{ fontSize: 'var(--fs-13)' }}>Chọn một chi nhánh để sửa</span></div>
      <table className="data">
        <thead><tr><th>Mã</th><th>Tên</th><th>Địa chỉ</th><th>Thành phố</th><th>Vị trí bản đồ</th></tr></thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.id} className={b.id === current ? 'is-current' : ''} onClick={() => onPick(b.id!)} style={{ cursor: 'pointer' }}>
              <td className="num" style={{ fontWeight: 'var(--fw-semibold)' }}>{b.code}</td>
              <td>{b.name}</td>
              <td>{blank(b.address) || <span className="muted">Chưa có</span>}</td>
              <td>{blank(b.city) || <span className="muted">—</span>}</td>
              <td>{b.latitude != null ? <span className="state state-ok">Đã có</span> : <span className="state state-warn">Chưa có</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BranchForm({ branch, owner, onSaved }: { branch: BranchResponse; owner: boolean; onSaved: () => Promise<void> }) {
  const toast = useToast()
  const [f, setF] = useState({
    name: branch.name ?? '', address: blank(branch.address), city: blank(branch.city), phone: branch.phone ?? '',
    lat: branch.latitude != null ? String(branch.latitude) : '', lng: branch.longitude != null ? String(branch.longitude) : '',
    capacity: branch.kitchenCapacity ? String(branch.kitchenCapacity) : '',
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'geo' | 'close' | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const hasPos = f.lat.trim() !== '' && f.lng.trim() !== ''

  async function locate() {
    setError(null)
    setBusy('geo')
    try {
      const pos = await geocode(f.address, f.city)
      if (pos) {
        setF({ ...f, lat: String(pos.lat), lng: String(pos.lng) })
        toast('Đã tìm thấy vị trí, kiểm tra trên bản đồ rồi bấm Lưu')
      } else {
        setError('Không tìm thấy địa chỉ trên bản đồ. Thử ghi rõ tên đường, quận, thành phố; hoặc nhập toạ độ tay.')
      }
    } catch {
      setError('Không kết nối được dịch vụ bản đồ.')
    } finally {
      setBusy(null)
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy('save')
    try {
      await put(`/branches/${branch.id}`, {
        name: f.name.trim(), address: f.address.trim(), city: f.city.trim(), phone: f.phone.trim() || undefined,
        latitude: hasPos ? Number(f.lat) : undefined, longitude: hasPos ? Number(f.lng) : undefined,
        kitchenCapacity: f.capacity ? Number(f.capacity) : undefined,
        openTime: branch.openTime, closeTime: branch.closeTime, managerId: branch.managerId,
      })
      await onSaved()
      toast(`Đã lưu ${f.name.trim()}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được')
    } finally {
      setBusy(null)
    }
  }

  async function close() {
    if (!(await confirmDialog({ title: `Ngừng hoạt động ${branch.name}?`, message: 'Chi nhánh sẽ biến mất khỏi trang khách và danh sách chi nhánh.', confirmLabel: 'Ngừng hoạt động', danger: true }))) return
    setBusy('close')
    try {
      await del(`/branches/${branch.id}`)
      await onSaved()
      toast(`${branch.name} đã ngừng hoạt động`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thực hiện được')
      setBusy(null)
    }
  }

  return (
    <form className="panel" onSubmit={save}>
      <div className="panel-head"><h2>{branch.code} · Thông tin chi nhánh</h2></div>
      <div className="panel-pad" style={{ display: 'grid', gap: 16 }}>
        {error && <ErrorNotice message={error} />}
        <div className="grid-form">
          <label className="field">Tên chi nhánh<input className="input" required maxLength={255} value={f.name} onChange={set('name')} /></label>
          <label className="field">Điện thoại<input className="input num" inputMode="tel" pattern="[0-9\-+\s()]+" value={f.phone} onChange={set('phone')} /></label>
        </div>
        <div className="grid-form">
          <label className="field" style={{ gridColumn: 'span 2' }}>Địa chỉ<input className="input" required value={f.address} onChange={set('address')} placeholder="Số nhà, đường, phường, quận" /></label>
          <label className="field">Thành phố<input className="input" required maxLength={100} value={f.city} onChange={set('city')} placeholder="Hà Nội" /></label>
        </div>
        <div className="branch-geo">
          <div>
            <strong>Vị trí trên bản đồ</strong>
            <p className="muted">Dùng để khách đặt mang về thấy chi nhánh gần họ nhất. Bấm “Tìm theo địa chỉ” hoặc nhập toạ độ.</p>
          </div>
          <div className="row">
            <label className="field">Vĩ độ<input className="input num" inputMode="decimal" value={f.lat} onChange={set('lat')} placeholder="21.0291" style={{ width: 140 }} /></label>
            <label className="field">Kinh độ<input className="input num" inputMode="decimal" value={f.lng} onChange={set('lng')} placeholder="105.8495" style={{ width: 140 }} /></label>
            <button type="button" className="btn" style={{ alignSelf: 'flex-end' }} disabled={busy !== null || !f.address.trim() || !f.city.trim()} onClick={locate}>
              {busy === 'geo' ? <span className="spinner" aria-hidden="true" /> : <LocateFixed size={16} aria-hidden="true" />} Tìm theo địa chỉ
            </button>
            {hasPos && (
              <a className="btn btn-ghost" style={{ alignSelf: 'flex-end' }} href={`https://www.google.com/maps?q=${f.lat},${f.lng}`} target="_blank" rel="noreferrer">
                <MapPinned size={16} aria-hidden="true" /> Xem trên bản đồ
              </a>
            )}
          </div>
        </div>
        <label className="field" style={{ maxWidth: 360 }}>Sức chứa bếp giờ cao điểm (phần)
          <input className="input num" type="number" min={1} placeholder="40" value={f.capacity} onChange={set('capacity')} />
          <span className="muted" style={{ fontWeight: 'var(--fw-regular)' }}>Món chờ + đang nấu tối đa. Vượt mức này hệ thống tạm ngưng mang về và giao hàng; khách tại bàn vẫn được phục vụ. Để trống = 40.</span>
        </label>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-primary" disabled={busy !== null}>{busy === 'save' && <span className="spinner" aria-hidden="true" />} Lưu thông tin</button>
          {owner && <button type="button" className="btn btn-sm btn-danger" disabled={busy !== null} onClick={close}>Ngừng hoạt động chi nhánh</button>}
        </div>
      </div>
    </form>
  )
}

function NewBranch({ existing, onCreated }: { existing: BranchResponse[]; onCreated: (id: number) => Promise<void> }) {
  const toast = useToast()
  const next = `CN${String(existing.length + 1).padStart(2, '0')}`
  const [f, setF] = useState({ code: '', name: '', address: '', city: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function create(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const code = (f.code.trim() || next).toUpperCase()
      const created = await post<BranchResponse>('/branches', { code, name: f.name.trim(), address: f.address.trim(), city: f.city.trim() })
      setF({ code: '', name: '', address: '', city: '' })
      await onCreated(created.id!)
      toast(`Đã thêm ${created.name}: điền vị trí bản đồ ở trên`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thêm được')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel panel-pad" style={{ display: 'grid', gap: 14 }} onSubmit={create}>
      <h2 style={{ margin: 0 }}><Store size={20} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-3px', marginRight: 8 }} />Thêm chi nhánh mới</h2>
      {error && <ErrorNotice message={error} />}
      <div className="grid-form">
        <label className="field">Mã<input className="input" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder={next} pattern="[A-Z0-9_]+" /></label>
        <label className="field">Tên chi nhánh<input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Chi nhánh 10" /></label>
        <label className="field">Địa chỉ<input className="input" required value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
        <label className="field">Thành phố<input className="input" required value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
        <button className="btn btn-primary" disabled={busy}><Plus size={16} aria-hidden="true" /> Thêm chi nhánh</button>
      </div>
    </form>
  )
}
