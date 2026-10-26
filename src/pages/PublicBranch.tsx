import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUpRight, MapPin, Phone } from 'lucide-react'
import { get } from '../api/client'
import type { BranchMenuItemResponse, GuestTableResponse } from '../api/types'
import { branchLabel, getBranches, getPublicBranchPage, getPublicSite, type PublicBranch, type SiteBranchPage } from '../api/site'
import { groupDishes } from '../components/DishBoard'
import { SiteHeader } from '../components/site/SiteHeader'
import { StorySections, type StorySectionItem } from '../components/site/StorySections'
import './public-branch.css'
import { applySeo } from '../lib/seo'

function imageUrl(url?: unknown) {
  return typeof url === 'string' ? url : ''
}
type OpeningHour = SiteBranchPage['openingHours'][number]
type OpeningHourRange = OpeningHour & { startDay: number; endDay: number }

function groupOpeningHours(hours: OpeningHour[]): OpeningHourRange[] {
  const sorted = [...hours].sort((a, b) => a.weekday - b.weekday)
  return sorted.reduce<OpeningHourRange[]>((ranges, hour) => {
    const previous = ranges[ranges.length - 1]
    const sameSchedule = previous && previous.closed === hour.closed && previous.opens_at === hour.opens_at && previous.closes_at === hour.closes_at
    if (sameSchedule && hour.weekday === previous.endDay + 1) previous.endDay = hour.weekday
    else ranges.push({ ...hour, startDay: hour.weekday, endDay: hour.weekday })
    return ranges
  }, [])
}

function shortDay(day: number) {
  return day === 7 ? 'CN' : `T${day + 1}`
}

function shortTime(time?: string) {
  const value = String(time ?? '').slice(0, 5)
  return value.endsWith(':00') ? value.slice(0, 2) : value
}

