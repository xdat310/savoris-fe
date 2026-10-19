import { PackageCheck, Plus, Send, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError, get, post, put } from '../api/client'
import type { IngredientResponse, InventoryResponse, PurchaseOrderResponse, SupplierResponse } from '../api/types'
import { useAuth } from '../auth'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { Chip } from '../components/State'
import { useToast } from '../components/Toast'
import { dateTime, money, number } from '../lib/format'
import { useData } from '../lib/useData'
import { StockImport } from './StockImport'

const PO_STATUS: Record<string, { label: string; tone: 'neutral' | 'info' | 'ok' | 'bad' }> = {
  DRAFT: { label: 'Nháp, chờ duyệt', tone: 'neutral' },
  ORDERED: { label: 'Đã đặt, chờ hàng', tone: 'info' },
  RECEIVED: { label: 'Đã nhận hàng', tone: 'ok' },
  CANCELLED: { label: 'Đã huỷ', tone: 'bad' },
}

export function Stock() {
  const { branchId, branches, role } = useAuth()
  const toast = useToast()
  const manager = role === 'ADMIN' || role === 'MANAGER'
  const branch = branches.find((b) => b.id === branchId)
  const ingredients = useData(() => get<IngredientResponse[]>('/ingredients'), [])
  const stock = useData(() => get<InventoryResponse[]>(`/inventory/branch/${branchId}`), [branchId])
  const low = useData(() => get<InventoryResponse[]>(`/inventory/branch/${branchId}/low-stock`), [branchId])
  const orders = useData(() => get<PurchaseOrderResponse[]>(`/purchase-orders/branch/${branchId}`), [branchId])
  const suppliers = useData(() => get<SupplierResponse[]>('/suppliers'), [])
  const [error, setError] = useState<string | null>(null)

  const ing = (id?: number) => ingredients.data?.find((i) => i.id === id)
  const lowIds = new Set(low.data?.map((l) => l.ingredientId))

  async function run(fn: () => Promise<unknown>, ok: string) {
    setError(null)
    try {
      await fn()
      toast(ok)
      await Promise.all([stock.reload(), low.reload(), orders.reload()])
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Có lỗi xảy ra')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Kho & nhập hàng {branch ? `· ${branch.name}` : ''}</h1>
          <p>Nguyên liệu tự trừ theo công thức khi bếp nhận nấu (món có sẵn: khi gọi); nhận hàng thì tự cộng.</p>
        </div>
      </div>
      {error && <div style={{ marginBottom: 16 }}><ErrorNotice message={error} /></div>}
      <div style={{ marginBottom: 18 }}>
        <StockImport branchId={branchId!} onImported={async () => { await Promise.all([stock.reload(), low.reload(), ingredients.reload()]) }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18, alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-head">
            <h2>Tồn kho</h2>
            {(low.data?.length ?? 0) > 0 ? <Chip tone="bad">{low.data!.length} nguyên liệu sắp hết</Chip> : <Chip tone="ok">Đủ hàng</Chip>}
          </div>
          {stock.loading ? <Loading /> : (stock.data?.length ?? 0) === 0 ? <Empty title="Chi nhánh chưa có tồn kho" /> : (
            <table className="data">
              <thead><tr><th>Nguyên liệu</th><th className="right">Tồn</th><th className="right">Tối thiểu</th><th>Kiểm kho</th></tr></thead>
              <tbody>
                {[...stock.data!].sort((a, b) => Number(lowIds.has(b.ingredientId)) - Number(lowIds.has(a.ingredientId))).map((s) => {
                  const i = ing(s.ingredientId)
                  const isLow = lowIds.has(s.ingredientId)
                  return (
                    <tr key={s.id} style={isLow ? { background: 'var(--red-wash)' } : undefined}>
                      <td style={{ fontWeight: 600 }}>{i?.name ?? `#${s.ingredientId}`} {isLow && <Chip tone="bad">Sắp hết</Chip>}</td>
                      <td className="num right" style={{ fontWeight: 700 }}>{number(s.quantity, 3)} {i?.unit}</td>
                      <td className="num right muted">{number(i?.minStock, 3)}</td>
                      <td>
                        <input className="input num" type="number" step="0.1" min={0} placeholder="Số thực tế" style={{ width: 120 }}
                          aria-label={`Số kiểm kho ${i?.name}`}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return
                            const value = Number((e.target as HTMLInputElement).value)
                            run(() => put(`/inventory/branch/${branchId}/ingredient/${s.ingredientId}`, { quantity: value, notes: 'Kiểm kho' }), `Đã cập nhật ${i?.name}`)
                          }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <NewPurchaseOrder
          branchId={branchId!}
          ingredients={ingredients.data ?? []}
          suppliers={suppliers.data ?? []}
          lowIds={lowIds}
          onCreate={(body) => run(() => post('/purchase-orders', body), 'Đã lập phiếu nhập')}
        />
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head"><h2>Phiếu nhập</h2>{!manager && <span className="muted" style={{ fontSize: 13 }}>Quản lý duyệt phiếu trước khi đặt hàng</span>}</div>
        {orders.loading ? <Loading /> : (orders.data?.length ?? 0) === 0 ? <Empty title="Chưa có phiếu nhập" /> : (
          <table className="data">
            <thead><tr><th>Mã phiếu</th><th>Nhà cung cấp</th><th>Hàng</th><th className="right">Thành tiền</th><th>Trạng thái</th><th>Lập lúc</th><th /></tr></thead>
            <tbody>
              {orders.data!.map((o) => {
                const s = PO_STATUS[o.status ?? 'DRAFT']
                return (
                  <tr key={o.id}>
                    <td className="num" style={{ fontWeight: 700 }}>{o.code}</td>
                    <td>{suppliers.data?.find((x) => x.id === o.supplierId)?.name ?? `#${o.supplierId}`}</td>
                    <td style={{ fontSize: 13 }}>{o.items?.map((it) => `${it.ingredientName} ${number(it.receivedQuantity ?? it.quantity, 3)} ${it.unit}`).join(', ')}</td>
                    <td className="num right" style={{ fontWeight: 700 }}>{money(o.totalAmount)}</td>
                    <td><Chip tone={s.tone}>{s.label}</Chip></td>
                    <td className="num" style={{ fontSize: 13 }}>{dateTime(o.createdAt)}</td>
                    <td className="right">
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        {o.status === 'DRAFT' && manager && <button className="btn btn-sm btn-accent" onClick={() => run(() => put(`/purchase-orders/${o.id}/order`), `Đã đặt hàng ${o.code}`)}><Send size={14} aria-hidden="true" /> Duyệt & đặt</button>}
                        {o.status === 'ORDERED' && <button className="btn btn-sm" onClick={() => run(() => put(`/purchase-orders/${o.id}/receive`), `Đã nhận hàng ${o.code}`)}><PackageCheck size={14} aria-hidden="true" /> Nhận đủ hàng</button>}
                        {(o.status === 'DRAFT' || o.status === 'ORDERED') && manager && <button className="btn btn-sm btn-danger" onClick={() => window.confirm(`Huỷ phiếu ${o.code}?`) && run(() => put(`/purchase-orders/${o.id}/cancel`), `Đã huỷ ${o.code}`)}>Huỷ</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function NewPurchaseOrder({ branchId, ingredients, suppliers, lowIds, onCreate }: {
  branchId: number; ingredients: IngredientResponse[]; suppliers: SupplierResponse[]; lowIds: Set<number | undefined>
  onCreate: (body: unknown) => Promise<void>
}) {
  const [supplierId, setSupplierId] = useState('')
  const [lines, setLines] = useState<{ ingredientId: string; quantity: string; unitPrice: string }[]>([{ ingredientId: '', quantity: '', unitPrice: '' }])
  const total = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0), 0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    await onCreate({
      branchId, supplierId: Number(supplierId),
      items: lines.filter((l) => l.ingredientId).map((l) => ({ ingredientId: Number(l.ingredientId), quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
    })
    setLines([{ ingredientId: '', quantity: '', unitPrice: '' }])
  }

  return (
    <form className="panel panel-pad" style={{ display: 'grid', gap: 12 }} onSubmit={submit}>
      <h2 style={{ margin: 0, fontSize: 17 }}>Lập phiếu nhập</h2>
      <label className="field">Nhà cung cấp
        <select className="select" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">Chọn nhà cung cấp</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      {lines.map((l, i) => (
        <div key={i} className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: 2, minWidth: 150 }}>Nguyên liệu
            <select className="select" required value={l.ingredientId} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, ingredientId: e.target.value } : x)))}>
              <option value="">Chọn</option>
              {ingredients.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.unit}){lowIds.has(g.id) ? ' · sắp hết' : ''}</option>)}
            </select>
          </label>
          <label className="field" style={{ flex: 1, minWidth: 80 }}>Số lượng<input className="input num" required type="number" min={0.001} step="0.1" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} /></label>
          <label className="field" style={{ flex: 1, minWidth: 100 }}>Đơn giá<input className="input num" required type="number" min={0} step={1000} value={l.unitPrice} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))} /></label>
          <button type="button" className="icon-btn" aria-label="Bỏ dòng" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
        </div>
      ))}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-sm" onClick={() => setLines([...lines, { ingredientId: '', quantity: '', unitPrice: '' }])}><Plus size={14} aria-hidden="true" /> Thêm dòng</button>
        <span className="num">Thành tiền: <strong>{money(total)}</strong></span>
      </div>
      <button className="btn btn-primary">Lập phiếu (chờ duyệt)</button>
    </form>
  )
}
