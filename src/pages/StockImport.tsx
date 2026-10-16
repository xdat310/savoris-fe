import { Download, FileSpreadsheet, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError, post } from '../api/client'
import type { StockImportResponse } from '../api/types'
import { ErrorNotice } from '../components/Feedback'
import { useToast } from '../components/Toast'
import { number } from '../lib/format'

interface Row { name: string; unit: string; quantity: number | null; minStock: number | null; problem?: string }

const UNITS = ['kg', 'g', 'lít', 'ml', 'chai', 'lon', 'hộp', 'gói', 'quả', 'bó', 'cái']
const TEMPLATE = 'Tên nguyên liệu,Đơn vị,Tồn kho,Tồn tối thiểu\nThịt bò,kg,12.5,5\nBánh phở,kg,20,8\nCoca-Cola chai,chai,48,24\n'

// "Tồn tối thiểu" → "ton toi thieu": headers match whatever accents or case the sheet uses
const plain = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim()

function column(header: string): keyof Row | null {
  const h = plain(header)
  if (/^(ten|ten nguyen lieu|nguyen lieu|name)$/.test(h)) return 'name'
  if (/^(don vi|don vi tinh|dvt|unit)$/.test(h)) return 'unit'
  if (/^(ton|ton kho|so luong|sl|ton hien tai|quantity)$/.test(h)) return 'quantity'
  if (/^(toi thieu|ton toi thieu|muc toi thieu|min|min stock)$/.test(h)) return 'minStock'
  return null
}

// 12,5 and 12.5 both mean twelve and a half; empty stays empty
function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === '') return null
  if (typeof v === 'number') return v
  const s = String(v).trim().replace(/\s/g, '')
  const n = Number(s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : NaN
}

function parseCsv(text: string): string[][] {
  const delimiter = (text.split('\n')[0].match(/;/g)?.length ?? 0) > (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim() !== ''))
}

function toRows(table: unknown[][]): Row[] {
  const [header, ...body] = table
  const map = (header ?? []).map((h) => column(String(h ?? '')))
  if (!map.includes('name') || !map.includes('quantity')) {
    throw new Error('Không thấy cột "Tên nguyên liệu" và "Tồn kho" ở dòng đầu. Hãy dùng file mẫu.')
  }
  return body.map((cells) => {
    const r: Row = { name: '', unit: '', quantity: null, minStock: null }
    map.forEach((key, i) => {
      if (key === 'name' || key === 'unit') r[key] = String(cells[i] ?? '').trim()
      else if (key === 'quantity' || key === 'minStock') r[key] = toNumber(cells[i])
    })
    if (!r.name) r.problem = 'Thiếu tên'
    else if (r.quantity === null || Number.isNaN(r.quantity) || r.quantity < 0) r.problem = 'Tồn kho không hợp lệ'
    else if (r.minStock !== null && (Number.isNaN(r.minStock) || r.minStock < 0)) r.problem = 'Tồn tối thiểu không hợp lệ'
    return r
  }).filter((r) => r.name || r.quantity !== null)
}

