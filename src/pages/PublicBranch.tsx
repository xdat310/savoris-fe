import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUpRight, Clock3, MapPin, Phone } from 'lucide-react'
import { getPublicBranchPage, type SiteBranchPage } from '../api/site'
import interior from '../assets/photos/restaurant-interior.webp'
import meal from '../assets/photos/gourmet-dishes.webp'
import steak from '../assets/photos/steak-plate.webp'
import './public-branch.css'

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
  useEffect(() => { getPublicBranchPage(slug).then(setData).catch(() => setError(true)) }, [slug])
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
    <header className="venue-nav"><Link to="/" className="venue-brand">SAVORIS</Link><nav><a href="#uu-dai">Trải nghiệm</a><Link to={`/chi-nhanh/${branch.slug}/thuc-don`}>Thực đơn</Link><a href="#su-kien">Sự kiện riêng</a><a href="#thu-vien">Thư viện ảnh</a><a href="#lien-he">Liên hệ</a></nav><div className="venue-nav-actions"><details><summary>Chi nhánh <ArrowDown size={13}/></summary><div>{['cn1','cn2','cn3','cn4'].filter(s => s !== branch.slug).map(s => <Link key={s} to={`/chi-nhanh/${s}`}>{s.toUpperCase()}</Link>)}</div></details><Link className="venue-button venue-button--small" to={booking}>Đặt bàn</Link></div></header>
    <section className="venue-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(10,10,9,.72),rgba(10,10,9,.12)),url("${hero}")` }}>
      <div className="venue-hero-copy" data-reveal><span>SAVORIS · HÀ NỘI</span><h1>{branch.name}</h1><p>{page.introduction}</p><Link className="venue-button" to={booking}>Đặt bàn <ArrowUpRight size={16}/></Link></div>
      <a className="venue-scroll" href="#uu-dai">Khám phá <ArrowDown size={14}/></a>
    </section>
    <section className="venue-offers" id="uu-dai"><div className="venue-section-heading" data-reveal><span>HƯƠNG VỊ & TRẢI NGHIỆM</span><h2>Những cuộc gặp<br/>đáng nhớ hơn.</h2></div>
      {data.offers.map((offer, index) => <article className={`venue-offer${index % 2 ? ' is-reversed' : ''}`} key={String(offer.id)} data-reveal><img src={imageUrl(offer.image_url)} alt={String(offer.image_alt ?? offer.title ?? 'Món ăn Savoris')} loading="lazy"/><div className="venue-offer-copy"><span>TRẢI NGHIỆM SAVORIS · 0{index + 1}</span><h3>{String(offer.title)}</h3><p>{String(offer.description)}</p><strong>{money(offer.price)}{offer.price != null ? `/${String(offer.unit ?? 'người')}` : ''}</strong><small><Clock3 size={14}/>{String(offer.schedule ?? '')}</small><Link to={`/chi-nhanh/${branch.slug}/thuc-don`}>Xem thực đơn <ArrowUpRight size={14}/></Link></div></article>)}
    </section>
    <section className="venue-brand-story" data-reveal><span>SAVORIS</span><h2>{page.brandLine}</h2><p>{page.introduction}</p></section>
    <section className="venue-event" id="su-kien" data-reveal><div><span>DẤU MỐC ĐÁNG NHỚ</span><h2>Sự kiện riêng,<br/>dấu ấn của bạn.</h2></div><div><p>{page.privateEvent}</p><a className="venue-button" href={`mailto:${branch.email ?? ''}?subject=${encodeURIComponent('Tổ chức sự kiện tại Savoris')}`}>Liên hệ tổ chức <ArrowUpRight size={16}/></a></div></section>
    {data.accolades.length > 0 && <section className="venue-awards" data-reveal><span>GHI NHẬN</span><h2>Giải thưởng</h2><div>{data.accolades.map(a => <article key={String(a.id)}><b>{String(a.award_year)}</b><p>{String(a.content)}</p></article>)}</div></section>}
    <section className="venue-gallery" id="thu-vien"><div className="venue-section-heading" data-reveal><span>KHÔNG GIAN SAVORIS</span><h2>Khoảnh khắc tại bàn.</h2></div><div className="venue-gallery-grid">{gallery.map(item => <button key={String(item.id)} onClick={() => setActiveImage(imageUrl(item.image_url))} aria-label={`Mở ảnh ${String(item.alt)}`} data-reveal><img src={imageUrl(item.image_url)} alt={String(item.alt)} loading="lazy"/><span>{String(item.alt)}</span></button>)}</div></section>
    {data.testimonials.map(item => <blockquote className="venue-quote" key={String(item.id)} data-reveal><p>“{String(item.quote)}”</p><footer>{String(item.reviewer)} <span>{String(item.title)}</span></footer></blockquote>)}
    <section className="venue-contact" id="lien-he"><div className="venue-contact-copy"><span>GHÉ THĂM CHÚNG TÔI</span><h2>{branch.name}</h2><p><MapPin size={15}/>{branch.address}, {branch.city}</p><a href={`tel:${branch.phone ?? ''}`}><Phone size={15}/>{branch.phone ?? 'Đang cập nhật'}</a><div className="venue-hours"><strong>Giờ mở cửa</strong>{data.openingHours.map(hour => <p key={hour.weekday}><span>{dayNames[hour.weekday]}</span><span>{hour.closed ? 'Nghỉ' : `${String(hour.opens_at ?? '').slice(0,5)} – ${String(hour.closes_at ?? '').slice(0,5)}`}</span></p>)}</div></div><iframe title={`Bản đồ ${branch.name}`} src={String(page.mapUrl ?? `https://maps.google.com/maps?q=${encodeURIComponent(`${branch.address} ${branch.city}`)}&output=embed`)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/></section>
    <footer className="venue-footer"><Link to="/">SAVORIS</Link><span>Ẩm thực Việt, tinh tế trong từng khoảnh khắc.</span><Link to={booking}>Đặt bàn <ArrowUpRight size={14}/></Link></footer>
    {activeImage && <button className="venue-lightbox" onClick={() => setActiveImage(null)} aria-label="Đóng ảnh"><img src={activeImage} alt="Ảnh phóng lớn"/><span>Đóng ×</span></button>}
  </main>
}

