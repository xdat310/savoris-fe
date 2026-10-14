import { Check, ChevronDown, ChevronUp, Image as ImgIcon, Plus, Save, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  getAllSiteConfig, updateFooter, updateFounder, updateGallery,
  updateHero, updateManifesto, updateMilestones, updateNav, updateSections,
  uploadSiteImage,
  type HeroConfig, type SiteFooter, type SiteFounder, type SiteGalleryItem,
  type SiteMilestone, type SiteNavItem, type SiteSection,
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

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="cms-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
}

function Textarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return <textarea className="cms-textarea" value={value} rows={rows} onChange={e => onChange(e.target.value)} />
}

function SaveBtn({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <button className={`cms-save-btn${saving ? ' cms-save-btn--saving' : ''}`} onClick={onSave} disabled={saving}>
      {saving ? <><Save size={14} /> Đang lưu…</> : <><Check size={14} /> Lưu thay đổi</>}
    </button>
  )
}

function ImageUploader({ value, onChange, label = 'Ảnh' }: { value: string; onChange: (url: string) => void; label?: string }) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadSiteImage(file)
      onChange(res.url)
    } catch {
      alert('Upload thất bại. Thử lại.')
    } finally {
      setUploading(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <div className="cms-img-uploader">
      {value && <img className="cms-img-preview" src={value} alt="" />}
      <div className="cms-img-controls">
        <Input value={value} onChange={onChange} placeholder="https://... hoặc upload file" />
        <button className="cms-upload-btn" onClick={() => ref.current?.click()} disabled={uploading}>
          <Upload size={14} /> {uploading ? 'Đang tải…' : label}
        </button>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>
    </div>
  )
}

// ── TAB: Hero ─────────────────────────────────────────────────────────────

const HERO_DEFAULTS: HeroConfig = {
  type: 'image', media: [], overlay_opacity: 0.45,
  badge_enabled: false, badge_line1: '', badge_line2: '',
  description: '', cta_text: 'ĐẶT BÀN', cta_link: '#dat-ban',
}

