import { Check, ChevronDown, ChevronUp, Plus, Save, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  getAllSiteConfig, updateFounder, updateGallery,
  updateHero, updateManifesto, updateMilestones, updateSections, uploadSiteImage,
  type HeroConfig, type SiteFounder, type SiteGalleryItem,
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

function Txt({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return <textarea className="cms-textarea" value={value} rows={rows} onChange={e => onChange(e.target.value)} />
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
          <Txt value={cfg.description} onChange={v => set('description', v)} rows={2} />
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
            {cfg.description && <p className="cms-prev-desc">{cfg.description}</p>}
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
            <Field label="Nội dung"><Txt value={s.body} onChange={v => upd(i, { body: v })} rows={4} /></Field>
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
              {s.body && <p className="cms-prev-story-body">{s.body}</p>}
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
            <Inp value={it.caption ?? ''} onChange={v => upd(i, { caption: v || undefined })} placeholder="Caption (tuỳ chọn)" />
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
              {it.caption && <span className="cms-prev-gal-cap">{it.caption}</span>}
            </div>
          ))}
          {!items.some(it => it.image_url) && <span className="cms-prev-empty">Chưa có ảnh</span>}
        </div>
      </Preview>
    </div>
  )
}

// ── TAB: Manifesto ────────────────────────────────────────────────────────

function ManifestoTab({ initial }: { initial?: { quote: string; author: string; authorTitle: string } }) {
  const [cfg, setCfg] = useState(initial ?? { quote: '', author: '', authorTitle: '' })
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  async function save() {
    setSaving(true)
    try { await updateManifesto(cfg); toast('Đã lưu Manifesto') }
    catch { toast('Lưu thất bại', true) }
    finally { setSaving(false) }
  }

  return (
    <div className="cms-split">
      <section className="cms-section">
        <div className="cms-section-head"><h2>Manifesto — Trích dẫn</h2><SaveBtn saving={saving} onSave={save} /></div>
        <Field label="Trích dẫn"><Txt value={cfg.quote} onChange={v => setCfg(c=>({...c,quote:v}))} rows={4} /></Field>
        <Field label="Tên tác giả"><Inp value={cfg.author} onChange={v => setCfg(c=>({...c,author:v}))} /></Field>
        <Field label="Chức danh"><Inp value={cfg.authorTitle} onChange={v => setCfg(c=>({...c,authorTitle:v}))} /></Field>
      </section>

      <Preview>
        <div className="cms-prev-manifesto">
          {cfg.quote
            ? <blockquote className="cms-prev-quote">"{cfg.quote}"</blockquote>
            : <span className="cms-prev-empty">Chưa có trích dẫn</span>}
          {(cfg.author || cfg.authorTitle) && (
            <div className="cms-prev-author">
              {cfg.author && <strong>{cfg.author}</strong>}
              {cfg.authorTitle && <span> · {cfg.authorTitle}</span>}
            </div>
          )}
        </div>
      </Preview>
    </div>
  )
}

// ── TAB: Founder ──────────────────────────────────────────────────────────

function FounderTab({ initial }: { initial?: SiteFounder }) {
  const [cfg, setCfg] = useState<SiteFounder>(
    initial ?? { portrait_url: '', portrait_public_id: '', name: '', title: '', quote: '', bio: '' }
  )
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function set<K extends keyof SiteFounder>(k: K, v: SiteFounder[K]) { setCfg(c => ({...c, [k]: v})) }

  async function save() {
    setSaving(true)
    try { await updateFounder(cfg); toast('Đã lưu Người sáng lập') }
    catch { toast('Lưu thất bại', true) }
    finally { setSaving(false) }
  }

  return (
    <div className="cms-split">
      <section className="cms-section">
        <div className="cms-section-head"><h2>Người sáng lập</h2><SaveBtn saving={saving} onSave={save} /></div>
        <Field label="Ảnh chân dung"><ImgUpload value={cfg.portrait_url} onChange={v => set('portrait_url', v)} /></Field>
        <Field label="Tên"><Inp value={cfg.name} onChange={v => set('name', v)} /></Field>
        <Field label="Chức danh"><Inp value={cfg.title} onChange={v => set('title', v)} /></Field>
        <Field label="Trích dẫn nổi bật"><Txt value={cfg.quote} onChange={v => set('quote', v)} rows={2} /></Field>
        <Field label="Tiểu sử"><Txt value={cfg.bio} onChange={v => set('bio', v)} rows={5} /></Field>
      </section>

      <Preview>
        <div className="cms-prev-founder">
          {cfg.portrait_url
            ? <img className="cms-prev-founder-img" src={cfg.portrait_url} alt={cfg.name} />
            : <div className="cms-prev-founder-placeholder" />}
          <div className="cms-prev-founder-info">
            {cfg.name && <div className="cms-prev-founder-name">{cfg.name}</div>}
            {cfg.title && <div className="cms-prev-founder-title">{cfg.title}</div>}
            {cfg.quote && <blockquote className="cms-prev-founder-quote">"{cfg.quote}"</blockquote>}
            {cfg.bio && <p className="cms-prev-founder-bio">{cfg.bio}</p>}
          </div>
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
            <Field label="Mô tả"><Txt value={m.description} onChange={v => upd(i,{description:v})} rows={2} /></Field>
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
                {m.description && <p className="cms-prev-ms-desc">{m.description}</p>}
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

type TabId = 'hero' | 'story' | 'gallery' | 'milestones' | 'manifesto' | 'founder'

const TABS: { id: TabId; label: string }[] = [
  { id: 'hero',       label: 'Hero' },
  { id: 'story',      label: 'Story' },
  { id: 'gallery',    label: 'Gallery' },
  { id: 'milestones', label: 'Hành trình' },
  { id: 'manifesto',  label: 'Manifesto' },
  { id: 'founder',    label: 'Người sáng lập' },
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
        {tab === 'manifesto'  && <ManifestoTab  initial={cfg('manifesto')} />}
        {tab === 'founder'    && <FounderTab    initial={cfg('founder')} />}
      </div>
    </div>
  )
}