function branchMapEmbedUrl(configuredUrl: unknown, branch: PublicBranch) {
  const latitude = branch.latitude ?? branch.lat
  const longitude = branch.longitude ?? branch.lng
  if (latitude != null && longitude != null) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}&z=16&output=embed`
  }
  const configured = typeof configuredUrl === 'string' ? configuredUrl.trim() : ''
  if (configured && configured.includes('/maps/embed')) return configured
  const query = [branch.address, branch.city].filter(Boolean).join(', ')
  return configured || `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`
}

export function PublicBranch() {
  const { slug = '' } = useParams()
  const [data, setData] = useState<SiteBranchPage | null>(null)
  const [error, setError] = useState(false)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [showAllGallery, setShowAllGallery] = useState(false)
  const [branchList, setBranchList] = useState<PublicBranch[]>([])
  const [brandLogo, setBrandLogo] = useState('')
  const [menuPreview, setMenuPreview] = useState<GuestTableResponse | null>(null)
  useEffect(() => { window.scrollTo({ top: 0, left: 0 }) }, [slug])
  useEffect(() => { getPublicBranchPage(slug).then(setData).catch(() => setError(true)) }, [slug])
  useEffect(() => { Promise.all([getPublicSite(), getBranches().catch(() => [])]).then(async ([site, statuses]) => {
    const settings = site.settings && typeof site.settings === 'object' ? site.settings as Record<string,unknown> : {}
    setBrandLogo(String(settings.logo ?? ''))
    const rows = Array.isArray(site.branches) ? site.branches as unknown as PublicBranch[] : []
    const statusRows = Array.isArray(statuses) ? statuses : []
    const merged = rows.map(row => ({ ...row, ...statusRows.find(status => Number(status.id) === Number(row.id)) }))
    const withImages = await Promise.all(merged.map(async row => { if (!row.slug) return row; const result = await getPublicBranchPage(row.slug).catch(() => null); return { ...row, imageUrl: result?.page?.heroImage } }))
    setBranchList(withImages)
  }).catch(() => {}) }, [])
  useEffect(() => { if (!data?.branch.id) return; get<Partial<GuestTableResponse>>(`/public/branches/${data.branch.id}/menu`).then(menu => setMenuPreview({ ...menu, categories: Array.isArray(menu.categories)?menu.categories:[], menu: Array.isArray(menu.menu)?menu.menu:[] } as GuestTableResponse)).catch(() => setMenuPreview(null)) }, [data?.branch.id])
  useEffect(() => {
    if (!data) return
    const { branch, page } = data
    applySeo({ title: page.seoTitle || `Savoris · ${branch.name}`, description: page.seoDescription || page.introduction,
      image: page.seoImage || page.heroImage, url: window.location.href,
      jsonLd: { '@context': 'https://schema.org', '@type': 'Restaurant', name: `Savoris · ${branch.name}`,
        image: page.seoImage || page.heroImage, telephone: branch.phone,
        address: { '@type': 'PostalAddress', streetAddress: branch.address, addressLocality: branch.city, addressCountry: 'VN' },
        url: window.location.href } })
  }, [data])
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-reveal]')
    if ((typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || typeof window.IntersectionObserver === 'undefined') { nodes.forEach(n => n.classList.add('is-visible')); return }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) } }), { threshold: .12 })
    nodes.forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [data])

  if (error) return <main className="branch-error"><h1>Không tìm thấy chi nhánh</h1><Link to="/">Về trang chủ</Link></main>
  if (!data) return <main className="branch-loading" aria-busy="true">Đang tải trải nghiệm Savoris…</main>
  const { branch, page } = data
  const hero = imageUrl(page.heroImage)
  const booking = `/dat-ban?chi-nhanh=${branch.slug}`
  const today = new Date().getDay() || 7
  const liveBranch = branchList.find(item => Number(item.id) === Number(branch.id))
  const liveStatus = liveBranch?.openNow === false ? 'Đã đóng cửa' : liveBranch?.acceptingTakeaway === false ? 'Tạm dừng mang về' : Number(liveBranch?.estimatedWaitMinutes ?? 0) >= 20 ? 'Đang đông' : liveBranch?.openNow === true ? 'Đang mở' : 'Đang cập nhật'
  const allGallery = (Array.isArray(data.gallery) ? data.gallery : []).filter(item => typeof item.image_url === 'string' && item.image_url) as Record<string, unknown>[]
  const openingHours = Array.isArray(data.openingHours) ? data.openingHours : []
  const compactHours = groupOpeningHours(openingHours)
  const gallery = showAllGallery ? allGallery : allGallery.slice(0, 5)
  const storySections = Array.isArray((page as Record<string, unknown>).storySections) ? (page as Record<string, unknown>).storySections as StorySectionItem[] : []
  const branchDishes = groupDishes(menuPreview?.categories, menuPreview?.menu).flatMap(group => group.dishes)
  const featuredDishes: (BranchMenuItemResponse & { imageAlt?: string })[] = Array.isArray(page.featuredDishes)
    ? page.featuredDishes.filter((item: Record<string, unknown>) => item.visible !== false).slice(0, 6).flatMap((item: Record<string, unknown>) => {
      const dish = branchDishes.find(row => Number(row.menuItemId) === Number(item.menuItemId))
      if (!dish) return []
      const image = typeof item.imageUrl === 'string' && item.imageUrl ? item.imageUrl : dish.imageUrl
      return image ? [{ ...dish, imageUrl: image, imageAlt: String(item.imageAlt || dish.name || '') }] : []
    })
    : branchDishes.filter(dish => dish.imageUrl).slice(0, 6)
  return <main className="venue-page">
    <SiteHeader nav={[]} branches={branchList} currentBranchSlug={branch.slug} currentBranchName={branch.name} logoUrl={brandLogo||undefined}/>
    <section className="venue-hero" style={{ backgroundImage: hero ? `linear-gradient(90deg,rgba(10,10,9,.72),rgba(10,10,9,.12)),radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,.68) 100%),url("${hero}")` : 'radial-gradient(ellipse at center,#181715 0%,#000 76%)' }}>
      <div className="venue-hero-copy" data-reveal>{page.heroEyebrow&&<span>{String(page.heroEyebrow)}</span>}<h1>{String(page.heroTitle ?? branchLabel(branch))}</h1>{page.introduction && <p>{String(page.introduction)}</p>}<Link className="venue-button" to={booking}>Đặt bàn <ArrowUpRight size={16}/></Link></div>
      <a className="venue-scroll" href="#cau-chuyen">Khám phá <ArrowDown size={14}/></a>
    </section>
    <StorySections items={storySections} id="cau-chuyen"/>
    {featuredDishes.length>0&&<section className="venue-featured-menu" id="thuc-don"><header><span>{String(page.featuredEyebrow || `ĐƯỢC YÊU THÍCH TẠI ${branch.name.toLocaleUpperCase('vi')}`)}</span><h2>{String(page.featuredTitle || 'Hương vị đặc sắc')}</h2></header><div>{featuredDishes.map(dish=><article key={dish.menuItemId}>{dish.imageUrl&&<img src={dish.imageUrl} alt={dish.imageAlt ?? dish.name ?? ''} loading="lazy"/>}<h3>{dish.name}</h3></article>)}</div><nav><Link to={`/chi-nhanh/${branch.slug}/thuc-don`}>Xem thực đơn</Link><Link to={`/mang-ve/${branch.slug}`}>Đặt mang về</Link></nav></section>}
    {page.privateEvent&&<section className="venue-event" id="su-kien" style={{backgroundImage:`linear-gradient(90deg,#000c,#0008),url("${String(page.privateEventImage||hero)}")`}} data-reveal><div><span>SAVORIS · PRIVATE EVENTS</span><h2>{String(page.privateEventTitle ?? 'Sự kiện riêng,\ndấu ấn của bạn.').split('\n').map((line,index)=><span key={index}>{index>0&&<br/>}{line}</span>)}</h2></div><div><p>{String(page.privateEvent)}</p><a className="venue-button" href={`mailto:${branch.email ?? ''}?subject=${encodeURIComponent('Tổ chức sự kiện tại Savoris')}`}>Liên hệ tổ chức <ArrowUpRight size={16}/></a></div></section>}
    {gallery.length > 0 && <section className="venue-gallery" id="thu-vien"><div className="venue-section-heading" data-reveal><span>KHÔNG GIAN SAVORIS</span><h2>Khoảnh khắc tại bàn.</h2></div><div className="venue-gallery-grid">{gallery.map((item,index) => <button className={`venue-gallery-cell venue-gallery-cell--${index%5}`} key={String(item.id)} onClick={() => setActiveImage(imageUrl(item.image_url))} aria-label={`Mở ảnh ${String(item.alt)}`} data-reveal><img src={imageUrl(item.image_url)} alt={String(item.alt)} loading="lazy"/><span>{String(item.alt)}</span></button>)}</div>{!showAllGallery&&allGallery.length>5&&<button className="venue-gallery-more" onClick={()=>setShowAllGallery(true)}>Xem thêm ảnh</button>}</section>}
    <section className="venue-contact" id="lien-he"><div className="venue-contact-copy"><span>GHÉ THĂM CHÚNG TÔI</span><h2>{branchLabel(branch)}</h2><span className="venue-live-status"><i/>{liveStatus}</span>{branch.address&&<p><MapPin size={15}/>{branch.address}, {branch.city}</p>}{branch.phone&&<a href={`tel:${branch.phone}`}><Phone size={15}/>{branch.phone}</a>}{openingHours.some(h => !h.closed) && <div className="venue-hours"><strong>Giờ mở cửa</strong>{compactHours.map(hour => <p className={hour.startDay<=today && hour.endDay>=today?'is-today':''} key={hour.startDay}><span>{shortDay(hour.startDay)}{hour.endDay>hour.startDay?`–${shortDay(hour.endDay)}`:''}{hour.startDay<=today && hour.endDay>=today?' · Hôm nay':''}</span><span>{hour.closed ? 'Nghỉ' : `${shortTime(hour.opens_at)}–${shortTime(hour.closes_at)}h`}</span></p>)}</div>}</div>{branch.address&&<iframe title={`Bản đồ ${branch.name}`} src={branchMapEmbedUrl(page.mapUrl, branch)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/>}</section>
    <footer className="venue-footer"><Link to="/">SAVORIS</Link><span>Ẩm thực Việt đương đại, tinh tế trong từng khoảnh khắc.</span><Link to={booking}>Đặt bàn <ArrowUpRight size={14}/></Link></footer>
    {activeImage && <button className="venue-lightbox" onClick={() => setActiveImage(null)} aria-label="Đóng ảnh"><img src={activeImage} alt="Ảnh phóng lớn"/><span>Đóng ×</span></button>}
  </main>
}

export function BranchMenu() {
  const { slug = '' } = useParams()
  const [data, setData] = useState<SiteBranchPage | null>(null)
  const [menuData, setMenuData] = useState<GuestTableResponse | null>(null)
  useEffect(() => { getPublicBranchPage(slug).then(setData).catch(() => {}) }, [slug])
  useEffect(() => {
    if (!data?.branch.id) return
    get<Partial<GuestTableResponse>>(`/public/branches/${data.branch.id}/menu`).then(menu => setMenuData({ ...menu, categories: Array.isArray(menu.categories)?menu.categories:[], menu: Array.isArray(menu.menu)?menu.menu:[] } as GuestTableResponse)).catch(() => {})
  }, [data?.branch.id])
  const groups = useMemo(() => groupDishes(menuData?.categories, menuData?.menu), [menuData])
  return (
    <main className="venue-menu-page">
      <Link to={`/chi-nhanh/${slug}`} className="venue-brand">SAVORIS</Link>
      <span>THỰC ĐƠN · {data ? branchLabel(data.branch) : slug.toUpperCase()}</span>
      <h1>Hương vị<br/>đang chờ bạn.</h1>
      {groups.length > 0 ? (
        <div className="venue-menu-groups">
          {groups.map(group => (
            <section key={group.id} className="venue-menu-group">
              <h2>{group.name}</h2>
              <div className="venue-menu-dishes">
                {group.dishes.map(dish => (
                  <div key={dish.menuItemId} className="venue-menu-item">
                    {dish.imageUrl && <img src={dish.imageUrl} alt={dish.name ?? ''}/>}
                    <div className="venue-menu-item-info"><strong>{dish.name}</strong></div>
                    <span className="venue-menu-item-price">{new Intl.NumberFormat('vi-VN').format(dish.price ?? dish.branchPrice ?? dish.basePrice ?? 0)} ₫</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p>Thực đơn đang được cập nhật. Hãy ghé Savoris để khám phá các món trong ngày.</p>
      )}
      <Link to={`/dat-ban?chi-nhanh=${slug}`}>Đặt bàn <ArrowUpRight size={14}/></Link>
    </main>
  )
}

export function BookingComingSoon() { return <main className="venue-menu-page"><Link to="/" className="venue-brand">SAVORIS</Link><span>ĐẶT BÀN</span><h1>Sắp ra mắt.</h1><p>Chúng tôi đang hoàn thiện trải nghiệm đặt bàn trực tuyến.</p><Link to="/">Quay lại trang chủ</Link></main> }