function HeroTab({ initial }: { initial?: HeroConfig }) {
  const [cfg, setCfg] = useState<HeroConfig>(initial ?? HERO_DEFAULTS)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function set<K extends keyof HeroConfig>(k: K, v: HeroConfig[K]) {
    setCfg(c => ({ ...c, [k]: v }))
  }

  async function save() {
    setSaving(true)
    try { await updateHero(cfg); toast('Đã lưu Hero') }
    catch { toast('Lưu thất bại', true) }
    finally { setSaving(false) }
  }

  return (
    <section className="cms-section">
      <div className="cms-section-head">
        <h2>Ảnh bìa Hero</h2>
        <SaveBtn saving={saving} onSave={save} />
      </div>

      <Field label="Kiểu">
        <div className="cms-radio-group">
          {(['image', 'slideshow', 'video'] as const).map(t => (
            <label key={t} className="cms-radio">
              <input type="radio" checked={cfg.type === t} onChange={() => set('type', t)} />
              {t}
            </label>
          ))}
        </div>
      </Field>

      <Field label={`Ảnh${cfg.type === 'slideshow' ? ' (nhiều)' : ''}`}>
        <div className="cms-media-list">
          {cfg.media.map((m, i) => (
            <div key={i} className="cms-media-row">
              <ImageUploader value={m.url} onChange={url => {
                const next = [...cfg.media]; next[i] = { ...next[i], url }; set('media', next)
              }} label="Upload" />
              <Input value={m.alt ?? ''} onChange={alt => {
                const next = [...cfg.media]; next[i] = { ...next[i], alt }; set('media', next)
              }} placeholder="Alt text (tuỳ chọn)" />
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

      <Field label="Độ mờ overlay (0–1)">
        <input type="range" min={0} max={1} step={0.05} value={cfg.overlay_opacity}
          onChange={e => set('overlay_opacity', parseFloat(e.target.value))} className="cms-range" />
        <span className="cms-range-val">{cfg.overlay_opacity}</span>
      </Field>

      <Field label="Badge">
        <label className="cms-checkbox">
          <input type="checkbox" checked={cfg.badge_enabled} onChange={e => set('badge_enabled', e.target.checked)} />
          Hiển thị badge
        </label>
      </Field>
      {cfg.badge_enabled && (
        <div className="cms-two-col">
          <Field label="Dòng 1">
            <Input value={cfg.badge_line1} onChange={v => set('badge_line1', v)} placeholder="ĐƯỢC YÊU THÍCH" />
          </Field>
          <Field label="Dòng 2">
            <Input value={cfg.badge_line2} onChange={v => set('badge_line2', v)} placeholder="2026" />
          </Field>
        </div>
      )}

      <Field label="Mô tả">
        <Textarea value={cfg.description} onChange={v => set('description', v)} />
      </Field>
      <div className="cms-two-col">
        <Field label="Nút CTA (text)">
          <Input value={cfg.cta_text} onChange={v => set('cta_text', v)} placeholder="ĐẶT BÀN" />
        </Field>
        <Field label="Nút CTA (link)">
          <Input value={cfg.cta_link} onChange={v => set('cta_link', v)} placeholder="#dat-ban" />
        </Field>
      </div>
    </section>
  )
}

// ── TAB: Story sections ───────────────────────────────────────────────────

const BLANK_SECTION: SiteSection = {
  id: 0, order: 0, visible: true, image_side: 'right',
  image_url: '', public_id: '', title: '', body: '',
}

function StoryTab({ initial }: { initial?: SiteSection[] }) {
  const [sections, setSections] = useState<SiteSection[]>(
    initial ?? []
  )
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function update(i: number, patch: Partial<SiteSection>) {
    setSections(ss => ss.map((s, j) => j === i ? { ...s, ...patch } : s))
  }

  function move(i: number, dir: -1 | 1) {
    setSections(ss => {
      const n = [...ss]; [n[i], n[i + dir]] = [n[i + dir], n[i]]; return n
    })
  }

  async function save() {
    const ordered = sections.map((s, i) => ({ ...s, order: i + 1 }))
    setSaving(true)
    try { await updateSections(ordered); toast('Đã lưu Story') }
    catch { toast('Lưu thất bại', true) }
    finally { setSaving(false) }
  }

  return (
    <section className="cms-section">
      <div className="cms-section-head">
        <h2>Phần Story</h2>
        <SaveBtn saving={saving} onSave={save} />
      </div>

      {sections.map((s, i) => (
        <div key={i} className="cms-card">
          <div className="cms-card-head">
            <span className="cms-card-num">#{i + 1}</span>
            <div className="cms-card-actions">
              <button className="cms-icon-btn" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp size={14} /></button>
              <button className="cms-icon-btn" onClick={() => move(i, 1)} disabled={i === sections.length - 1}><ChevronDown size={14} /></button>
              <label className="cms-checkbox">
                <input type="checkbox" checked={s.visible} onChange={e => update(i, { visible: e.target.checked })} />
                Hiển thị
              </label>
              <button className="cms-icon-btn cms-icon-btn--del" onClick={() => setSections(ss => ss.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
            </div>
          </div>

          <Field label="Ảnh">
            <ImageUploader value={s.image_url} onChange={url => update(i, { image_url: url })} />
          </Field>
          <Field label="Vị trí ảnh">
            <div className="cms-radio-group">
              {(['left', 'right'] as const).map(side => (
                <label key={side} className="cms-radio">
                  <input type="radio" checked={s.image_side === side} onChange={() => update(i, { image_side: side })} />
                  {side === 'left' ? 'Ảnh trái' : 'Ảnh phải'}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Tiêu đề (xuống dòng = \\n)">
            <Input value={s.title} onChange={v => update(i, { title: v })} />
          </Field>
          <Field label="Nội dung">
            <Textarea value={s.body} onChange={v => update(i, { body: v })} rows={4} />
          </Field>
          <div className="cms-two-col">
            <Field label="Link text (tuỳ chọn)">
              <Input value={s.link_text ?? ''} onChange={v => update(i, { link_text: v || undefined })} />
            </Field>
            <Field label="Link URL">
              <Input value={s.link_url ?? ''} onChange={v => update(i, { link_url: v || undefined })} />
            </Field>
          </div>
        </div>
      ))}

      <button className="cms-add-btn cms-add-btn--lg" onClick={() =>
        setSections(ss => [...ss, { ...BLANK_SECTION, id: Date.now(), order: ss.length + 1 }])
      }>
        <Plus size={14} /> Thêm section
      </button>
    </section>
  )
}

// ── TAB: Gallery ──────────────────────────────────────────────────────────

function GalleryTab({ initial }: { initial?: SiteGalleryItem[] }) {
  const [items, setItems] = useState<SiteGalleryItem[]>(initial ?? [])
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function update(i: number, patch: Partial<SiteGalleryItem>) {
    setItems(its => its.map((it, j) => j === i ? { ...it, ...patch } : it))
  }

  function move(i: number, dir: -1 | 1) {
    setItems(its => { const n = [...its]; [n[i], n[i + dir]] = [n[i + dir], n[i]]; return n })
  }

  async function save() {
    const ordered = items.map((it, i) => ({ ...it, order: i + 1 }))
    setSaving(true)
    try { await updateGallery(ordered); toast('Đã lưu Gallery') }
    catch { toast('Lưu thất bại', true) }
    finally { setSaving(false) }
  }

  return (
    <section className="cms-section">
      <div className="cms-section-head">
        <h2>Thư viện ảnh Gallery</h2>
        <SaveBtn saving={saving} onSave={save} />
      </div>

      <div className="cms-gallery-grid">
        {items.map((it, i) => (
          <div key={i} className="cms-gallery-card">
            <div className="cms-gallery-img">
              {it.image_url
                ? <img src={it.image_url} alt={it.caption ?? ''} />
                : <div className="cms-gallery-empty"><ImgIcon size={32} /></div>
              }
              <div className="cms-gallery-order">
                <button onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp size={12} /></button>
                <span>{i + 1}</span>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1}><ChevronDown size={12} /></button>
              </div>
            </div>
            <div className="cms-gallery-meta">
              <ImageUploader value={it.image_url} onChange={url => update(i, { image_url: url })} label="Đổi ảnh" />
              <Input value={it.caption ?? ''} onChange={v => update(i, { caption: v || undefined })} placeholder="Caption hiển thị trên ảnh" />
              <button className="cms-icon-btn cms-icon-btn--del" onClick={() => setItems(its => its.filter((_, j) => j !== i))}>
                <Trash2 size={13} /> Xoá
              </button>
            </div>
          </div>
        ))}
        <button className="cms-gallery-add" onClick={() =>
          setItems(its => [...its, { id: Date.now(), order: its.length + 1, image_url: '', public_id: '' }])
        }>
          <Plus size={20} />
          <span>Thêm ảnh</span>
        </button>
      </div>
    </section>
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
    <section className="cms-section">
      <div className="cms-section-head">
        <h2>Manifesto — Trích dẫn sáng lập</h2>
        <SaveBtn saving={saving} onSave={save} />
      </div>
      <Field label="Trích dẫn (xuống dòng bằng \\n)">
        <Textarea value={cfg.quote} onChange={v => setCfg(c => ({ ...c, quote: v }))} rows={4} />
      </Field>
      <div className="cms-two-col">
        <Field label="Tên tác giả">
          <Input value={cfg.author} onChange={v => setCfg(c => ({ ...c, author: v }))} />
        </Field>
        <Field label="Chức danh">
          <Input value={cfg.authorTitle} onChange={v => setCfg(c => ({ ...c, authorTitle: v }))} />
        </Field>
      </div>
    </section>
  )
}

// ── TAB: Founder ──────────────────────────────────────────────────────────

function FounderTab({ initial }: { initial?: SiteFounder }) {
  const [cfg, setCfg] = useState<SiteFounder>(
    initial ?? { portrait_url: '', portrait_public_id: '', name: '', title: '', quote: '', bio: '' }
  )
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function set<K extends keyof SiteFounder>(k: K, v: SiteFounder[K]) {
    setCfg(c => ({ ...c, [k]: v }))
  }

  async function save() {
    setSaving(true)
    try { await updateFounder(cfg); toast('Đã lưu Người sáng lập') }
    catch { toast('Lưu thất bại', true) }
    finally { setSaving(false) }
  }

  return (
    <section className="cms-section">
      <div className="cms-section-head">
        <h2>Người sáng lập</h2>
        <SaveBtn saving={saving} onSave={save} />
      </div>
      <Field label="Ảnh chân dung">
        <ImageUploader value={cfg.portrait_url} onChange={v => set('portrait_url', v)} />
      </Field>
      <div className="cms-two-col">
        <Field label="Tên"><Input value={cfg.name} onChange={v => set('name', v)} /></Field>
        <Field label="Chức danh"><Input value={cfg.title} onChange={v => set('title', v)} /></Field>
      </div>
      <Field label="Trích dẫn nổi bật">
        <Textarea value={cfg.quote} onChange={v => set('quote', v)} rows={2} />
      </Field>
      <Field label="Tiểu sử">
        <Textarea value={cfg.bio} onChange={v => set('bio', v)} rows={5} />
      </Field>
      <Field label="Chữ ký (ảnh, tuỳ chọn)">
        <ImageUploader value={cfg.signature_url ?? ''} onChange={v => set('signature_url', v || undefined)} />
      </Field>
    </section>
  )
}

// ── TAB: Milestones ───────────────────────────────────────────────────────

const BLANK_MILESTONE: SiteMilestone = { id: 0, year: '', title: '', description: '', order: 0 }

function MilestonesTab({ initial }: { initial?: SiteMilestone[] }) {
  const [items, setItems] = useState<SiteMilestone[]>(initial ?? [])
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function update(i: number, patch: Partial<SiteMilestone>) {
    setItems(ms => ms.map((m, j) => j === i ? { ...m, ...patch } : m))
  }

  function move(i: number, dir: -1 | 1) {
    setItems(ms => { const n = [...ms]; [n[i], n[i + dir]] = [n[i + dir], n[i]]; return n })
  }

  async function save() {
    const ordered = items.map((m, i) => ({ ...m, order: i + 1 }))
    setSaving(true)
    try { await updateMilestones(ordered); toast('Đã lưu Hành trình') }
    catch { toast('Lưu thất bại', true) }
    finally { setSaving(false) }
  }

  return (
    <section className="cms-section">
      <div className="cms-section-head">
        <h2>Hành trình — Mốc thời gian</h2>
        <SaveBtn saving={saving} onSave={save} />
      </div>

      {items.map((m, i) => (
        <div key={i} className="cms-card">
          <div className="cms-card-head">
            <span className="cms-card-num">#{i + 1} · {m.year || '????'}</span>
            <div className="cms-card-actions">
              <button className="cms-icon-btn" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp size={14} /></button>
              <button className="cms-icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ChevronDown size={14} /></button>
              <button className="cms-icon-btn cms-icon-btn--del" onClick={() => setItems(ms => ms.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
            </div>
          </div>
          <div className="cms-two-col">
            <Field label="Năm"><Input value={m.year} onChange={v => update(i, { year: v })} placeholder="2024" /></Field>
            <Field label="Tiêu đề"><Input value={m.title} onChange={v => update(i, { title: v })} placeholder="Mở rộng toàn quốc" /></Field>
          </div>
          <Field label="Mô tả">
            <Textarea value={m.description} onChange={v => update(i, { description: v })} rows={2} />
          </Field>
        </div>
      ))}

      <button className="cms-add-btn cms-add-btn--lg" onClick={() =>
        setItems(ms => [...ms, { ...BLANK_MILESTONE, id: Date.now(), order: ms.length + 1 }])
      }>
        <Plus size={14} /> Thêm mốc
      </button>
    </section>
  )
}

// ── TAB: Footer & Nav ─────────────────────────────────────────────────────

function FooterTab({ initialFooter, initialNav }: { initialFooter?: SiteFooter; initialNav?: SiteNavItem[] }) {
  const [footer, setFooter] = useState<SiteFooter>(
    initialFooter ?? { facebook_url: '', instagram_url: '', tiktok_url: '', copyright: '' }
  )
  const [nav, setNav] = useState<SiteNavItem[]>(initialNav ?? [])
  const [savingF, setSavingF] = useState(false)
  const [savingN, setSavingN] = useState(false)
  const toast = useToast()

  async function saveFooter() {
    setSavingF(true)
    try { await updateFooter(footer); toast('Đã lưu Footer') }
    catch { toast('Lưu thất bại', true) }
    finally { setSavingF(false) }
  }

  async function saveNav() {
    const ordered = nav.map((n, i) => ({ ...n, order: i + 1 }))
    setSavingN(true)
    try { await updateNav(ordered); toast('Đã lưu Nav') }
    catch { toast('Lưu thất bại', true) }
    finally { setSavingN(false) }
  }

  function updateNavItem(i: number, patch: Partial<SiteNavItem>) {
    setNav(ns => ns.map((n, j) => j === i ? { ...n, ...patch } : n))
  }

  return (
    <>
      <section className="cms-section">
        <div className="cms-section-head">
          <h2>Footer — Mạng xã hội</h2>
          <SaveBtn saving={savingF} onSave={saveFooter} />
        </div>
        <Field label="Facebook URL"><Input value={footer.facebook_url ?? ''} onChange={v => setFooter(f => ({ ...f, facebook_url: v }))} /></Field>
        <Field label="Instagram URL"><Input value={footer.instagram_url ?? ''} onChange={v => setFooter(f => ({ ...f, instagram_url: v }))} /></Field>
        <Field label="TikTok URL"><Input value={footer.tiktok_url ?? ''} onChange={v => setFooter(f => ({ ...f, tiktok_url: v }))} /></Field>
        <Field label="Copyright text"><Input value={footer.copyright ?? ''} onChange={v => setFooter(f => ({ ...f, copyright: v }))} /></Field>
      </section>

      <section className="cms-section">
        <div className="cms-section-head">
          <h2>Thanh Nav</h2>
          <SaveBtn saving={savingN} onSave={saveNav} />
        </div>
        {nav.map((n, i) => (
          <div key={i} className="cms-card cms-card--inline">
            <Input value={n.label} onChange={v => updateNavItem(i, { label: v })} placeholder="Label" />
            <Input value={n.link} onChange={v => updateNavItem(i, { link: v })} placeholder="/link" />
            <label className="cms-checkbox">
              <input type="checkbox" checked={n.visible} onChange={e => updateNavItem(i, { visible: e.target.checked })} />
              Hiện
            </label>
            <button className="cms-icon-btn cms-icon-btn--del" onClick={() => setNav(ns => ns.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
          </div>
        ))}
        <button className="cms-add-btn" onClick={() =>
          setNav(ns => [...ns, { id: Date.now(), label: '', link: '', order: ns.length + 1, visible: true }])
        }>
          <Plus size={14} /> Thêm mục nav
        </button>
      </section>
    </>
  )
}

// ── Root component ────────────────────────────────────────────────────────

type TabId = 'hero' | 'story' | 'gallery' | 'milestones' | 'manifesto' | 'founder' | 'footer'

const TABS: { id: TabId; label: string }[] = [
  { id: 'hero',       label: 'Hero' },
  { id: 'story',      label: 'Story' },
  { id: 'gallery',    label: 'Gallery' },
  { id: 'milestones', label: 'Hành trình' },
  { id: 'manifesto',  label: 'Manifesto' },
  { id: 'founder',    label: 'Người sáng lập' },
  { id: 'footer',     label: 'Footer & Nav' },
]

export function WebsiteCMS() {
  const [tab, setTab] = useState<TabId>('hero')
  const [configs, setConfigs] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllSiteConfig()
      .then(setConfigs)
      .catch(() => setConfigs({}))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="page">
        <div className="page-head"><h1>Website CMS</h1></div>
        <p className="cms-loading">Đang tải cấu hình…</p>
      </div>
    )
  }

  function cfg<T>(key: string): T | undefined {
    return configs?.[key] as T | undefined
  }

  return (
    <div className="page cms-page">
      <div className="page-head">
        <h1>Website CMS — Trang chủ</h1>
        <p className="cms-subtitle">Mọi thay đổi lưu ngay lên cơ sở dữ liệu và phản ánh trên trang web công khai.</p>
      </div>

      <div className="cms-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`cms-tab${tab === t.id ? ' cms-tab--on' : ''}`}
            onClick={() => setTab(t.id)}
          >
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
        {tab === 'footer'     && <FooterTab     initialFooter={cfg('footer')} initialNav={cfg('nav')} />}
      </div>
    </div>
  )
}
