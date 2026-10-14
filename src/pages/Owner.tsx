import { Boxes, ChefHat, Copy, CupSoda, Plus, Power, RefreshCw, Store, Trash2, Upload } from 'lucide-react'
import { Fragment, useState, type FormEvent } from 'react'
import { ApiError, get, post, put, upload } from '../api/client'
import type {
  ChainDashboardResponse, CreatePromotionRequest, DishBranchResponse, DishExclusionResponse, IngredientResponse, RecipeLineResponse, MenuCategoryResponse, MenuItemResponse, PromotionResponse, TransferQrSetting, VatSetting, BankAccountSetting,
} from '../api/types'
import { useAuth } from '../auth'
import { Strikable } from '../components/ChalkStrike'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { Chip, LoadState, loadColor } from '../components/State'
import { useToast } from '../components/Toast'
import { dateTime, money, number, time } from '../lib/format'
import { useData } from '../lib/useData'

type Tab = 'overview' | 'menu' | 'promotions' | 'vat' | 'transfer'

export function Owner() {
  const [tab, setTab] = useState<Tab>('overview')
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Toàn chuỗi</h1>
          <p>Mọi chi nhánh trên một màn hình.</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {([['overview', 'Tổng quan hôm nay'], ['menu', 'Menu chung'], ['promotions', 'Khuyến mãi'], ['vat', 'Thuế VAT'], ['transfer', 'Chuyển khoản']] as const).map(([id, label]) => (
          <button key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'menu' && <ChainMenu />}
      {tab === 'promotions' && <Promotions />}
      {tab === 'vat' && <Vat />}
      {tab === 'transfer' && <div className="transfer-tab"><BankTransfer /><TransferQr /></div>}
    </div>
  )
}

// ---------------------------------------------------------------- overview

function Overview() {
  const { setBranchId } = useAuth()
  const dash = useData(() => get<ChainDashboardResponse>('/dashboard/chain'), [], 15000)
  if (dash.error) return <ErrorNotice message={dash.error} onRetry={dash.reload} />
  if (!dash.data) return <Loading />
  const d = dash.data
  // Overloaded kitchens first, then by load
  const branches = [...(d.branches ?? [])].sort((a, b) => (b.kitchen?.loadPercent ?? 0) - (a.kitchen?.loadPercent ?? 0))

  return (
    <div>
      <p style={{ fontSize: 17, margin: '0 0 18px', lineHeight: 1.7 }}>
        Tiền mặt thực thu hôm nay <strong className="chalk" style={{ fontSize: 30, color: 'var(--accent)' }}>{money(d.revenueToday)}</strong>
        <span className="muted" style={{ fontSize: 14 }}> (đã trừ hoàn tiền)</span>.
        {' '}<strong className="num">{d.completedOrdersToday}</strong> đơn hoàn tất, <strong className="num">{d.openOrders}</strong> đơn đang mở.
        {' '}
        {(d.overloadedBranches ?? 0) > 0 ? (
          <span style={{ color: 'var(--red-ink)', fontWeight: 600 }}>{d.overloadedBranches} chi nhánh đang quá tải bếp.</span>
        ) : (
          <span style={{ color: 'var(--green-ink)', fontWeight: 600 }}>Không bếp nào quá tải.</span>
        )}
        <span className="muted" style={{ fontSize: 13, marginLeft: 10 }}>
          <RefreshCw size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} /> cập nhật {time(d.generatedAt)}
        </span>
      </p>
      <table className="branch-board">
        <thead>
          <tr>
            <th>Chi nhánh</th>
            <th>Bếp</th>
            <th>Tải bếp</th>
            <th>Chờ ước tính</th>
            <th className="right">Đơn mở</th>
            <th className="right">Hoàn tất</th>
            <th className="right">Doanh thu</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.branchId} className={b.kitchen?.status === 'OVERLOADED' ? 'overloaded' : ''}>
              <td>
                <span className="bcode">{b.code}</span>
                <button className="btn-ghost" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                  onClick={() => setBranchId(b.branchId!)} title="Chọn làm chi nhánh đang xem">
                  <span className="bname">{b.name}</span>
                </button>
              </td>
              <td data-label="Bếp"><LoadState status={b.kitchen?.status} /></td>
              <td data-label="Tải bếp">
                <div className="loadbar">
                  <div className="track"><div className="fill" style={{ transform: `scaleX(${Math.min(100, b.kitchen?.loadPercent ?? 0) / 100})`, background: loadColor(b.kitchen?.status) }} /></div>
                  <span className="pct">{b.kitchen?.loadPercent}%</span>
                </div>
                <div className="muted num" style={{ fontSize: 12, marginTop: 2 }}>
                  {(b.kitchen?.pendingPortions ?? 0) + (b.kitchen?.cookingPortions ?? 0)}/{b.kitchen?.kitchenCapacity} phần
                </div>
              </td>
              <td data-label="Chờ ước tính" className="num">{b.kitchen?.estimatedWaitMinutes != null ? `${b.kitchen.estimatedWaitMinutes} phút` : <span className="muted">chưa đủ dữ liệu</span>}</td>
              <td data-label="Đơn mở" className="num right">{b.openOrders}</td>
              <td data-label="Hoàn tất" className="num right">{b.completedOrdersToday}</td>
              <td data-label="Doanh thu" className="num right" style={{ fontWeight: 700 }}>{money(b.revenueToday)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------- chain menu

function ChainMenu() {
  const toast = useToast()
  const categories = useData(() => get<MenuCategoryResponse[]>('/menu-categories/search?q='), [])
  const [catId, setCatId] = useState<number | null>(null)
  const activeCat = catId ?? categories.data?.[0]?.id
  const items = useData(() => (activeCat ? get<MenuItemResponse[]>(`/menu-items/category/${activeCat}`) : Promise.resolve([])), [activeCat])
  const [form, setForm] = useState({ code: '', name: '', basePrice: '', unit: 'phần', imageUrl: '', needsKitchen: true })
  const { branches } = useAuth()
  // Which branches do not sell which dish, to show "bán ở 7/9 chi nhánh" on every row
  const exclusions = useData(() => get<DishExclusionResponse[]>('/menu-items/branch-exclusions'), [])
  const [branchesOf, setBranchesOf] = useState<number | null>(null)
  const [recipeOf, setRecipeOf] = useState<number | null>(null)
  const sellingAt = (id?: number) => branches.length - (exclusions.data?.filter((e) => e.menuItemId === id && branches.some((b) => b.id === e.branchId)).length ?? 0)
  const [newCat, setNewCat] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function act(fn: () => Promise<unknown>, ok: string) {
    setError(null)
    try {
      await fn()
      toast(ok)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Có lỗi xảy ra')
    }
  }

  const addItem = (e: FormEvent) => {
    e.preventDefault()
    act(async () => {
      await post('/menu-items', {
        categoryId: activeCat, code: form.code.trim(), name: form.name.trim(), basePrice: Number(form.basePrice), unit: form.unit,
        imageUrl: form.imageUrl.trim() || undefined, needsKitchen: form.needsKitchen,
      })
      setForm({ code: '', name: '', basePrice: '', unit: 'phần', imageUrl: '', needsKitchen: true })
      await items.reload()
    }, 'Đã thêm món')
  }

  const update = (it: MenuItemResponse, patch: Partial<MenuItemResponse>) => act(async () => {
    await put(`/menu-items/${it.id}`, { name: it.name, description: it.description, basePrice: it.basePrice, unit: it.unit, isActive: it.isActive, imageUrl: it.imageUrl, needsKitchen: it.needsKitchen, ...patch })
    await items.reload()
  }, 'Đã cập nhật món')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 260px) 1fr', gap: 18, alignItems: 'start' }}>
      <div className="panel">
        <div className="panel-head"><h2>Danh mục</h2></div>
        <div style={{ padding: 8 }}>
          {categories.data?.map((c) => (
            <button key={c.id} className="rail-link" style={{ width: '100%', border: 'none', background: c.id === activeCat ? 'var(--accent)' : 'none', color: c.id === activeCat ? 'var(--navy-deep)' : 'var(--ink)', cursor: 'pointer' }} onClick={() => setCatId(c.id!)}>
              {c.name}
            </button>
          ))}
          <form className="row" style={{ padding: 8 }} onSubmit={(e) => { e.preventDefault(); act(async () => { await post('/menu-categories', { name: newCat.trim(), sortOrder: (categories.data?.length ?? 0) + 1 }); setNewCat(''); await categories.reload() }, 'Đã thêm danh mục') }}>
            <input className="input" placeholder="Danh mục mới" value={newCat} onChange={(e) => setNewCat(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
            <button className="icon-btn" aria-label="Thêm danh mục" disabled={!newCat.trim()}><Plus size={16} /></button>
          </form>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h2>Món trong danh mục</h2><span className="muted" style={{ fontSize: 13 }}>Giá chung cả chuỗi; chi nhánh có thể đặt giá riêng</span></div>
        {error && <div style={{ padding: '12px 20px 0' }}><ErrorNotice message={error} /></div>}
        {items.loading ? <Loading /> : (items.data?.length ?? 0) === 0 ? <Empty title="Danh mục chưa có món" /> : (
          <table className="data">
            <thead><tr><th>Ảnh</th><th>Mã</th><th>Tên món</th><th className="right">Giá chung</th><th title="Món tính theo gì: phần, bát, đĩa, ly…">Đơn vị bán</th><th title="Món có sẵn (nước, đồ đóng chai…) không qua bếp: nhân viên đưa ngay, hết hàng theo kho">Làm món</th><th>Chi nhánh bán</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {items.data!.map((it) => (
                <Fragment key={it.id}>
                <tr>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      {it.imageUrl
                        ? <img src={it.imageUrl} alt="" style={{ width: 44, height: 33, objectFit: 'cover', borderRadius: 2 }} />
                        : <span style={{ width: 44, height: 33, background: 'var(--sand)', borderRadius: 2, flex: 'none' }} aria-hidden="true" />}
                      <input className="input" type="url" placeholder="Link ảnh" defaultValue={it.imageUrl ?? ''} key={it.imageUrl ?? 'none'} style={{ width: 110, minHeight: 34 }}
                        onBlur={(e) => e.target.value.trim() !== (it.imageUrl ?? '') && update(it, { imageUrl: e.target.value.trim() })} aria-label={`Link ảnh ${it.name}`} />
                      <PhotoUpload compact label={`Tải ảnh ${it.name} lên`} onError={setError} onUploaded={(url) => update(it, { imageUrl: url })} />
                    </div>
                  </td>
                  <td className="num muted" style={{ whiteSpace: 'nowrap' }}>{it.code}</td>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}><Strikable on={!it.isActive}>{it.name}</Strikable></td>
                  <td className="right">
                    <input className="input num" type="number" step={1000} min={0} defaultValue={it.basePrice} style={{ width: 120, textAlign: 'right' }}
                      onBlur={(e) => Number(e.target.value) !== it.basePrice && update(it, { basePrice: Number(e.target.value) })} aria-label={`Giá ${it.name}`} />
                  </td>
                  <td>{it.unit}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <button className={`btn btn-sm${it.needsKitchen === false ? ' btn-accent' : ''}`} title="Bấm để đổi"
                        onClick={() => update(it, { needsKitchen: it.needsKitchen === false })}>
                        {it.needsKitchen === false ? <><CupSoda size={14} aria-hidden="true" /> Có sẵn</> : <><ChefHat size={14} aria-hidden="true" /> Qua bếp</>}
                      </button>
                      <button className="btn btn-sm btn-ghost" aria-expanded={recipeOf === it.id} onClick={() => setRecipeOf(recipeOf === it.id ? null : it.id!)}>
                        <Boxes size={14} aria-hidden="true" /> Nguyên liệu
                      </button>
                    </div>
                  </td>
                  <td>
                    <button className={`btn btn-sm${sellingAt(it.id) < branches.length ? ' btn-accent' : ''}`} aria-expanded={branchesOf === it.id}
                      onClick={() => setBranchesOf(branchesOf === it.id ? null : it.id!)}>
                      <Store size={14} aria-hidden="true" /> <span className="num">{sellingAt(it.id)}/{branches.length}</span>
                    </button>
                  </td>
                  <td>{it.isActive ? <Chip tone="ok">Đang bán</Chip> : <Chip tone="neutral">Ngừng bán</Chip>}</td>
                  <td className="right">
                    <button className="btn btn-sm" onClick={() => update(it, { isActive: !it.isActive })}>
                      <Power size={14} aria-hidden="true" /> {it.isActive ? 'Ngừng bán' : 'Bán lại'}
                    </button>
                  </td>
                </tr>
                {branchesOf === it.id && (
                  <tr className="dish-branches-row">
                    <td colSpan={9}>
                      <DishBranches dish={it} onSaved={async () => { await exclusions.reload(); toast(`Đã cập nhật chi nhánh bán ${it.name}`) }} />
                    </td>
                  </tr>
                )}
                {recipeOf === it.id && (
                  <tr className="dish-branches-row">
                    <td colSpan={9}>
                      <RecipeEditor dish={it} onSaved={() => toast(`Đã lưu nguyên liệu của ${it.name}`)} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
        <form className="grid-form panel-pad" style={{ borderTop: '1px solid var(--rule)' }} onSubmit={addItem}>
          <label className="field">Mã món<input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="BUN-BO" /></label>
          <label className="field">Tên món<input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bún bò Huế" /></label>
          <label className="field">Giá (đ)<input className="input num" required type="number" min={0} step={1000} value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} /></label>
          <label className="field">Đơn vị<input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
          <label className="field">Làm món
            <select className="select" value={form.needsKitchen ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, needsKitchen: e.target.value === 'yes' })}>
              <option value="yes">Qua bếp (đầu bếp nấu)</option>
              <option value="no">Có sẵn (nước, đồ đóng chai…)</option>
            </select>
          </label>
          <label className="field">Link ảnh món (không bắt buộc)<input className="input" type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…/pho.jpg" /></label>
          <div className="row" style={{ gap: 8, alignSelf: 'flex-end', flexWrap: 'nowrap' }}>
            {form.imageUrl && <img src={form.imageUrl} alt="" style={{ width: 44, height: 33, objectFit: 'cover', borderRadius: 2 }} />}
            <PhotoUpload label="Tải ảnh lên" onError={setError} onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
          </div>
          <button className="btn btn-primary" disabled={!activeCat}><Plus size={16} aria-hidden="true" /> Thêm món</button>
        </form>
      </div>
    </div>
  )
}

// Picks a photo from the computer, stores it on Cloudinary through the API and hands back its link
function PhotoUpload({ label, compact, onUploaded, onError }: {
  label: string; compact?: boolean; onUploaded: (url: string) => void; onError: (message: string | null) => void
}) {
  const [busy, setBusy] = useState(false)

  async function pick(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      onError('Chỉ nhận ảnh PNG, JPG hoặc WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      onError('Ảnh tối đa 5MB.')
      return
    }
    onError(null)
    setBusy(true)
    try {
      onUploaded((await upload<{ url: string }>('/images', file, 'POST')).url)
    } catch (err) {
      onError(err instanceof ApiError && err.code === 'IMAGE_STORAGE_NOT_CONFIGURED'
        ? 'Chưa cài Cloudinary: đặt biến CLOUDINARY_URL cho backend rồi khởi động lại.'
        : err instanceof Error ? err.message : 'Không tải được ảnh lên')
    } finally {
      setBusy(false)
    }
  }

  return (
    <label className={compact ? `icon-btn${busy ? ' is-busy' : ''}` : `btn${busy ? ' is-busy' : ''}`} title={label} aria-label={compact ? label : undefined}>
      {busy ? <span className="spinner" aria-hidden="true" /> : <Upload size={compact ? 15 : 16} aria-hidden="true" />}
      {!compact && label}
      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy}
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
    </label>
  )
}

// ---------------------------------------------------------------- promotions

function Promotions() {
  const toast = useToast()
  const { branches } = useAuth()
  const promos = useData(() => get<PromotionResponse[]>('/promotions'), [])
  const [f, setF] = useState(() => {
    const local = (ms: number) => new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    return {
      code: '', name: '', discountType: 'PERCENT' as CreatePromotionRequest['discountType'], discountValue: '10', maxDiscount: '50000',
      minOrderAmount: '100000', startAt: local(Date.now()), endAt: local(Date.now() + 30 * 86400000), usageLimit: '', branchIds: [] as number[],
    }
  })
  const [now] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)

  async function create(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await post('/promotions', {
        code: f.code.trim(), name: f.name.trim(), discountType: f.discountType, discountValue: Number(f.discountValue),
        maxDiscount: f.discountType === 'PERCENT' && f.maxDiscount ? Number(f.maxDiscount) : undefined,
        minOrderAmount: Number(f.minOrderAmount || 0), startAt: `${f.startAt}:00`, endAt: `${f.endAt}:00`,
        usageLimit: f.usageLimit ? Number(f.usageLimit) : undefined, branchIds: f.branchIds,
      } satisfies CreatePromotionRequest)
      toast('Đã tạo mã khuyến mãi')
      setF({ ...f, code: '', name: '' })
      promos.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tạo được mã')
    }
  }

  async function deactivate(p: PromotionResponse) {
    try {
      await put(`/promotions/${p.id}/deactivate`)
      toast(`Đã ngừng mã ${p.code}`)
      promos.reload()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Không ngừng được mã', true)
    }
  }

  const describe = (p: PromotionResponse) => p.discountType === 'PERCENT'
    ? `Giảm ${p.discountValue}%${p.maxDiscount ? `, tối đa ${money(p.maxDiscount)}` : ''}`
    : `Giảm ${money(p.discountValue)}`

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="panel">
        <div className="panel-head"><h2>Mã khuyến mãi</h2></div>
        {promos.loading ? <Loading /> : (promos.data?.length ?? 0) === 0 ? <Empty title="Chưa có mã nào" /> : (
          <table className="data">
            <thead><tr><th>Mã</th><th>Nội dung</th><th>Đơn tối thiểu</th><th>Thời gian</th><th>Chi nhánh</th><th className="right">Đã dùng</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {promos.data!.map((p) => {
                const running = p.isActive && new Date(p.endAt!).getTime() > now
                return (
                  <tr key={p.id}>
                    <td className="chalk" style={{ fontSize: 20, color: 'var(--accent)' }}><Strikable on={!running}>{p.code}</Strikable></td>
                    <td><div style={{ fontWeight: 600 }}>{p.name}</div><div className="muted" style={{ fontSize: 13 }}>{describe(p)}</div></td>
                    <td className="num">{money(p.minOrderAmount)}</td>
                    <td className="num" style={{ fontSize: 13 }}>{dateTime(p.startAt)} → {dateTime(p.endAt)}</td>
                    <td style={{ fontSize: 13 }}>{p.branchIds?.length ? p.branchIds.map((id) => branches.find((b) => b.id === id)?.code ?? id).join(', ') : 'Cả chuỗi'}</td>
                    <td className="num right">{p.usedCount}{p.usageLimit ? `/${p.usageLimit}` : ''}</td>
                    <td>{running ? <Chip tone="ok">Đang chạy</Chip> : <Chip tone="neutral">Đã ngừng</Chip>}</td>
                    <td className="right">{p.isActive && <button className="btn btn-sm btn-danger" onClick={() => deactivate(p)}>Ngừng</button>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <form className="panel panel-pad" onSubmit={create} style={{ display: 'grid', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>Tạo mã mới</h2>
        {error && <ErrorNotice message={error} />}
        <div className="grid-form">
          <label className="field">Mã<input className="input" required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} placeholder="TET2027" /></label>
          <label className="field">Tên hiển thị<input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Tết giảm 10%" /></label>
          <label className="field">Kiểu giảm
            <select className="select" value={f.discountType} onChange={(e) => setF({ ...f, discountType: e.target.value as CreatePromotionRequest['discountType'] })}>
              <option value="PERCENT">Theo %</option>
              <option value="FIXED_AMOUNT">Số tiền cố định</option>
            </select>
          </label>
          <label className="field">{f.discountType === 'PERCENT' ? 'Phần trăm' : 'Số tiền (đ)'}<input className="input num" required type="number" min={1} value={f.discountValue} onChange={(e) => setF({ ...f, discountValue: e.target.value })} /></label>
          {f.discountType === 'PERCENT' && <label className="field">Giảm tối đa (đ)<input className="input num" type="number" min={0} step={1000} value={f.maxDiscount} onChange={(e) => setF({ ...f, maxDiscount: e.target.value })} /></label>}
          <label className="field">Đơn tối thiểu (đ)<input className="input num" type="number" min={0} step={1000} value={f.minOrderAmount} onChange={(e) => setF({ ...f, minOrderAmount: e.target.value })} /></label>
          <label className="field">Bắt đầu<input className="input" type="datetime-local" required value={f.startAt} onChange={(e) => setF({ ...f, startAt: e.target.value })} /></label>
          <label className="field">Kết thúc<input className="input" type="datetime-local" required value={f.endAt} onChange={(e) => setF({ ...f, endAt: e.target.value })} /></label>
          <label className="field">Giới hạn lượt<input className="input num" type="number" min={1} placeholder="Không giới hạn" value={f.usageLimit} onChange={(e) => setF({ ...f, usageLimit: e.target.value })} /></label>
        </div>
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="field" style={{ marginBottom: 6 }}>Áp dụng tại (bỏ trống = cả chuỗi)</legend>
          <div className="row">
            {branches.map((b) => (
              <label key={b.id} className="row" style={{ gap: 6, fontSize: 14 }}>
                <input type="checkbox" checked={f.branchIds.includes(b.id!)} onChange={(e) => setF({ ...f, branchIds: e.target.checked ? [...f.branchIds, b.id!] : f.branchIds.filter((x) => x !== b.id) })} />
                {b.code}
              </label>
            ))}
          </div>
        </fieldset>
        <div><button className="btn btn-primary"><Plus size={16} aria-hidden="true" /> Tạo mã</button></div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------- VAT

function Vat() {
  const toast = useToast()
  const vat = useData(() => get<VatSetting>('/settings/vat'), [])
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!vat.data) return vat.error ? <ErrorNotice message={vat.error} /> : <Loading />

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await put('/settings/vat', { percent: Number(value) })
      toast(`VAT mới: ${value}%`)
      setValue('')
      vat.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được')
    }
  }

  return (
    <form className="panel panel-pad" style={{ maxWidth: 520, display: 'grid', gap: 14 }} onSubmit={save}>
      <div>
        <div className="muted" style={{ fontSize: 14 }}>Thuế VAT đang áp dụng cho mọi đơn mới</div>
        <div className="chalk" style={{ fontSize: 56, lineHeight: 1.1, color: 'var(--ink)' }}>{number(vat.data.percent, 2)}%</div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>VAT tính trên phần còn lại sau khuyến mãi và điểm. Đơn đã tạo giữ nguyên số tiền cũ.</p>
      </div>
      {error && <ErrorNotice message={error} />}
      <div className="row">
        <input className="input num" type="number" min={0} max={100} step={0.5} required placeholder="Mức mới, ví dụ 10" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: 200 }} />
        <button className="btn btn-primary" disabled={!value}>Đổi VAT</button>
      </div>
    </form>
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
function DishBranches({ dish, onSaved }: { dish: MenuItemResponse; onSaved: () => Promise<void> }) {
  const list = useData(() => get<DishBranchResponse[]>(`/menu-items/${dish.id}/branches`), [dish.id])
  const [picked, setPicked] = useState<Set<number> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (list.loading) return <Loading />
  const selected = picked ?? new Set((list.data ?? []).filter((b) => b.offered).map((b) => b.branchId!))
  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await put(`/menu-items/${dish.id}/branches`, { branchIds: [...selected] })
      setPicked(null)
      await list.reload()
      await onSaved()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lưu được')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dish-branches">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>{dish.name} bán ở chi nhánh nào?</strong>
        <div className="row">
          <button className="btn btn-sm btn-ghost" onClick={() => setPicked(new Set((list.data ?? []).map((b) => b.branchId!)))}>Chọn tất cả</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setPicked(new Set())}>Bỏ chọn hết</button>
        </div>
      </div>
      {error && <ErrorNotice message={error} />}
      <div className="dish-branch-grid">
        {list.data?.map((b) => (
          <label key={b.branchId} className={`dish-branch${selected.has(b.branchId!) ? ' on' : ''}`}>
            <input type="checkbox" checked={selected.has(b.branchId!)} onChange={() => toggle(b.branchId!)} />
            <span className="dish-branch-code">{b.code}</span>
            <span>{b.name}</span>
          </label>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Chi nhánh không được chọn sẽ không thấy món này ở quầy, menu QR tại bàn và đặt mang về. Khác với “Báo hết món” (chỉ hết tạm thời).
        </span>
        <button className="btn btn-primary btn-sm" disabled={busy || picked === null} onClick={save}>
          {busy && <span className="spinner" aria-hidden="true" />} Lưu · bán ở {selected.size}/{list.data?.length ?? 0}
        </button>
      </div>
    </div>
  )
}

// The ingredients of one portion. For a ready-made dish this is what makes it sell out on its own when the stock runs out;
// for a cooked dish the stock is taken when the cook starts it.
function RecipeEditor({ dish, onSaved }: { dish: MenuItemResponse; onSaved: () => void }) {
  const recipe = useData(() => get<RecipeLineResponse[]>(`/menu-items/${dish.id}/recipe`), [dish.id])
  const ingredients = useData(() => get<IngredientResponse[]>('/ingredients'), [])
  const [lines, setLines] = useState<{ ingredientId: string; quantity: string }[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (recipe.loading || ingredients.loading) return <Loading />
  const current = lines ?? (recipe.data ?? []).map((l) => ({ ingredientId: String(l.ingredientId), quantity: String(l.quantity) }))
  const unitOf = (id: string) => ingredients.data?.find((i) => String(i.id) === id)?.unit ?? ''
  const change = (i: number, patch: Partial<{ ingredientId: string; quantity: string }>) => setLines(current.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await put(`/menu-items/${dish.id}/recipe`, {
        lines: current.filter((l) => l.ingredientId && Number(l.quantity) > 0).map((l) => ({ ingredientId: Number(l.ingredientId), quantity: Number(l.quantity) })),
      })
      setLines(null)
      await recipe.reload()
      onSaved()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lưu được')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dish-branches">
      <strong>Nguyên liệu cho 1 {dish.unit ?? 'phần'} {dish.name}</strong>
      <span className="muted" style={{ fontSize: 13 }}>
        {dish.needsKitchen === false
          ? 'Món có sẵn: trừ kho ngay khi gọi, kho không đủ thì món tự báo hết. Ví dụ Coca chai = 1 chai "Coca-Cola chai".'
          : 'Món qua bếp: trừ kho khi đầu bếp bấm nhận nấu.'}
        {(ingredients.data?.length ?? 0) === 0 && ' Chưa có nguyên liệu nào: nhập kho ở mục Kho & nhập hàng trước.'}
      </span>
      {error && <ErrorNotice message={error} />}
      {current.map((l, i) => (
        <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
          <select className="select" value={l.ingredientId} onChange={(e) => change(i, { ingredientId: e.target.value })} style={{ minWidth: 220 }}>
            <option value="">Chọn nguyên liệu</option>
            {ingredients.data?.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.unit})</option>)}
          </select>
          <input className="input num" type="number" min={0} step="any" value={l.quantity} onChange={(e) => change(i, { quantity: e.target.value })} style={{ width: 110 }} aria-label="Số lượng" />
          <span className="muted" style={{ minWidth: 40 }}>{unitOf(l.ingredientId)}</span>
          <button className="icon-btn" aria-label="Bỏ dòng" onClick={() => setLines(current.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
        </div>
      ))}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-sm btn-ghost" disabled={(ingredients.data?.length ?? 0) === 0} onClick={() => setLines([...current, { ingredientId: '', quantity: '1' }])}><Plus size={14} aria-hidden="true" /> Thêm nguyên liệu</button>
        <button className="btn btn-sm btn-primary" disabled={busy || lines === null} onClick={save}>{busy && <span className="spinner" aria-hidden="true" />} Lưu nguyên liệu</button>
      </div>
    </div>
  )
}