// Getting stock into an empty branch: one ingredient by hand, or a whole stock count from Excel / CSV
export function StockImport({ branchId, onImported }: { branchId: number; onImported: () => Promise<void> }) {
  const toast = useToast()
  const [manual, setManual] = useState({ name: '', unit: '', quantity: '', minStock: '' })
  const [file, setFile] = useState<{ name: string; rows: Row[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function send(rows: { name: string; unit?: string; quantity: number; minStock?: number }[]) {
    const res = await post<StockImportResponse>(`/inventory/branch/${branchId}/import`, { rows })
    await onImported()
    return res
  }

  async function addManual(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await send([{
        name: manual.name.trim(), unit: manual.unit.trim() || undefined, quantity: Number(manual.quantity),
        minStock: manual.minStock === '' ? undefined : Number(manual.minStock),
      }])
      toast(`Đã nhập ${manual.name.trim()}`)
      setManual({ name: '', unit: '', quantity: '', minStock: '' })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không nhập được')
    } finally {
      setBusy(false)
    }
  }

  async function pick(f?: File) {
    if (!f) return
    setError(null)
    try {
      const table = /\.csv$/i.test(f.name)
        ? parseCsv((await f.text()).replace(/^﻿/, ''))
        // The Excel reader is only downloaded when someone actually picks a workbook
        : ((await (await import('read-excel-file/browser')).default(f))[0]?.data ?? []) as unknown[][]
      const rows = toRows(table)
      if (rows.length === 0) throw new Error('File không có dòng nguyên liệu nào.')
      setFile({ name: f.name, rows })
    } catch (err) {
      setFile(null)
      setError(err instanceof Error && !err.message.includes('zip') ? err.message : 'Không đọc được file. Chỉ nhận .xlsx hoặc .csv (lưu từ Excel).')
    }
  }

  async function importFile() {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const good = file.rows.filter((r) => !r.problem)
      const res = await send(good.map((r) => ({ name: r.name, unit: r.unit || undefined, quantity: r.quantity!, minStock: r.minStock ?? undefined })))
      toast(`Đã nhập ${res.updated} nguyên liệu (${res.created} nguyên liệu mới)`)
      setFile(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không nhập được')
    } finally {
      setBusy(false)
    }
  }

  function downloadTemplate() {
    const blob = new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'mau-nhap-kho.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const bad = file?.rows.filter((r) => r.problem).length ?? 0
  return (
    <div className="panel stock-import">
      <div className="panel-head">
        <h2>Nhập kho</h2>
        <span className="muted" style={{ fontSize: 'var(--fs-13)' }}>Ghi số tồn thực tế đang có. Nguyên liệu chưa có sẽ tự được tạo.</span>
      </div>
      <div className="panel-pad stock-import-body">
        {error && <ErrorNotice message={error} />}
        <form className="grid-form" onSubmit={addManual}>
          <label className="field">Tên nguyên liệu<input className="input" required value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Thịt bò" /></label>
          <label className="field">Đơn vị<input className="input" list="stock-units" value={manual.unit} onChange={(e) => setManual({ ...manual, unit: e.target.value })} placeholder="kg" /></label>
          <label className="field">Tồn hiện tại<input className="input num" required type="number" min={0} step="any" value={manual.quantity} onChange={(e) => setManual({ ...manual, quantity: e.target.value })} /></label>
          <label className="field">Tồn tối thiểu<input className="input num" type="number" min={0} step="any" value={manual.minStock} onChange={(e) => setManual({ ...manual, minStock: e.target.value })} placeholder="Không bắt buộc" /></label>
          <button className="btn btn-primary" disabled={busy}><Plus size={16} aria-hidden="true" /> Nhập</button>
          <datalist id="stock-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        </form>

        <div className="stock-file">
          <label className="btn">
            <FileSpreadsheet size={16} aria-hidden="true" /> Chọn file Excel / CSV
            <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <button type="button" className="btn btn-ghost" onClick={downloadTemplate}><Download size={16} aria-hidden="true" /> Tải file mẫu</button>
          <span className="muted" style={{ fontSize: 'var(--fs-13)' }}>Cột: Tên nguyên liệu · Đơn vị · Tồn kho · Tồn tối thiểu</span>
        </div>

        {file && (
          <div className="stock-preview">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{file.name}: {file.rows.length} dòng{bad > 0 && <span style={{ color: 'var(--red-ink)' }}> · {bad} dòng lỗi sẽ bỏ qua</span>}</strong>
              <div className="row">
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setFile(null)}>Huỷ</button>
                <button type="button" className="btn btn-sm btn-primary" disabled={busy || bad === file.rows.length} onClick={importFile}>
                  {busy && <span className="spinner" aria-hidden="true" />} Nhập {file.rows.length - bad} nguyên liệu
                </button>
              </div>
            </div>
            <table className="data">
              <thead><tr><th>Tên nguyên liệu</th><th>Đơn vị</th><th className="right">Tồn kho</th><th className="right">Tối thiểu</th><th /></tr></thead>
              <tbody>
                {file.rows.map((r, i) => (
                  <tr key={i} style={r.problem ? { background: 'var(--red-wash)' } : undefined}>
                    <td style={{ fontWeight: 'var(--fw-semibold)' }}>{r.name || '—'}</td>
                    <td>{r.unit || <span className="muted">giữ như cũ</span>}</td>
                    <td className="num right">{r.quantity == null || Number.isNaN(r.quantity) ? '—' : number(r.quantity, 3)}</td>
                    <td className="num right muted">{r.minStock == null || Number.isNaN(r.minStock) ? '—' : number(r.minStock, 3)}</td>
                    <td>{r.problem && <span className="state state-bad">{r.problem}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
