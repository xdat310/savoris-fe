import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUpRight, Clock3, MapPin, Phone } from 'lucide-react'
import { get } from '../api/client'
import type { GuestTableResponse } from '../api/types'
import { branchLabel, getPublicBranchPage, getPublicSite, type SiteBranchPage } from '../api/site'
import { groupDishes } from '../components/DishBoard'
import interior from '../assets/photos/restaurant-interior.webp'
import meal from '../assets/photos/gourmet-dishes.webp'
import steak from '../assets/photos/steak-plate.webp'
import './public-branch.css'
import { applySeo } from '../lib/seo'

const seededImages: Record<string, string> = {
  '/images/restaurant-interior.webp': interior,
  '/images/gourmet-dishes.webp': meal,
  '/images/steak-plate.webp': steak,
}
function imageUrl(url?: unknown) {
  if (typeof url !== 'string' || !url) return meal
  return seededImages[url] ?? url
}
const dayNames = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
const money = (value: unknown) => typeof value === 'number' ? `${new Intl.NumberFormat('vi-VN').format(value)} ₫` : ''

export function PublicBranch() {
  const { slug = '' } = useParams()
  const [data, setData] = useState<SiteBranchPage | null>(null)
  const [error, setError] = useState(false)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [branchList, setBranchList] = useState<{ id?: number; code?: string; name?: string; slug?: string }[]>([])
  useEffect(() => { getPublicBranchPage(slug).then(setData).catch(() => setError(true)) }, [slug])
  useEffect(() => { getPublicSite().then((site) => setBranchList(Array.isArray(site.branches) ? site.branches as typeof branchList : [])).catch(() => {}) }, [])
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { nodes.forEach(n => n.classList.add('is-visible')); return }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) } }), { threshold: .12 })
    nodes.forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [data])

  if (error) return <main className="branch-error"><h1>Không tìm thấy chi nhánh</h1><Link to="/">Về trang chủ</Link></main>
  if (!data) return <main className="branch-loading" aria-busy="true">Đang tải trải nghiệm Savoris…</main>
  const { branch, page } = data
  const hero = imageUrl(page.heroImage)
  const booking = `/dat-ban?chi-nhanh=${branch.slug}`
  const gallery = data.gallery as Record<string, unknown>[]
  return <main className="venue-page">
    <header className="venue-nav"><Link to="/" className="venue-brand">SAVORIS</Link><nav><a href="#uu-dai">Trải nghiệm</a><Link to={`/chi-nhanh/${branch.slug}/thuc-don`}>Thực đơn</Link><a href="#su-kien">Sự kiện riêng</a><a href="#thu-vien">Thư viện ảnh</a><a href="#lien-he">Liên hệ</a></nav><div className="venue-nav-actions"><details><summary>Chi nhánh <ArrowDown size={13}/></summary><div>{branchList.filter(item => item.slug !== branch.slug).map(item => <Link key={item.id ?? item.slug} to={`/chi-nhanh/${item.slug}`}>{item.code} · {item.name}</Link>)}</div></details><Link className="venue-button venue-button--small" to={booking}>Đặt bàn</Link></div></header>
    <section className="venue-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(10,10,9,.72),rgba(10,10,9,.12)),url("${hero}")` }}>
      <div className="venue-hero-copy" data-reveal><span>SAVORIS · HÀ NỘI</span><h1>{branchLabel(branch)}</h1><p>{page.introduction}</p><Link className="venue-button" to={booking}>Đặt bàn <ArrowUpRight size={16}/></Link></div>
      <a className="venue-scroll" href="#uu-dai">Khám phá <ArrowDown size={14}/></a>
    </section>
    {data.offers.length > 0 && <section className="venue-offers" id="uu-dai"><div className="venue-section-heading" data-reveal><span>HƯƠNG VỊ & TRẢI NGHIỆM</span><h2>Những cuộc gặp<br/>đáng nhớ hơn.</h2></div>
      {data.offers.map((offer, index) => <article className={`venue-offer${index % 2 ? ' is-reversed' : ''}`} key={String(offer.id)} data-reveal><img src={imageUrl(offer.image_url)} alt={String(offer.image_alt ?? offer.title ?? 'Món ăn Savoris')} loading="lazy"/><div className="venue-offer-copy"><span>TRẢI NGHIỆM SAVORIS · 0{index + 1}</span><h3>{String(offer.title)}</h3><p>{String(offer.description)}</p><strong>{money(offer.price)}{offer.price != null ? `/${String(offer.unit ?? 'người')}` : ''}</strong><small><Clock3 size={14}/>{String(offer.schedule ?? '')}</small><Link to={`/chi-nhanh/${branch.slug}/thuc-don`}>Xem thực đơn <ArrowUpRight size={14}/></Link></div></article>)}
    </section>}
    <section className="venue-brand-story" data-reveal><span>SAVORIS</span><h2>{page.brandLine}</h2><p>{page.introduction}</p></section>
    <section className="venue-event" id="su-kien" data-reveal><div><span>DẤU MỐC ĐÁNG NHỚ</span><h2>Sự kiện riêng,<br/>dấu ấn của bạn.</h2></div><div><p>{page.privateEvent}</p><a className="venue-button" href={`mailto:${branch.email ?? ''}?subject=${encodeURIComponent('Tổ chức sự kiện tại Savoris')}`}>Liên hệ tổ chức <ArrowUpRight size={16}/></a></div></section>
    {data.accolades.length > 0 && <section className="venue-awards" data-reveal><span>GHI NHẬN</span><h2>Giải thưởng</h2><div>{data.accolades.map(a => <article key={String(a.id)}><b>{String(a.award_year)}</b><p>{String(a.content)}</p></article>)}</div></section>}
    {gallery.length > 1 && <section className="venue-gallery" id="thu-vien"><div className="venue-section-heading" data-reveal><span>KHÔNG GIAN SAVORIS</span><h2>Khoảnh khắc tại bàn.</h2></div><div className="venue-gallery-grid">{gallery.map(item => <button key={String(item.id)} onClick={() => setActiveImage(imageUrl(item.image_url))} aria-label={`Mở ảnh ${String(item.alt)}`} data-reveal><img src={imageUrl(item.image_url)} alt={String(item.alt)} loading="lazy"/><span>{String(item.alt)}</span></button>)}</div></section>}
    {data.testimonials.filter(item => Boolean(item.source)).map(item => <blockquote className="venue-quote" key={String(item.id)} data-reveal><p>“{String(item.quote)}”</p><footer>{String(item.reviewer)} <span>{String(item.source)}{item.title ? ` · ${String(item.title)}` : ''}</span></footer></blockquote>)}
    <section className="venue-contact" id="lien-he"><div className="venue-contact-copy"><span>GHÉ THĂM CHÚNG TÔI</span><h2>{branchLabel(branch)}</h2><p><MapPin size={15}/>{branch.address}, {branch.city}</p><a href={`tel:${branch.phone ?? ''}`}><Phone size={15}/>{branch.phone ?? 'Đang cập nhật'}</a>{data.openingHours.some(h => !h.closed) && <div className="venue-hours"><strong>Giờ mở cửa</strong>{data.openingHours.map(hour => <p key={hour.weekday}><span>{dayNames[hour.weekday]}</span><span>{hour.closed ? 'Nghỉ' : `${String(hour.opens_at ?? '').slice(0,5)} – ${String(hour.closes_at ?? '').slice(0,5)}`}</span></p>)}</div>}</div><iframe title={`Bản đồ ${branch.name}`} src={String(page.mapUrl ?? `https://maps.google.com/maps?q=${encodeURIComponent(`${branch.address} ${branch.city}`)}&output=embed`)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/></section>
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
    get<GuestTableResponse>(`/public/branches/${data.branch.id}/menu`).then(setMenuData).catch(() => {})
  }, [data?.branch.id])
  const groups = useMemo(() => groupDishes(menuData?.categories, menuData?.menu), [menuData])
  const pdfMenus = (data?.menus ?? []).filter(m => m.visible !== false && m.file_url)
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
      {pdfMenus.length > 0 && <a className="venue-button" href={String(pdfMenus[0].file_url)} target="_blank" rel="noreferrer">Tải thực đơn PDF <ArrowUpRight size={16}/></a>}
      <Link to={`/dat-ban?chi-nhanh=${slug}`}>Đặt bàn <ArrowUpRight size={14}/></Link>
    </main>
  )
}

export function BookingComingSoon() { return <main className="venue-menu-page"><Link to="/" className="venue-brand">SAVORIS</Link><span>ĐẶT BÀN</span><h1>Sắp ra mắt.</h1><p>Chúng tôi đang hoàn thiện trải nghiệm đặt bàn trực tuyến.</p><Link to="/">Quay lại trang chủ</Link></main> }