export function BranchMenu() {
  const { slug = '' } = useParams()
  const [data, setData] = useState<SiteBranchPage | null>(null)
  useEffect(() => { getPublicBranchPage(slug).then(setData).catch(() => setData(null)) }, [slug])
  const menu = data?.menus.find(item => item.visible !== false)
  return <main className="venue-menu-page"><Link to={`/chi-nhanh/${slug}`} className="venue-brand">SAVORIS</Link><span>THỰC ĐƠN · {data?.branch.name ?? slug.toUpperCase()}</span><h1>Hương vị<br/>đang chờ bạn.</h1>{menu ? <>{menu.image_url && <img className="venue-menu-cover" src={imageUrl(menu.image_url)} alt={`Ảnh bìa ${String(menu.title ?? 'thực đơn')}`} /> }<a className="venue-button" href={String(menu.file_url)} target="_blank" rel="noreferrer">Mở thực đơn PDF <ArrowUpRight size={16}/></a></> : <p>Thực đơn đang được cập nhật. Hãy ghé Savoris để khám phá các món trong ngày.</p>}<Link to={`/dat-ban?chi-nhanh=${slug}`}>Đặt bàn <ArrowUpRight size={14}/></Link></main>
}

export function BookingComingSoon() { return <main className="venue-menu-page"><Link to="/" className="venue-brand">SAVORIS</Link><span>ĐẶT BÀN</span><h1>Sắp ra mắt.</h1><p>Chúng tôi đang hoàn thiện trải nghiệm đặt bàn trực tuyến.</p><Link to="/">Quay lại trang chủ</Link></main> }
