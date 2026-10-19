import { Bold, Check, ChevronDown, ChevronUp, Code, Eye, Heading2, Italic, Link2, List, ListOrdered, Pencil, Plus, Quote, Save, Strikethrough, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Md } from '../lib/md'
import {
  getAllSiteConfig, updateGallery,
  updateHero, updateMilestones, updateSections, uploadSiteImage,
  type HeroConfig, type SiteGalleryItem,
  type SiteMilestone, type SiteSection,
} from '../api/site'
import { useToast } from '../components/Toast'

// ── Shared helpers ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="cms-field">
      <span className="cms-field-label">{label}</span>
      {children}
    </label>
  )
}

function Inp({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="cms-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
}

const MD_TOOLS = [
  { label: 'In đậm', Icon: Bold, before: '**', after: '**' },
  { label: 'In nghiêng', Icon: Italic, before: '*', after: '*' },
  { label: 'Gạch ngang', Icon: Strikethrough, before: '~~', after: '~~' },
  { label: 'Mã nội tuyến', Icon: Code, before: '`', after: '`' },
  { label: 'Tiêu đề', Icon: Heading2, before: '## ', line: true },
  { label: 'Danh sách', Icon: List, before: '- ', line: true },
  { label: 'Danh sách đánh số', Icon: ListOrdered, before: '1. ', line: true },
  { label: 'Trích dẫn', Icon: Quote, before: '> ', line: true },
  { label: 'Liên kết', Icon: Link2, before: '[', after: '](https://)' },
] as const

function MarkdownInput({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)

  function format(tool: typeof MD_TOOLS[number]) {
    const input = ref.current
    if (!input) return
    const start = input.selectionStart
    const end = input.selectionEnd

    if ('line' in tool) {
      const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
      const nextBreak = value.indexOf('\n', end)
      const lineEnd = nextBreak < 0 ? value.length : nextBreak
      const block = value.slice(lineStart, lineEnd)
      const formatted = block.split('\n').map(line => `${tool.before}${line}`).join('\n')
      onChange(value.slice(0, lineStart) + formatted + value.slice(lineEnd))
      requestAnimationFrame(() => {
        input.focus()
        input.setSelectionRange(lineStart, lineStart + formatted.length)
      })
      return
    }

    const selected = value.slice(start, end) || 'văn bản'
    onChange(value.slice(0, start) + tool.before + selected + tool.after + value.slice(end))
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(start + tool.before.length, start + tool.before.length + selected.length)
    })
  }

  return (
    <div className="cms-md-input">
      <div className="cms-md-toolbar">
        <div className="cms-md-tools" role="toolbar" aria-label="Định dạng Markdown">
          {MD_TOOLS.map(tool => {
            const Icon = tool.Icon
            return (
              <button key={tool.label} type="button" className="cms-icon-btn" title={tool.label} aria-label={tool.label}
                onMouseDown={event => event.preventDefault()} onClick={() => format(tool)}>
                <Icon size={14} aria-hidden="true" />
              </button>
            )
          })}
        </div>
        <div className="cms-md-mode" role="group" aria-label="Chế độ nội dung">
          <button type="button" className={!preview ? 'is-active' : ''} aria-pressed={!preview} onClick={() => setPreview(false)}><Pencil size={13} /> Soạn</button>
          <button type="button" className={preview ? 'is-active' : ''} aria-pressed={preview} onClick={() => setPreview(true)}><Eye size={13} /> Xem trước</button>
        </div>
      </div>
      {preview
        ? <div className="cms-md-preview md-render">{value ? <Md>{value}</Md> : <span className="cms-prev-empty">Chưa có nội dung</span>}</div>
        : <textarea ref={ref} className="cms-textarea" value={value} rows={rows} onChange={e => onChange(e.target.value)} />}
    </div>
  )
}

function SaveBtn({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <button className={`cms-save-btn${saving ? ' cms-save-btn--saving' : ''}`} onClick={onSave} disabled={saving}>
      {saving ? <><Save size={14} /> Đang lưu…</> : <><Check size={14} /> Lưu</>}
    </button>
  )
}

function ImgUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try { onChange((await uploadSiteImage(file)).url) }
    catch { alert('Upload thất bại. Thử lại.') }
    finally { setBusy(false); if (ref.current) ref.current.value = '' }
  }

  return (
    <div className="cms-imgup">
      {value && <img className="cms-imgup-thumb" src={value} alt="" />}
      <button className="cms-upload-btn" onClick={() => ref.current?.click()} disabled={busy}>
        <Upload size={14} /> {busy ? 'Đang tải…' : 'Tải ảnh lên'}
      </button>
      <input ref={ref} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={pick} />
    </div>
  )
}

