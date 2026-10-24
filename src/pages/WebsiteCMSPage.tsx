import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, ImagePlus, Plus, Save, Trash2 } from 'lucide-react'
import { ApiError } from '../api/client'
import { createWebsiteItem, deleteWebsiteItem, getWebsiteCms, reorderWebsiteItems, saveBranchPage, saveWebsiteSettings, updateWebsiteItem, uploadWebsiteMedia } from '../api/site'
import { useToast } from '../components/Toast'
import './website-cms-page.css'

type Entry = Record<string, any>
const TABS = [
  ['settings', 'Cài đặt chung'], ['branch', 'Trang chi nhánh'], ['offers', 'Ưu đãi'], ['gallery', 'Thư viện ảnh'],
  ['accolades', 'Giải thưởng'], ['testimonials', 'Đánh giá'], ['hours', 'Giờ mở cửa'], ['menus', 'Thực đơn PDF'],
] as const
const resourceNames: Record<string, string> = { offers: 'offers', gallery: 'gallery', accolades: 'accolades', testimonials: 'testimonials', hours: 'hours', menus: 'menus' }
const valueOf = (row: Entry, camel: string, snake?: string) => row[camel] ?? (snake ? row[snake] : undefined) ?? ''

export function WebsiteCMSPage({ branchOnly = false }: { branchOnly?: boolean }) {
  const toast = useToast()
  const [cms, setCms] = useState<Entry | null>(null)
  const [tab, setTab] = useState<string>(branchOnly ? 'branch' : 'settings')
  const [branchId, setBranchId] = useState<number>(0)
  const [settings, setSettings] = useState<Entry>({})
  const [page, setPage] = useState<Entry>({})
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<Entry>({})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const data = await getWebsiteCms()
    setCms(data)
    setSettings(data.settings ?? {})
    const first = data.branches?.[0]
    const chosen = branchOnly ? (first?.id || 0) : (branchId || first?.id || 0)
    setBranchId(chosen)
    const pageItem = (data.branchPages ?? []).find((item: Entry) => item.branchId === chosen)
    setPage(pageItem?.payload ?? {})
    setDirty(false)
  }
  useEffect(() => { void load().catch(e => setError(e instanceof ApiError ? e.message : 'Không tải được nội dung website')) }, [])
  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
  const items = useMemo(() => { const v = cms?.[tab]; return (Array.isArray(v) ? v : []) as Entry[] }, [cms, tab])
  const visibleItems = useMemo(() => items.filter(item => !valueOf(item, 'branchId', 'branch_id') || Number(valueOf(item, 'branchId', 'branch_id')) === branchId), [items, branchId])

  function setValue(setter: Dispatch<SetStateAction<Entry>>, key: string, value: unknown) {
    setter((old: Entry) => ({ ...old, [key]: value })); setDirty(true)
  }
  async function saveMain(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (tab === 'settings') await saveWebsiteSettings(settings)
      else await saveBranchPage(branchId, page)
      setDirty(false); toast('Đã lưu thay đổi'); await load()
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Lưu không thành công') }
    finally { setBusy(false) }
  }
  async function upload(file?: File) {
    if (!file) return
    const alt = String(draft.imageAlt ?? draft.alt ?? page.heroAlt ?? '').trim()
    if (!alt) { setError('Vui lòng nhập mô tả ảnh trước khi tải lên'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Chỉ nhận ảnh JPG, PNG hoặc WebP'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Ảnh không được vượt quá 5 MB'); return }
    setUploading(true); setError('')
    try {
      const result = await uploadWebsiteMedia(file, alt)
      if (tab === 'branch') { setPage((old: Entry) => ({ ...old, heroImage: result.url, heroAlt: alt })); setDirty(true) }
      else setDraft((old: Entry) => ({ ...old, imageUrl: result.url, imageAlt: alt, alt }))
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Tải ảnh thất bại') }
    finally { setUploading(false) }
  }
  async function saveItem(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const payload = { ...draft, branchId, visible: draft.visible ?? true }
      if (draft.id) await updateWebsiteItem(resourceNames[tab], Number(draft.id), payload)
      else await createWebsiteItem(resourceNames[tab], payload)
      setDraft({}); await load(); toast('Đã lưu nội dung')
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không lưu được nội dung') }
    finally { setBusy(false) }
  }
  async function toggle(item: Entry, field: string, value: unknown) {
    try { await updateWebsiteItem(resourceNames[tab], Number(item.id), { ...item, branchId: valueOf(item, 'branchId', 'branch_id') || branchId, [field]: value }); await load() }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Không cập nhật được nội dung') }
  }
  async function remove(item: Entry) {
    if (!window.confirm('Xóa nội dung này?')) return
    try { await deleteWebsiteItem(resourceNames[tab], Number(item.id)); await load(); toast('Đã xóa nội dung') }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Không xóa được nội dung') }
  }
  async function move(index: number, direction: -1 | 1) {
    const next = [...visibleItems]; const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    try { await reorderWebsiteItems(resourceNames[tab], next.map(item => Number(item.id))); await load() }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Không đổi được thứ tự') }
  }
  function field(key: string, label: string, type = 'text', required = false) {
    return <label key={key}>{label}<input type={type} required={required} value={draft[key] ?? ''} min={type === 'number' ? 0 : undefined} onChange={e => setDraft((old: Entry) => ({ ...old, [key]: type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value }))}/></label>
  }
  function uploadField() {
    return <div className="wc-upload"><label>Mô tả ảnh (alt)<input required value={draft.imageAlt ?? draft.alt ?? ''} onChange={e => setDraft((old: Entry) => ({ ...old, imageAlt: e.target.value, alt: e.target.value }))}/></label><label className="wc-file"><ImagePlus size={16}/>{uploading ? 'Đang tải lên…' : 'Chọn ảnh'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void upload(e.target.files?.[0])}/></label>{draft.imageUrl && <img src={draft.imageUrl} alt={draft.imageAlt ?? ''}/>}</div>
  }
  async function uploadDirect(file: File | undefined, key: string, setter: Dispatch<SetStateAction<Entry>>) {
    if (!file) return
    setUploading(true); setError('')
    try { const r = await uploadWebsiteMedia(file, key); setter((old: Entry) => ({ ...old, [key]: r.url })); setDirty(true) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Tải ảnh thất bại') }
    finally { setUploading(false) }
  }
  function imgField(key: string, label: string, url: string, setter: Dispatch<SetStateAction<Entry>>) {
    return <div key={key} className="wc-image-field"><span className="wc-image-label">{label}</span>{url && <img src={url} alt={label}/>}<label className="wc-file"><ImagePlus size={16}/>{uploading ? 'Đang tải…' : url ? 'Đổi ảnh' : 'Chọn ảnh'}<input aria-label={label} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e => { void uploadDirect(e.target.files?.[0], key, setter); e.target.value = '' }}/></label>{url && <button type="button" className="wc-image-remove" onClick={() => setValue(setter, key, '')}>Gỡ ảnh</button>}<small>JPG, PNG hoặc WebP · tối đa 5 MB · lưu trên Cloudinary</small></div>
  }
  if (!cms) return <div className="wc-page"><p>{error || 'Đang tải CMS…'}</p></div>
  const currentBranch = cms.branches?.find((b: Entry) => Number(b.id) === branchId)
  const tabs = branchOnly ? TABS.filter(([id]) => id !== 'settings') : TABS
  return <div className="wc-page"><div className="wc-heading"><div><span>SAVORIS · NỘI DUNG SỐ</span><h1>Website</h1></div>{currentBranch && <a href={tab === 'settings' ? '/' : `/chi-nhanh/${currentBranch.slug}`} target="_blank" rel="noreferrer">Xem trên website <ExternalLink size={15}/></a>}</div>
    <nav className="wc-tabs" aria-label="Mục website">{tabs.map(([id, label]) => <button className={tab === id ? 'is-active' : ''} key={id} onClick={() => { if (dirty && !window.confirm('Rời trang khi chưa lưu thay đổi?')) return; setDirty(false); setTab(id); setDraft({}) }}>{label}</button>)}</nav>
    {error && <div className="wc-error" role="alert">{error}</div>}
    {(tab === 'settings' || tab === 'branch') && <form className="wc-form" onSubmit={saveMain}>
      {tab === 'branch' && !branchOnly && <label>Chi nhánh<select value={branchId} onChange={e => { const id = Number(e.target.value); if (dirty && !window.confirm('Rời trang khi chưa lưu thay đổi?')) return; setBranchId(id); setPage((cms.branchPages ?? []).find((x: Entry) => x.branchId === id)?.payload ?? {}); setDirty(false) }}>{cms.branches?.map((branch: Entry) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.slug}</option>)}</select></label>}
      {tab === 'settings' ? <>{[['brandLine','Câu thương hiệu'],['facebookUrl','Facebook'],['instagramUrl','Instagram'],['tiktokUrl','TikTok'],['seoTitle','SEO title'],['seoDescription','SEO description']].map(([key,label]) => <label key={key}>{label}<input value={settings[key] ?? ''} onChange={e => setValue(setSettings,key,e.target.value)}/></label>)}{imgField('heroImage','Ảnh hero chuỗi',String(settings.heroImage ?? ''),setSettings)}{imgField('logo','Logo',String(settings.logo ?? ''),setSettings)}</> : <>{[['heroAlt','Mô tả ảnh hero'],['introduction','Câu giới thiệu'],['brandLine','Câu thương hiệu'],['privateEvent','Nội dung sự kiện riêng'],['mapUrl','Link Google Maps'],['seoTitle','SEO title'],['seoDescription','SEO description']].map(([key,label]) => <label key={key}>{label}{key === 'introduction' || key === 'privateEvent' ? <textarea rows={4} value={page[key] ?? ''} onChange={e => setValue(setPage,key,e.target.value)}/> : <input value={page[key] ?? ''} onChange={e => setValue(setPage,key,e.target.value)}/>}</label>)}{imgField('heroImage','Ảnh hero chi nhánh',String(page.heroImage ?? ''),setPage)}{imgField('seoImage','Ảnh chia sẻ',String(page.seoImage ?? ''),setPage)}<label>Mô tả ảnh thay thế<input value={draft.heroAlt ?? page.heroAlt ?? ''} required onChange={e => setDraft((v: Entry) => ({ ...v, heroAlt: e.target.value }))}/></label></>}
      <button className="wc-primary" disabled={busy}><Save size={16}/>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
    </form>}
    {!['settings','branch'].includes(tab) && <section className="wc-list"><div className="wc-list-head"><div><h2>{TABS.find(([id]) => id === tab)?.[1]}</h2><p>{currentBranch?.name ?? 'Toàn chuỗi'}</p></div><button onClick={() => setDraft({})}><Plus size={16}/> Thêm mới</button></div>
      <form className="wc-editor" onSubmit={saveItem}>
        {tab === 'offers' && <>{field('title','Tiêu đề','text',true)}<label>Mô tả<textarea required rows={3} value={draft.description ?? ''} onChange={e => setDraft((v: Entry) => ({ ...v, description:e.target.value }))}/></label>{field('price','Giá (VND)','number',true)}{field('unit','Đơn vị (người/set)')}{field('schedule','Lịch áp dụng')}{field('menuUrl','Link thực đơn')}{uploadField()}</>}
        {tab === 'gallery' && <>{uploadField()}</>}
        {tab === 'accolades' && <>{field('year','Năm','number',true)}{field('content','Nội dung','text',true)}</>}
        {tab === 'testimonials' && <>{field('quote','Trích dẫn','text',true)}{field('reviewer','Người đánh giá','text',true)}{field('source','Nguồn đánh giá (Google, Facebook...)','text',true)}{field('title','Ngữ cảnh / ngày đánh giá')}</>}
        {tab === 'hours' && <>{field('weekday','Thứ trong tuần (1–7)','number',true)}{field('opensAt','Giờ mở cửa','time',!draft.closed)}{field('closesAt','Giờ đóng cửa','time',!draft.closed)}<label className="wc-check"><input type="checkbox" checked={!!draft.closed} onChange={e => setDraft((v: Entry) => ({ ...v, closed:e.target.checked }))}/> Nghỉ cả ngày</label></>}
        {tab === 'menus' && <>{field('title','Tên thực đơn','text',true)}{field('fileUrl','Đường dẫn PDF','url',true)}{imgField('imageUrl','Ảnh bìa thực đơn',String(draft.imageUrl ?? ''),setDraft)}</>}
        {['gallery','offers','accolades','testimonials','menus'].includes(tab) ? <label className="wc-check"><input type="checkbox" checked={draft.visible ?? true} onChange={e => setDraft((v: Entry) => ({ ...v, visible:e.target.checked }))}/> Hiển thị công khai</label> : null}
        <button className="wc-primary" disabled={busy || uploading}><Save size={16}/>{draft.id ? 'Lưu mục' : 'Thêm mục'}</button>
      </form>
      <div className="wc-items">{visibleItems.map((item,index) => { const label = valueOf(item,'title') || valueOf(item,'alt') || valueOf(item,'content') || valueOf(item,'quote') || valueOf(item,'weekday') || 'Thực đơn'; const shown = item.visible !== false; return <article key={item.id} style={shown ? undefined : { opacity: 0.45 }} draggable onDragStart={e => e.dataTransfer.setData('text/plain',String(index))} onDragOver={e => e.preventDefault()} onDrop={async e => { e.preventDefault(); const from=Number(e.dataTransfer.getData('text/plain')); const next=[...visibleItems]; const [picked]=next.splice(from,1); next.splice(index,0,picked); await reorderWebsiteItems(resourceNames[tab],next.map(row=>Number(row.id))); await load() }}>
          {item.image_url && <img src={item.image_url} alt={String(valueOf(item,'imageAlt','image_alt') || valueOf(item,'alt'))}/>}<div className="wc-item-copy"><strong>{String(label)}</strong><span>{tab === 'offers' ? `${new Intl.NumberFormat('vi-VN').format(Number(valueOf(item,'price')))} ₫/${valueOf(item,'unit') || 'người'}` : valueOf(item,'schedule','file_url')}</span></div><button title="Lên" aria-label="Lên" onClick={() => void move(index,-1)}><ArrowUp size={15}/></button><button title="Xuống" aria-label="Xuống" onClick={() => void move(index,1)}><ArrowDown size={15}/></button>{['gallery','offers','accolades','testimonials','menus'].includes(tab) && <button title={shown?'Ẩn':'Hiện'} aria-label={shown?'Ẩn':'Hiện'} onClick={() => void toggle(item,'visible',!shown)}>{shown?<Eye size={15}/>:<EyeOff size={15}/>}</button>}<button title="Xóa" aria-label="Xóa" onClick={() => void remove(item)}><Trash2 size={15}/></button>
        </article>})}</div>
    </section>}
  </div>
}
