import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, ImagePlus, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { ApiError } from '../api/client'
import { createWebsiteItem, deleteWebsiteItem, getWebsiteCms, reorderWebsiteItems, saveBranchPage, saveWebsiteHoursWeek, saveWebsiteSettings, updateWebsiteItem, uploadWebsiteMedia } from '../api/site'
import { useToast } from '../components/Toast'
import './website-cms-page.css'

type Entry = Record<string, any>
const TABS = [
  ['settings', 'Thông tin trang'], ['sections', 'Khối nội dung'], ['gallery', 'Thư viện ảnh'], ['hours', 'Giờ mở cửa'],
] as const
const resourceNames: Record<string, string> = { gallery: 'gallery', hours: 'hours' }
const valueOf = (row: Entry, camel: string, snake?: string) => row[camel] ?? (snake ? row[snake] : undefined) ?? ''

export function WebsiteCMSPage({ branchOnly = false }: { branchOnly?: boolean }) {
  const toast = useToast()
  const [cms, setCms] = useState<Entry | null>(null)
  const [tab, setTab] = useState<string>('settings')
  const [branchId, setBranchId] = useState<number>(0)
  const [scope, setScope] = useState<'chain' | 'branch'>('chain')
  const [settings, setSettings] = useState<Entry>({})
  const [page, setPage] = useState<Entry>({})
  const [storyItems, setStoryItems] = useState<Entry[]>([])
  const [weekHours, setWeekHours] = useState<Entry[]>([])
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
    if (branchOnly || scope === 'branch') setScope('branch')
    setBranchId(chosen)
    const pageItem = (data.branchPages ?? []).find((item: Entry) => Number(item.branchId) === chosen)
    setPage(pageItem?.payload ?? {})
    const activeContent = branchOnly || scope === 'branch' ? (pageItem?.payload ?? {}) : (data.settings ?? {})
    setStoryItems(Array.isArray(activeContent.storySections) ? activeContent.storySections : [])
    const existingHours = (Array.isArray(data.hours) ? data.hours : []).filter((item: Entry) => Number(valueOf(item, 'branchId', 'branch_id')) === chosen)
    setWeekHours(Array.from({ length: 7 }, (_, index) => {
      const weekday = index + 1
      const row = existingHours.find((item: Entry) => Number(item.weekday) === weekday)
      return row ? { ...row, weekday, opensAt: valueOf(row, 'opensAt', 'opens_at'), closesAt: valueOf(row, 'closesAt', 'closes_at') } : { weekday, opensAt: '', closesAt: '', closed: false }
    }))
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
  const visibleItems = useMemo(() => items.filter(item => (!branchOnly && scope === 'chain') ? !valueOf(item, 'branchId', 'branch_id') : (!valueOf(item, 'branchId', 'branch_id') || Number(valueOf(item, 'branchId', 'branch_id')) === branchId)), [items, branchId, branchOnly, scope])

  function setValue(setter: Dispatch<SetStateAction<Entry>>, key: string, value: unknown) {
    setter((old: Entry) => ({ ...old, [key]: value })); setDirty(true)
  }
  async function saveMain(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (!branchOnly && scope === 'chain') await saveWebsiteSettings(settings)
      else await saveBranchPage(branchId, page)
      setDirty(false); toast('Đã lưu thay đổi'); await load()
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Lưu không thành công') }
    finally { setBusy(false) }
  }
  async function saveStories(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    const payload = { ...(!branchOnly && scope === 'chain' ? settings : page), storySections: storyItems.map((item, index) => ({ ...item, sortOrder: index + 1 })) }
    try {
      if (!branchOnly && scope === 'chain') { await saveWebsiteSettings(payload); setSettings(payload) }
      else { await saveBranchPage(branchId, payload); setPage(payload) }
      setDirty(false); toast('Đã lưu khối nội dung'); await load()
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Không lưu được khối nội dung') }
    finally { setBusy(false) }
  }
  async function saveHours(event: FormEvent) {
    event.preventDefault()
    if (!branchId || (!branchOnly && scope === 'chain')) { setError('Chọn một chi nhánh để chỉnh giờ mở cửa'); return }
    setBusy(true); setError('')
    try { await saveWebsiteHoursWeek(branchId, weekHours.map(day => ({ weekday: day.weekday, opensAt: day.opensAt || null, closesAt: day.closesAt || null, closed: Boolean(day.closed) }))); setDirty(false); toast('Đã lưu giờ mở cửa'); await load() }
    catch (e) { setError(e instanceof ApiError && e.status === 403 ? 'Bạn không có quyền chỉnh nội dung chi nhánh này.' : e instanceof ApiError ? e.message : 'Không lưu được giờ mở cửa') }
    finally { setBusy(false) }
  }
  async function uploadStoryImage(index: number, file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Dùng ảnh JPG, PNG hoặc WebP nhỏ hơn 5 MB'); return }
    setUploading(true); setError('')
    try { const result = await uploadWebsiteMedia(file, String(storyItems[index]?.imageAlt ?? 'Ảnh nội dung Savoris')); setStoryItems(old => old.map((item, i) => i === index ? { ...item, imageUrl: result.url } : item)); setDirty(true) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Tải ảnh thất bại') }
    finally { setUploading(false) }
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
      if (branchOnly || scope === 'branch') { setPage((old: Entry) => ({ ...old, heroImage: result.url, heroAlt: alt })); setDirty(true) }
      else setDraft((old: Entry) => ({ ...old, imageUrl: result.url, imageAlt: alt, alt }))
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Tải ảnh thất bại') }
    finally { setUploading(false) }
  }
  async function uploadGalleryFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true); setError('')
    try {
      for (const file of Array.from(files)) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) throw new Error(`${file.name}: ảnh phải là JPG, PNG, WebP và nhỏ hơn 5 MB`)
        const alt = file.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ')
        const result = await uploadWebsiteMedia(file, alt)
        await createWebsiteItem('gallery', { branchId: !branchOnly && scope === 'chain' ? undefined : branchId, imageUrl: result.url, alt, caption: '', visible: true })
      }
      await load(); toast(`Đã thêm ${files.length} ảnh vào thư viện`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Tải ảnh thất bại') }
    finally { setUploading(false) }
  }
  async function saveItem(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const payload = { ...draft, branchId: !branchOnly && scope === 'chain' ? undefined : branchId, visible: draft.visible ?? true }
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
  function uploadField() {
    return <div className="wc-upload"><label>Mô tả ảnh (alt)<input required value={draft.imageAlt ?? draft.alt ?? ''} onChange={e => setDraft((old: Entry) => ({ ...old, imageAlt: e.target.value, alt: e.target.value }))}/></label><label>Chú thích<input value={draft.caption ?? ''} onChange={e => setDraft((old: Entry) => ({ ...old, caption:e.target.value }))}/></label><label className="wc-file"><ImagePlus size={16}/>{uploading ? 'Đang tải lên…' : 'Chọn ảnh'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void upload(e.target.files?.[0])}/></label>{draft.imageUrl && <img src={draft.imageUrl} alt={draft.imageAlt ?? ''}/>}</div>
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
  function changeScope(value: string) {
    if (dirty && !window.confirm('Rời trang khi chưa lưu thay đổi?')) return
    const isChain = value === 'chain'
    const id = Number(value)
    const selectedPage = (cms?.branchPages ?? []).find((item: Entry) => Number(item.branchId) === id)?.payload ?? {}
    const nextContent = isChain ? (cms?.settings ?? {}) : selectedPage
    setScope(isChain ? 'chain' : 'branch')
    if (!isChain) setBranchId(id)
    setPage(selectedPage)
    setStoryItems(Array.isArray(nextContent.storySections) ? nextContent.storySections : [])
    const rows = (Array.isArray(cms?.hours) ? cms.hours : []).filter((item: Entry) => Number(valueOf(item,'branchId','branch_id')) === id)
    setWeekHours(Array.from({length:7},(_,index)=>{const weekday=index+1;const row=rows.find((item:Entry)=>Number(item.weekday)===weekday);return row?{...row,weekday,opensAt:valueOf(row,'opensAt','opens_at'),closesAt:valueOf(row,'closesAt','closes_at')}:{weekday,opensAt:'',closesAt:'',closed:false}}))
    setDirty(false)
  }
  if (!cms) return <div className="wc-page"><p>{error || 'Đang tải CMS…'}</p></div>
  const currentBranch = cms.branches?.find((b: Entry) => Number(b.id) === branchId)
  return <div className="wc-page"><div className="wc-heading"><div><span>SAVORIS · NỘI DUNG SỐ</span><h1>Website</h1></div>{!branchOnly && <label>Phạm vi<select aria-label="Phạm vi website" value={scope === 'chain' ? 'chain' : String(branchId)} onChange={e => changeScope(e.target.value)}><option value="chain">Trang chủ chuỗi</option>{cms.branches?.map((branch: Entry) => <option key={branch.id} value={branch.id}>{branch.code ? `${branch.code} · ` : ''}{branch.name}</option>)}</select></label>}{currentBranch && <a href={scope === 'chain' && !branchOnly ? '/' : `/chi-nhanh/${currentBranch.slug}`} target="_blank" rel="noreferrer">Xem trên website <ExternalLink size={15}/></a>}</div>
    <nav className="wc-tabs" aria-label="Mục website">{TABS.map(([id, label]) => <button className={tab === id ? 'is-active' : ''} key={id} onClick={() => { if (dirty && !window.confirm('Rời trang khi chưa lưu thay đổi?')) return; setDirty(false); setTab(id); setDraft({}) }}>{label}</button>)}</nav>
    {error && <div className="wc-error" role="alert">{error}</div>}
    {tab === 'settings' && <form className="wc-form" onSubmit={saveMain}>
      {!branchOnly && scope === 'chain' ? <>{[['brandLine','Câu thương hiệu'],['heroEyebrow','Nhãn nhỏ hero'],['heroTitle','Tiêu đề hero'],['heroDescription','Mô tả hero'],['ctaEyebrow','Nhãn khối đặt bàn'],['ctaTitle','Tiêu đề khối đặt bàn'],['ctaDescription','Mô tả khối đặt bàn'],['reservationUrl','Link đặt bàn'],['takeawayUrl','Link mang về'],['facebookUrl','Facebook'],['instagramUrl','Instagram'],['tiktokUrl','TikTok'],['seoTitle','SEO title'],['seoDescription','SEO description']].map(([key,label]) => <label key={key}>{label}{['heroDescription','ctaDescription','seoDescription'].includes(key) ? <textarea rows={3} value={settings[key] ?? ''} onChange={e => setValue(setSettings,key,e.target.value)}/> : <input value={settings[key] ?? ''} onChange={e => setValue(setSettings,key,e.target.value)}/>}</label>)}{imgField('heroImage','Ảnh hero chuỗi',String(settings.heroImage ?? ''),setSettings)}{imgField('logo','Logo',String(settings.logo ?? ''),setSettings)}<label>Mô tả ảnh hero<input value={settings.heroAlt ?? ''} onChange={e=>setValue(setSettings,'heroAlt',e.target.value)}/></label></> : <>{[['heroEyebrow','Nhãn nhỏ hero'],['heroTitle','Tiêu đề hero'],['introduction','Câu giới thiệu'],['brandLine','Câu thương hiệu'],['privateEventTitle','Tiêu đề sự kiện riêng'],['privateEvent','Nội dung sự kiện riêng'],['mapUrl','Link Google Maps'],['seoTitle','SEO title'],['seoDescription','SEO description']].map(([key,label]) => <label key={key}>{label}{['introduction','privateEvent','seoDescription'].includes(key) ? <textarea rows={4} value={page[key] ?? ''} onChange={e => setValue(setPage,key,e.target.value)}/> : <input value={page[key] ?? ''} onChange={e => setValue(setPage,key,e.target.value)}/>}</label>)}{imgField('heroImage','Ảnh hero chi nhánh',String(page.heroImage ?? ''),setPage)}{imgField('privateEventImage','Ảnh nền sự kiện riêng',String(page.privateEventImage ?? ''),setPage)}{imgField('seoImage','Ảnh chia sẻ',String(page.seoImage ?? ''),setPage)}<label>Mô tả ảnh thay thế<input value={page.heroAlt ?? ''} required onChange={e => setValue(setPage,'heroAlt',e.target.value)}/></label></>}
      <button className="wc-primary" disabled={busy}><Save size={16}/>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
    </form>}
    {tab === 'sections' && <section className="wc-list"><div className="wc-list-head"><div><h2>Khối nội dung</h2><p>{scope === 'chain' && !branchOnly ? 'Trang chủ chuỗi' : currentBranch?.name}</p></div><button type="button" disabled={!branchOnly&&scope==='chain'&&storyItems.length>=4} onClick={() => { setStoryItems(old => [...old, { kicker: '', title: '', body: '', imageUrl: '', imageAlt: '', imageStyle: 'FEATHERED', visible: true, sortOrder: old.length + 1 }]); setDirty(true) }}><Plus size={16}/> Thêm khối</button></div>
      <form className="wc-story-editor" onSubmit={saveStories}>{storyItems.map((item,index) => <article className="wc-story-card" key={index}><header><strong>{String(index + 1).padStart(2,'0')}</strong><div><button type="button" aria-label="Chuyển khối lên" disabled={index===0} onClick={() => setStoryItems(old => { const rows=[...old]; [rows[index-1],rows[index]]=[rows[index],rows[index-1]]; return rows })}><ArrowUp size={15}/></button><button type="button" aria-label="Chuyển khối xuống" disabled={index===storyItems.length-1} onClick={() => setStoryItems(old => { const rows=[...old]; [rows[index+1],rows[index]]=[rows[index],rows[index+1]]; return rows })}><ArrowDown size={15}/></button><button type="button" aria-label="Xóa khối" onClick={() => { setStoryItems(old => old.filter((_,i)=>i!==index)); setDirty(true) }}><Trash2 size={15}/></button></div></header><div className="wc-story-grid">{item.imageUrl && <img src={String(item.imageUrl)} alt={String(item.imageAlt ?? '')}/>}<label>Nhãn nhỏ<input value={item.kicker ?? ''} onChange={e => { setStoryItems(old=>old.map((row,i)=>i===index?{...row,kicker:e.target.value}:row)); setDirty(true) }}/></label><label>Tiêu đề<input value={item.title ?? ''} onChange={e => { setStoryItems(old=>old.map((row,i)=>i===index?{...row,title:e.target.value}:row)); setDirty(true) }}/></label><label>Mô tả<textarea rows={4} value={item.body ?? ''} onChange={e => { setStoryItems(old=>old.map((row,i)=>i===index?{...row,body:e.target.value}:row)); setDirty(true) }}/><small>{String(item.body ?? '').length} / 800</small></label><label>Alt ảnh<input value={item.imageAlt ?? ''} onChange={e => { setStoryItems(old=>old.map((row,i)=>i===index?{...row,imageAlt:e.target.value}:row)); setDirty(true) }}/></label><label>Kiểu ảnh<select value={item.imageStyle ?? 'FEATHERED'} onChange={e => { setStoryItems(old=>old.map((row,i)=>i===index?{...row,imageStyle:e.target.value}:row)); setDirty(true) }}><option value="FEATHERED">Mờ vào nền tối</option><option value="ON_BLACK">Ảnh nền đen</option></select><small>Ảnh món ăn nên chụp trên nền đen và chọn kiểu “Nền đen”.</small></label><label className="wc-file"><ImagePlus size={16}/>Thay ảnh<input aria-label={`Thay ảnh khối ${index+1}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void uploadStoryImage(index,e.target.files?.[0]); e.target.value='' }}/></label><label className="wc-check"><input type="checkbox" checked={item.visible !== false} onChange={e => { setStoryItems(old=>old.map((row,i)=>i===index?{...row,visible:e.target.checked}:row)); setDirty(true) }}/> Hiển thị trên website</label><label>Liên kết<input value={item.linkText ?? ''} placeholder="Nhãn liên kết" onChange={e => { setStoryItems(old=>old.map((row,i)=>i===index?{...row,linkText:e.target.value}:row)); setDirty(true) }}/><input value={item.linkUrl ?? ''} placeholder="URL" onChange={e => { setStoryItems(old=>old.map((row,i)=>i===index?{...row,linkUrl:e.target.value}:row)); setDirty(true) }}/></label></div></article>)}<button className="wc-primary" disabled={busy||uploading}><Save size={16}/>Lưu khối nội dung</button></form>
    </section>}
    {tab === 'hours' && <form className="wc-week-form" onSubmit={saveHours}><header><div><h2>Giờ mở cửa</h2><p>{scope === 'chain' && !branchOnly ? 'Chọn một chi nhánh ở phía trên để chỉnh giờ.' : currentBranch?.name}</p></div><button type="button" onClick={() => { const first=weekHours[0]; if(first) setWeekHours(old=>old.map(day=>({...day,opensAt:first.opensAt,closesAt:first.closesAt,closed:first.closed}))); setDirty(true) }}>Áp dụng cả tuần</button></header>{weekHours.map((day,index)=><div className="wc-week-row" key={day.weekday}><strong>{['','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'][day.weekday]}</strong><label> Mở cửa<input aria-label="Giờ mở cửa" type="time" required={!day.closed} disabled={day.closed} value={day.opensAt ?? ''} onChange={e=>{setWeekHours(old=>old.map((row,i)=>i===index?{...row,opensAt:e.target.value}:row));setDirty(true)}}/></label><label>Đóng cửa<input aria-label="Giờ đóng cửa" type="time" required={!day.closed} disabled={day.closed} value={day.closesAt ?? ''} onChange={e=>{setWeekHours(old=>old.map((row,i)=>i===index?{...row,closesAt:e.target.value}:row));setDirty(true)}}/></label><label className="wc-check"><input aria-label="Nghỉ cả ngày" type="checkbox" checked={Boolean(day.closed)} onChange={e=>{setWeekHours(old=>old.map((row,i)=>i===index?{...row,closed:e.target.checked}:row));setDirty(true)}}/> Nghỉ cả ngày</label></div>)}<button className="wc-primary" disabled={busy||(!branchOnly&&scope==='chain')}><Save size={16}/>Lưu giờ mở cửa</button></form>}
    {tab === 'gallery' && <section className="wc-list"><div className="wc-list-head"><div><h2>Thư viện ảnh</h2><p>{currentBranch?.name ?? 'Toàn chuỗi'}</p></div><label className="wc-file"><Plus size={16}/>{uploading?'Đang tải…':'Tải nhiều ảnh'}<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e=>{void uploadGalleryFiles(e.target.files);e.target.value=''}}/></label></div>
      <form className="wc-editor" onSubmit={saveItem}>
        {tab === 'gallery' && <>{uploadField()}</>}
        {tab === 'gallery' ? <label className="wc-check"><input type="checkbox" checked={draft.visible ?? true} onChange={e => setDraft((v: Entry) => ({ ...v, visible:e.target.checked }))}/> Hiển thị công khai</label> : null}
        <button className="wc-primary" disabled={busy || uploading}><Save size={16}/>{draft.id ? 'Lưu mục' : 'Thêm mục'}</button>
      </form>
      <div className="wc-items">{visibleItems.map((item,index) => { const label = valueOf(item,'caption','alt') || valueOf(item,'title') || 'Ảnh'; const shown = item.visible !== false; return <article key={item.id} style={shown ? undefined : { opacity: 0.45 }} draggable onDragStart={e => e.dataTransfer.setData('text/plain',String(index))} onDragOver={e => e.preventDefault()} onDrop={async e => { e.preventDefault(); const from=Number(e.dataTransfer.getData('text/plain')); const next=[...visibleItems]; const [picked]=next.splice(from,1); next.splice(index,0,picked); await reorderWebsiteItems(resourceNames[tab],next.map(row=>Number(row.id))); await load() }}>
          {(item.imageUrl||item.image_url) && <img src={String(item.imageUrl||item.image_url)} alt={String(valueOf(item,'imageAlt','image_alt') || valueOf(item,'alt'))}/>}<div className="wc-item-copy"><strong>{String(label)}</strong><span>{valueOf(item,'caption')}</span></div><button title="Sửa ảnh" aria-label="Sửa ảnh" onClick={() => setDraft({ ...item, imageUrl: valueOf(item,'imageUrl','image_url'), imageAlt:valueOf(item,'imageAlt','image_alt') || valueOf(item,'alt') })}><Pencil size={15}/></button><button title="Lên" aria-label="Lên" onClick={() => void move(index,-1)}><ArrowUp size={15}/></button><button title="Xuống" aria-label="Xuống" onClick={() => void move(index,1)}><ArrowDown size={15}/></button><button title={shown?'Ẩn':'Hiện'} aria-label={shown?'Ẩn':'Hiện'} onClick={() => void toggle(item,'visible',!shown)}>{shown?<Eye size={15}/>:<EyeOff size={15}/>}</button><button title="Xóa" aria-label="Xóa" onClick={() => void remove(item)}><Trash2 size={15}/></button>
        </article>})}</div>
    </section>}
  </div>
}
