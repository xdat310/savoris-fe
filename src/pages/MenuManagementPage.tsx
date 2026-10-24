import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ImagePlus, Plus, Save, Trash2, X } from 'lucide-react'
import { ApiError, del, get, post, put, upload } from '../api/client'
import type { BranchMenuItemResponse, BranchResponse, MenuCategoryResponse, MenuItemResponse } from '../api/types'
import './menu-management-page.css'

type CategoryDraft = { id?: number; name: string; sortOrder: number; isActive: boolean }
type ItemDraft = {
  id?: number; code: string; name: string; description: string; categoryId: number; basePrice: number
  imageUrl: string; unit: string; isActive: boolean; needsKitchen: boolean; takeawayAvailable: boolean
}
const emptyItem = (): ItemDraft => ({ code: '', name: '', description: '', categoryId: 0, basePrice: 0, imageUrl: '', unit: 'phần', isActive: true, needsKitchen: true, takeawayAvailable: true })

export function MenuManagementPage() {
  const [categories, setCategories] = useState<MenuCategoryResponse[]>([])
  const [items, setItems] = useState<MenuItemResponse[]>([])
  const [branches, setBranches] = useState<BranchResponse[]>([])
  const [branchId, setBranchId] = useState<number | null>(null)
  const [branchMenu, setBranchMenu] = useState<BranchMenuItemResponse[]>([])
  const [editingCategory, setEditingCategory] = useState<CategoryDraft | null>(null)
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null)
  const [offeredBranchIds, setOfferedBranchIds] = useState<number[]>([])
  const [imageUploading, setImageUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setError('')
    try {
      const [categoryRows, itemRows, branchRows] = await Promise.all([
        get<MenuCategoryResponse[]>('/menu-categories/search?q='),
        get<MenuItemResponse[]>('/menu-items/search?q='),
        get<BranchResponse[]>('/branches'),
      ])
      setCategories(categoryRows.filter((category) => category.isActive !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
      setItems(itemRows.filter((item) => item.isActive !== false).sort((a, b) => (a.categoryId ?? 0) - (b.categoryId ?? 0) || (a.name ?? '').localeCompare(b.name ?? '', 'vi')))
      setBranches(branchRows)
      setBranchId((current) => current ?? branchRows[0]?.id ?? null)
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không tải được thực đơn') }
    finally { setLoading(false) }
  }

  async function refreshBranchMenu(id = branchId) {
    if (!id) { setBranchMenu([]); return }
    try { setBranchMenu(await get<BranchMenuItemResponse[]>(`/branches/${id}/menu`)) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Không tải được menu chi nhánh') }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    void refreshBranchMenu(branchId)
  }, [branchId])

  const orderedCategories = useMemo(() => categories, [categories])
  const categoryName = (id?: number) => categories.find((category) => category.id === id)?.name ?? 'Chưa có danh mục'

  async function saveCategory(event: FormEvent) {
    event.preventDefault()
    if (!editingCategory) return
    setBusy(true); setError(''); setNotice('')
    try {
      const payload = { name: editingCategory.name.trim(), sortOrder: editingCategory.sortOrder, isActive: editingCategory.isActive }
      if (editingCategory.id) await put(`/menu-categories/${editingCategory.id}`, payload)
      else await post('/menu-categories', payload)
      setEditingCategory(null); setNotice('Đã lưu danh mục'); await load()
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không lưu được danh mục') }
    finally { setBusy(false) }
  }

  async function removeCategory(category: MenuCategoryResponse) {
    if (!category.id || !window.confirm(`Ẩn danh mục “${category.name}”?`)) return
    try { await del(`/menu-categories/${category.id}`); setNotice('Đã ẩn danh mục'); await load() }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Không xóa được danh mục') }
  }

  async function saveItem(event: FormEvent) {
    event.preventDefault()
    if (!itemDraft) return
    setBusy(true); setError(''); setNotice('')
    try {
      const { id, ...payload } = itemDraft
      const savedItem = id
        ? await put<MenuItemResponse>(`/menu-items/${id}`, payload)
        : await post<MenuItemResponse>('/menu-items', payload)
      const saved = id
        ? items.find((item) => item.id === id)
        : undefined
      const itemId = savedItem.id ?? id
      if (itemId) await put(`/menu-items/${itemId}/branches`, { branchIds: offeredBranchIds })
      setItemDraft(null); setNotice(saved ? 'Đã cập nhật món' : 'Đã thêm món'); await load(); await refreshBranchMenu()
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không lưu được món') }
    finally { setBusy(false) }
  }

  async function editItem(item: MenuItemResponse) {
    if (!item.id) return
    setError('')
    try {
      const offered = await get<{ branchId: number; offered: boolean }[]>(`/menu-items/${item.id}/branches`)
      setOfferedBranchIds(offered.filter((branch) => branch.offered).map((branch) => branch.branchId))
      setItemDraft({ id: item.id, code: item.code ?? '', name: item.name ?? '', description: item.description ?? '', categoryId: item.categoryId ?? 0, basePrice: item.basePrice ?? 0, imageUrl: item.imageUrl ?? '', unit: item.unit ?? 'phần', isActive: item.isActive !== false, needsKitchen: item.needsKitchen !== false, takeawayAvailable: item.takeawayAvailable !== false })
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không tải được món') }
  }

  async function removeItem(item: MenuItemResponse) {
    if (!item.id || !window.confirm(`Ẩn món “${item.name}”? Lịch sử đơn hàng sẽ được giữ lại.`)) return
    try { await del(`/menu-items/${item.id}`); setNotice('Đã ẩn món'); await load(); await refreshBranchMenu() }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Không xóa được món') }
  }

  async function toggleOffered(item: MenuItemResponse, offered: boolean) {
    if (!item.id) return
    setBusy(true); setError('')
    try {
      const rows = await get<{ branchId: number; offered: boolean }[]>(`/menu-items/${item.id}/branches`)
      const selected = new Set(rows.filter((row) => row.offered).map((row) => row.branchId))
      if (branchId == null) return
      offered ? selected.add(branchId) : selected.delete(branchId)
      await put(`/menu-items/${item.id}/branches`, { branchIds: [...selected] })
      setNotice('Đã cập nhật chi nhánh bán món'); await load(); await refreshBranchMenu()
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không cập nhật được chi nhánh bán món') }
    finally { setBusy(false) }
  }

  async function toggleAvailability(item: MenuItemResponse) {
    const branchItem = branchMenu.find((row) => row.menuItemId === item.id)
    if (!branchId || !branchItem?.menuItemId) return
    setBusy(true); setError('')
    try {
      await put(`/branches/${branchId}/menu/${branchItem.menuItemId}/availability`, { available: !branchItem.available })
      setBranchMenu((rows) => rows.map((row) => row.menuItemId === item.id ? { ...row, available: !branchItem.available } : row))
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không đổi được trạng thái món') }
    finally { setBusy(false) }
  }

  async function uploadPhoto(file?: File) {
    if (!file) return
    setImageUploading(true); setError('')
    try {
      const response = await upload<{ url: string }>('/images', file, 'POST')
      setItemDraft((draft) => draft ? { ...draft, imageUrl: response.url } : draft)
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Tải ảnh lên Cloudinary thất bại') }
    finally { setImageUploading(false) }
  }

  if (loading) return <div className="ap-page"><div className="ap-empty">Đang tải thực đơn…</div></div>
  return <div className="ap-page menu-page">
    <div className="ap-heading"><div><span className="ap-kicker">SAVORIS · QUẢN LÝ SẢN PHẨM</span><h1>Thực đơn</h1><p>Danh mục, món ăn, ảnh và trạng thái bán theo chi nhánh.</p></div><button onClick={() => { setItemDraft(emptyItem()); setOfferedBranchIds(branchId ? [branchId] : []) }}><Plus size={16}/> Thêm món</button></div>
    {error && <div className="menu-message is-error" role="alert">{error}</div>}{notice && <div className="menu-message">{notice}</div>}
    <section className="menu-panel"><div className="menu-section-head"><div><h2>Danh mục</h2><p>Sắp xếp thứ tự hiển thị bằng số thứ tự.</p></div><button className="menu-secondary" onClick={() => setEditingCategory({ name: '', sortOrder: categories.length + 1, isActive: true })}><Plus size={15}/> Thêm danh mục</button></div>
      {editingCategory && <form className="menu-category-form" onSubmit={saveCategory}><label>Tên danh mục<input required value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}/></label><label>Thứ tự<input required type="number" min="0" value={editingCategory.sortOrder} onChange={(e) => setEditingCategory({ ...editingCategory, sortOrder: Number(e.target.value) })}/></label><button disabled={busy}><Save size={15}/> Lưu</button><button type="button" className="menu-icon-button" aria-label="Đóng sửa danh mục" onClick={() => setEditingCategory(null)}><X size={16}/></button></form>}
      <div className="menu-category-list">{orderedCategories.map((category) => <div className="menu-category-row" key={category.id}><span>{category.sortOrder ?? 0}</span><strong>{category.name}</strong><button onClick={() => setEditingCategory({ id: category.id, name: category.name ?? '', sortOrder: category.sortOrder ?? 0, isActive: true })}>Sửa</button><button className="menu-danger" onClick={() => void removeCategory(category)} aria-label={`Ẩn ${category.name}`}><Trash2 size={15}/></button></div>)}</div>
    </section>

    <section className="menu-panel"><div className="menu-section-head"><div><h2>Món ăn</h2><p>{items.length} món trong thực đơn.</p></div><label>Chi nhánh<select aria-label="Chi nhánh thực đơn" value={branchId ?? ''} onChange={(e) => setBranchId(Number(e.target.value) || null)}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}</select></label></div>
      <div className="menu-table-wrap"><table className="menu-table"><thead><tr><th>Món</th><th>Danh mục</th><th>Giá</th><th>Bán tại</th><th>Tình trạng</th><th></th></tr></thead><tbody>{items.map((item) => { const branchItem = branchMenu.find((row) => row.menuItemId === item.id); return <tr key={item.id}><td><div className="menu-dish-cell">{item.imageUrl ? <img src={item.imageUrl} alt=""/> : <span className="menu-no-image">Ảnh</span>}<div><strong>{item.name}</strong><small>{item.code} · {item.description || 'Chưa có mô tả'}</small></div></div></td><td>{categoryName(item.categoryId)}</td><td>{new Intl.NumberFormat('vi-VN').format(item.basePrice ?? 0)} ₫</td><td><label className="menu-inline-check"><input type="checkbox" checked={!!branchItem} disabled={busy || !branchId} onChange={(e) => void toggleOffered(item, e.target.checked)}/> {branchItem ? 'Đang bán' : 'Không bán'}</label></td><td>{branchItem ? <button className={`menu-stock ${branchItem.available ? 'is-on' : 'is-off'}`} disabled={busy} onClick={() => void toggleAvailability(item)}>{branchItem.available ? 'Còn món' : 'Hết món'}</button> : <span className="menu-muted">—</span>}</td><td className="menu-row-actions"><button onClick={() => void editItem(item)}>Sửa</button><button className="menu-danger" onClick={() => void removeItem(item)} aria-label={`Ẩn món ${item.name}`}><Trash2 size={15}/></button></td></tr> })}</tbody></table>{items.length === 0 && <div className="ap-empty">Chưa có món. Hãy thêm danh mục và món đầu tiên.</div>}</div>
    </section>

    {itemDraft && <div className="menu-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setItemDraft(null) }}><section className="menu-modal" role="dialog" aria-modal="true" aria-labelledby="menu-item-title"><div className="menu-modal-head"><h2 id="menu-item-title">{itemDraft.id ? 'Sửa món' : 'Thêm món'}</h2><button className="menu-icon-button" aria-label="Đóng" onClick={() => setItemDraft(null)}><X size={18}/></button></div><form onSubmit={saveItem}>
      <div className="menu-form-grid"><label>Mã món<input required disabled={!!itemDraft.id} value={itemDraft.code} onChange={(e) => setItemDraft({ ...itemDraft, code: e.target.value.trim().toUpperCase() })}/></label><label>Tên món<input required value={itemDraft.name} onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value })}/></label><label>Danh mục<select required value={itemDraft.categoryId || ''} onChange={(e) => setItemDraft({ ...itemDraft, categoryId: Number(e.target.value) })}><option value="" disabled>Chọn danh mục</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Giá (VND)<input required type="number" min="0" step="1000" value={itemDraft.basePrice} onChange={(e) => setItemDraft({ ...itemDraft, basePrice: Number(e.target.value) })}/></label><label>Đơn vị<input value={itemDraft.unit} onChange={(e) => setItemDraft({ ...itemDraft, unit: e.target.value })}/></label><label className="menu-span-2">Mô tả<textarea rows={3} value={itemDraft.description} onChange={(e) => setItemDraft({ ...itemDraft, description: e.target.value })}/></label></div>
      <div className="menu-photo-field"><span>Ảnh món</span>{itemDraft.imageUrl && <img src={itemDraft.imageUrl} alt="Ảnh xem trước món"/>}<label><ImagePlus size={16}/>{imageUploading ? 'Đang tải lên…' : itemDraft.imageUrl ? 'Đổi ảnh' : 'Chọn ảnh'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={imageUploading} onChange={(e) => { void uploadPhoto(e.target.files?.[0]); e.target.value = '' }}/></label><small>JPG, PNG hoặc WebP · tối đa 5 MB · lưu trên Cloudinary</small></div>
      <div className="menu-options"><label><input type="checkbox" checked={itemDraft.takeawayAvailable} onChange={(e) => setItemDraft({ ...itemDraft, takeawayAvailable: e.target.checked })}/> Bán mang về</label><label><input type="checkbox" checked={itemDraft.needsKitchen} onChange={(e) => setItemDraft({ ...itemDraft, needsKitchen: e.target.checked })}/> Cần bếp chế biến</label><label><input type="checkbox" checked={itemDraft.isActive} onChange={(e) => setItemDraft({ ...itemDraft, isActive: e.target.checked })}/> Đang hoạt động</label></div>
      {itemDraft.id && <fieldset className="menu-branches"><legend>Chi nhánh bán món</legend>{branches.map((branch) => <label key={branch.id}><input type="checkbox" checked={offeredBranchIds.includes(branch.id!)} onChange={(e) => setOfferedBranchIds((ids) => e.target.checked ? [...ids, branch.id!] : ids.filter((id) => id !== branch.id))}/>{branch.code} · {branch.name}</label>)}<small>Món mới sẽ được thêm vào chi nhánh đang chọn. Có thể bật thêm các chi nhánh sau khi lưu.</small></fieldset>}
      <div className="menu-modal-actions"><button type="button" className="menu-secondary" onClick={() => setItemDraft(null)}>Hủy</button><button disabled={busy || imageUploading || categories.length === 0}><Save size={15}/>{busy ? 'Đang lưu…' : 'Lưu món'}</button></div>
    </form></section></div>}
  </div>
}
