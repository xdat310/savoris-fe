import { ExternalLink, Plus, Printer, Trash2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { ApiError, del, get, post } from '../api/client'
import type { AreaResponse, TableResponse } from '../api/types'
import { useAuth } from '../auth'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { useToast } from '../components/Toast'
import { useData } from '../lib/useData'

const BASE_KEY = 'savoris.qrBase'
const LEGACY_BASE_KEY = 'dinechain.qrBase'

// localhost only works on this computer; a phone needs the Wi-Fi address (or an ngrok URL typed in by hand)
function defaultBase() {
  try {
    const saved = localStorage.getItem(BASE_KEY) ?? localStorage.getItem(LEGACY_BASE_KEY)
    if (saved && !localStorage.getItem(BASE_KEY)) localStorage.setItem(BASE_KEY, saved)
    if (saved) localStorage.removeItem(LEGACY_BASE_KEY)
    if (saved) return saved
  } catch {
    // storage blocked: fall through to the computed address
  }
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  return local && __LAN_ORIGIN__ ? __LAN_ORIGIN__ : window.location.origin
}

const guestUrl = (base: string, token?: string) => `${base.replace(/\/+$/, '')}/goi-mon/${token}`

// Areas and tables of the branch, each table with the QR code guests scan to order
export function TableQr({ branchId }: { branchId: number }) {
  const { branches } = useAuth()
  const branch = branches.find((b) => b.id === branchId)
  const areas = useData(() => get<AreaResponse[]>(`/branches/${branchId}/areas`), [branchId])
  const tables = useData(() => get<TableResponse[]>(`/branches/${branchId}/tables`), [branchId])
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const [base, setBase] = useState(defaultBase)
  const [areaName, setAreaName] = useState('')
  const [draft, setDraft] = useState<Record<number, { name: string; capacity: string }>>({})

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setError(null)
    try {
      await fn()
      toast(ok)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Có lỗi xảy ra')
    }
  }

  function saveBase(value: string) {
    setBase(value)
    try {
      localStorage.setItem(BASE_KEY, value)
    } catch {
      // not remembered, still used for this visit
    }
  }

  if (areas.loading || tables.loading) return <Loading />
  const isLocal = /\/\/(localhost|127\.0\.0\.1)\b/.test(base)

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {(error || areas.error || tables.error) && <ErrorNotice message={(error || areas.error || tables.error)!} />}

      <div className="panel panel-pad no-print" style={{ display: 'grid', gap: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Mã QR gọi món tại bàn</h2>
          <button className="btn btn-primary" disabled={!tables.data?.length} onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" /> In tất cả mã QR
          </button>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Khách quét mã trên bàn là vào thẳng menu của chi nhánh, biết mình ngồi bàn nào, gọi món xong món xuống bếp ngay. Không cần đăng nhập.
        </p>
        <label className="field">Địa chỉ mở trang gọi món
          <input className="input" value={base} onChange={(e) => saveBase(e.target.value.trim())} spellCheck={false} />
        </label>
        {isLocal && (
          <div className="notice notice-warn">
            Điện thoại không mở được “localhost”. Dùng địa chỉ Wi-Fi của máy này (điện thoại bắt cùng Wi-Fi) hoặc link ngrok.
          </div>
        )}
      </div>

      <form className="panel panel-pad row no-print" onSubmit={(e) => {
        e.preventDefault()
        run(async () => {
          await post(`/branches/${branchId}/areas`, { name: areaName.trim() })
          setAreaName('')
          await areas.reload()
        }, `Đã thêm khu ${areaName.trim()}`)
      }}>
        <label className="field" style={{ flex: 1, minWidth: 200 }}>Thêm khu vực
          <input className="input" required maxLength={100} placeholder="Ví dụ: Tầng 1, Sân vườn" value={areaName} onChange={(e) => setAreaName(e.target.value)} />
        </label>
        <button className="btn" style={{ alignSelf: 'flex-end' }}><Plus size={16} aria-hidden="true" /> Thêm khu</button>
      </form>

      {areas.data?.length === 0 && <div className="panel"><Empty title="Chưa có khu vực nào">Thêm khu vực trước, rồi thêm bàn vào khu.</Empty></div>}

      <div className="qr-sheet">
        {areas.data?.map((area) => {
          const inArea = tables.data?.filter((t) => t.areaId === area.id) ?? []
          const areaId = area.id!
          const d = draft[areaId] ?? { name: '', capacity: '4' }
          return (
            <section key={area.id} className="panel qr-area">
              <div className="panel-head no-print">
                <h2>{area.name}</h2>
                {inArea.length === 0 && (
                  <button className="btn btn-sm btn-danger" onClick={() => run(async () => {
                    await del(`/areas/${area.id}`)
                    await areas.reload()
                  }, `Đã xoá khu ${area.name}`)}><Trash2 size={14} aria-hidden="true" /> Xoá khu</button>
                )}
              </div>
              <div className="qr-grid">
                {inArea.map((t) => (
                  <figure key={t.id} className="qr-card">
                    <div className="qr-where">{branch?.name} · {area.name}</div>
                    <QRCodeSVG value={guestUrl(base, t.qrToken)} size={148} marginSize={2} level="M" />
                    <figcaption>
                      <span className="qr-table">Bàn {t.name}</span>
                      <span className="qr-seats">{t.capacity} ghế</span>
                      <span className="qr-hint">Quét để xem menu &amp; gọi món</span>
                    </figcaption>
                    <div className="row no-print" style={{ justifyContent: 'center' }}>
                      <a className="btn btn-sm btn-ghost" href={guestUrl(window.location.origin, t.qrToken)} target="_blank" rel="noreferrer">
                        <ExternalLink size={14} aria-hidden="true" /> Mở thử
                      </a>
                      <button className="btn btn-sm btn-ghost" aria-label={`Xoá bàn ${t.name}`} onClick={() => {
                        if (!window.confirm(`Xoá bàn ${t.name}?`)) return
                        run(async () => {
                          await del(`/tables/${t.id}`)
                          await tables.reload()
                        }, `Đã xoá bàn ${t.name}`)
                      }}><Trash2 size={14} aria-hidden="true" /></button>
                    </div>
                  </figure>
                ))}
                <form className="qr-add no-print" onSubmit={(e) => {
                  e.preventDefault()
                  run(async () => {
                    await post(`/areas/${area.id}/tables`, { name: d.name.trim(), capacity: Number(d.capacity) })
                    setDraft({ ...draft, [areaId]: { ...d, name: '' } })
                    await tables.reload()
                  }, `Đã thêm bàn ${d.name.trim()}`)
                }}>
                  <label className="field">Tên bàn
                    <input className="input" required maxLength={20} placeholder="Ví dụ: 01" value={d.name}
                      onChange={(e) => setDraft({ ...draft, [areaId]: { ...d, name: e.target.value } })} />
                  </label>
                  <label className="field">Số ghế
                    <input className="input num" required type="number" min={1} max={100} value={d.capacity}
                      onChange={(e) => setDraft({ ...draft, [areaId]: { ...d, capacity: e.target.value } })} />
                  </label>
                  <button className="btn"><Plus size={16} aria-hidden="true" /> Thêm bàn</button>
                </form>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