// ── Preview wrapper ───────────────────────────────────────────────────────

function Preview({ children }: { children: React.ReactNode }) {
  return (
    <div className="cms-preview-wrap">
      <div className="cms-preview-label">Xem trước</div>
      <div className="cms-preview-box">{children}</div>
    </div>
  )
}

// ── TAB: Hero ─────────────────────────────────────────────────────────────

const HERO_DEF: HeroConfig = {
  type: 'image', media: [], overlay_opacity: 0.45,
  badge_enabled: false, badge_line1: '', badge_line2: '',
  description: '', cta_text: 'ĐẶT BÀN', cta_link: '#dat-ban',
}

function HeroTab({ initial }: { initial?: HeroConfig }) {
  const [cfg, setCfg] = useState<HeroConfig>(initial ?? HERO_DEF)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function set<K extends keyof HeroConfig>(k: K, v: HeroConfig[K]) { setCfg(c => ({ ...c, [k]: v })) }

  async function save() {
    setSaving(true)
    try { await updateHero(cfg); toast('Đã lưu Hero') }
    catch { toast('Lưu thất bại', true) }
    finally { setSaving(false) }
  }

  const firstImg = cfg.media[0]?.url

  return (
    <div className="cms-split">
      <section className="cms-section">
        <div className="cms-section-head"><h2>Ảnh bìa Hero</h2><SaveBtn saving={saving} onSave={save} /></div>

        <Field label="Ảnh / Video bìa">
          <div className="cms-media-list">
            {cfg.media.map((m, i) => (
              <div key={i} className="cms-media-row">
                <ImgUpload value={m.url} onChange={url => {
                  const next = [...cfg.media]; next[i] = { ...next[i], url }; set('media', next)
                }} />
                <button className="cms-icon-btn cms-icon-btn--del" onClick={() => set('media', cfg.media.filter((_, j) => j !== i))}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button className="cms-add-btn" onClick={() => set('media', [...cfg.media, { url: '', public_id: '' }])}>
              <Plus size={14} /> Thêm ảnh
            </button>
          </div>
        </Field>

        <Field label="Mô tả ngắn">
          <MarkdownInput value={cfg.description} onChange={v => set('description', v)} rows={2} />
        </Field>
        <Field label="Nút đặt bàn (text)">
          <Inp value={cfg.cta_text} onChange={v => set('cta_text', v)} placeholder="ĐẶT BÀN" />
        </Field>
      </section>

      <Preview>
        <div className="cms-prev-hero" style={{ backgroundImage: firstImg ? `url(${firstImg})` : undefined }}>
          <div className="cms-prev-hero-overlay" />
          <div className="cms-prev-hero-text">
            <div className="cms-prev-eyebrow">SAVORIS</div>
            {cfg.description && <Md className="cms-prev-desc">{cfg.description}</Md>}
            {cfg.cta_text && <div className="cms-prev-cta">{cfg.cta_text}</div>}
          </div>
        </div>
      </Preview>
    </div>
  )
}

// ── TAB: Story sections ───────────────────────────────────────────────────

const BLANK_SEC: SiteSection = { id: 0, order: 0, visible: true, image_side: 'right', image_url: '', public_id: '', title: '', body: '' }

function StoryTab({ initial }: { initial?: SiteSection[] }) {
  const [sections, setSections] = useState<SiteSection[]>(initial ?? [])
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function upd(i: number, p: Partial<SiteSection>) { setSections(ss => ss.map((s, j) => j === i ? { ...s, ...p } : s)) }
  function move(i: number, d: -1 | 1) { setSections(ss => { const n = [...ss]; [n[i], n[i+d]] = [n[i+d], n[i]]; return n }) }

  async function save() {
    setSaving(true)
    try { await updateSections(sections.map((s, i) => ({ ...s, order: i+1 }))); toast('Đã lưu Story') }
    catch { toast('Lưu thất bại', true) }
    finally { setSaving(false) }
  }

  return (
    <div className="cms-split">
      <section className="cms-section">
        <div className="cms-section-head"><h2>Phần Story</h2><SaveBtn saving={saving} onSave={save} /></div>

        {sections.map((s, i) => (
          <div key={i} className="cms-card">
            <div className="cms-card-head">
              <span className="cms-card-num">#{i+1}</span>
              <div className="cms-card-actions">
                <button className="cms-icon-btn" onClick={() => move(i, -1)} disabled={i===0}><ChevronUp size={14}/></button>
                <button className="cms-icon-btn" onClick={() => move(i, 1)} disabled={i===sections.length-1}><ChevronDown size={14}/></button>
                <button className="cms-icon-btn cms-icon-btn--del" onClick={() => setSections(ss => ss.filter((_,j)=>j!==i))}><Trash2 size={14}/></button>
              </div>
            </div>
            <Field label="Ảnh"><ImgUpload value={s.image_url} onChange={url => upd(i, { image_url: url })} /></Field>
            <Field label="Tiêu đề"><Inp value={s.title} onChange={v => upd(i, { title: v })} /></Field>
            <Field label="Nội dung"><MarkdownInput value={s.body} onChange={v => upd(i, { body: v })} rows={4} /></Field>
            <div className="cms-two-col">
              <Field label="Chữ trên nút"><Inp value={s.link_text ?? ''} onChange={v => upd(i, { link_text: v || undefined })} placeholder="Tìm hiểu thêm" /></Field>
              <Field label="Đường dẫn khi bấm"><Inp value={s.link_url ?? ''} onChange={v => upd(i, { link_url: v || undefined })} placeholder="#lien-he hoặc https://..." /></Field>
            </div>
          </div>
        ))}

        <button className="cms-add-btn cms-add-btn--lg" onClick={() =>
          setSections(ss => [...ss, { ...BLANK_SEC, id: Date.now(), order: ss.length+1 }])
        }><Plus size={14}/> Thêm section</button>
      </section>

      <Preview>
        {sections.filter(s => s.image_url || s.title).map((s, i) => (
          <div key={i} className="cms-prev-story">
            {s.image_url && <img className="cms-prev-story-img" src={s.image_url} alt="" />}
            <div className="cms-prev-story-text">
              {s.title && <div className="cms-prev-story-title">{s.title}</div>}
              {s.body && <Md className="cms-prev-story-body">{s.body}</Md>}
              {s.link_text && s.link_url && <span className="cms-prev-story-link">{s.link_text} <span aria-hidden="true">→</span></span>}
            </div>
          </div>
        ))}
        {sections.length === 0 && <span className="cms-prev-empty">Chưa có section nào</span>}
      </Preview>
    </div>
  )
}

// ── TAB: Gallery ──────────────────────────────────────────────────────────

function GalleryTab({ initial }: { initial?: SiteGalleryItem[] }) {
  const [items, setItems] = useState<SiteGalleryItem[]>(initial ?? [])
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function upd(i: number, p: Partial<SiteGalleryItem>) { setItems(its => its.map((it,j) => j===i ? {...it,...p} : it)) }
  function move(i: number, d: -1|1) { setItems(its => { const n=[...its]; [n[i],n[i+d]]=[n[i+d],n[i]]; return n }) }

  async function save() {
    setSaving(true)
    try { await updateGallery(items.map((it,i) => ({...it, order: i+1}))); toast('Đã lưu Gallery') }
    catch { toast('Lưu thất bại', true) }
    finally { setSaving(false) }
  }

  return (
    <div className="cms-split">
      <section className="cms-section">
        <div className="cms-section-head"><h2>Thư viện ảnh</h2><SaveBtn saving={saving} onSave={save} /></div>

        {items.map((it, i) => (
          <div key={i} className="cms-card cms-card--inline">
            <span className="cms-card-num">{i+1}</span>
            <ImgUpload value={it.image_url} onChange={url => upd(i, { image_url: url })} />
            <div className="cms-card-actions">
              <button className="cms-icon-btn" onClick={() => move(i, -1)} disabled={i===0}><ChevronUp size={13}/></button>
              <button className="cms-icon-btn" onClick={() => move(i, 1)} disabled={i===items.length-1}><ChevronDown size={13}/></button>
              <button className="cms-icon-btn cms-icon-btn--del" onClick={() => setItems(its => its.filter((_,j)=>j!==i))}><Trash2 size={13}/></button>
            </div>
          </div>
        ))}

        <button className="cms-add-btn cms-add-btn--lg" onClick={() =>
          setItems(its => [...its, { id: Date.now(), order: its.length+1, image_url: '', public_id: '' }])
        }><Plus size={14}/> Thêm ảnh</button>
      </section>

      <Preview>
        <div className="cms-prev-gallery">
          {items.filter(it => it.image_url).map((it, i) => (
            <div key={i} className="cms-prev-gal-item">
              <img src={it.image_url} alt={it.caption ?? ''} />
            </div>
          ))}
          {!items.some(it => it.image_url) && <span className="cms-prev-empty">Chưa có ảnh</span>}
        </div>
      </Preview>
    </div>
  )
}

// ── TAB: Milestones ───────────────────────────────────────────────────────

const BLANK_MS: SiteMilestone = { id: 0, year: '', title: '', description: '', order: 0 }

function MilestonesTab({ initial }: { initial?: SiteMilestone[] }) {
  const [items, setItems] = useState<SiteMilestone[]>(initial ?? [])
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function upd(i: number, p: Partial<SiteMilestone>) { setItems(ms => ms.map((m,j) => j===i ? {...m,...p} : m)) }
  function move(i: number, d: -1|1) { setItems(ms => { const n=[...ms]; [n[i],n[i+d]]=[n[i+d],n[i]]; return n }) }

  async function save() {
    setSaving(true)
    try { await updateMilestones(items.map((m,i)=>({...m,order:i+1}))); toast('Đã lưu Hành trình') }
    catch { toast('Lưu thất bại', true) }
    finally { setSaving(false) }
  }

  return (
    <div className="cms-split">
      <section className="cms-section">
        <div className="cms-section-head"><h2>Hành trình — Mốc thời gian</h2><SaveBtn saving={saving} onSave={save} /></div>

        {items.map((m, i) => (
          <div key={i} className="cms-card">
            <div className="cms-card-head">
              <span className="cms-card-num">{m.year || `#${i+1}`}</span>
              <div className="cms-card-actions">
                <button className="cms-icon-btn" onClick={() => move(i,-1)} disabled={i===0}><ChevronUp size={14}/></button>
                <button className="cms-icon-btn" onClick={() => move(i,1)} disabled={i===items.length-1}><ChevronDown size={14}/></button>
                <button className="cms-icon-btn cms-icon-btn--del" onClick={() => setItems(ms=>ms.filter((_,j)=>j!==i))}><Trash2 size={14}/></button>
              </div>
            </div>
            <div className="cms-two-col">
              <Field label="Năm"><Inp value={m.year} onChange={v => upd(i,{year:v})} placeholder="2024" /></Field>
              <Field label="Tiêu đề"><Inp value={m.title} onChange={v => upd(i,{title:v})} /></Field>
            </div>
            <Field label="Mô tả"><MarkdownInput value={m.description} onChange={v => upd(i,{description:v})} rows={2} /></Field>
          </div>
        ))}

        <button className="cms-add-btn cms-add-btn--lg" onClick={() =>
          setItems(ms => [...ms, {...BLANK_MS, id: Date.now(), order: ms.length+1}])
        }><Plus size={14}/> Thêm mốc</button>
      </section>

      <Preview>
        <div className="cms-prev-timeline">
          {items.map((m, i) => (
            <div key={i} className="cms-prev-ms">
              <div className="cms-prev-ms-year">{m.year || '—'}</div>
              <div className="cms-prev-ms-line" />
              <div className="cms-prev-ms-content">
                {m.title && <div className="cms-prev-ms-title">{m.title}</div>}
                {m.description && <Md className="cms-prev-ms-desc">{m.description}</Md>}
              </div>
            </div>
          ))}
          {items.length === 0 && <span className="cms-prev-empty">Chưa có mốc nào</span>}
        </div>
      </Preview>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────

type TabId = 'hero' | 'story' | 'gallery' | 'milestones'

const TABS: { id: TabId; label: string }[] = [
  { id: 'hero',       label: 'Hero' },
  { id: 'story',      label: 'Story' },
  { id: 'gallery',    label: 'Gallery' },
  { id: 'milestones', label: 'Hành trình' },
]

export function WebsiteCMS() {
  const [tab, setTab] = useState<TabId>('hero')
  const [configs, setConfigs] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllSiteConfig().then(setConfigs).catch(() => setConfigs({})).finally(() => setLoading(false))
  }, [])

  function cfg<T>(key: string): T | undefined { return configs?.[key] as T | undefined }

  if (loading) return (
    <div className="page"><div className="page-head"><h1>Website CMS</h1></div><p className="cms-loading">Đang tải…</p></div>
  )

  return (
    <div className="page cms-page">
      <div className="page-head">
        <h1>Website CMS</h1>
        <p className="cms-subtitle">Thay đổi phản ánh ngay trên trang web công khai.</p>
      </div>

      <div className="cms-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`cms-tab${tab===t.id?' cms-tab--on':''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="cms-tab-body">
        {tab === 'hero'       && <HeroTab       initial={cfg('hero')} />}
        {tab === 'story'      && <StoryTab      initial={cfg('sections')} />}
        {tab === 'gallery'    && <GalleryTab    initial={cfg('gallery')} />}
        {tab === 'milestones' && <MilestonesTab initial={cfg('milestones')} />}
      </div>
    </div>
  )
}
