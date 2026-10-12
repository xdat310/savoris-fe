import { BookOpen, ChevronRight, MapPin, ReceiptText, ScanQrCode, ShoppingBag, UtensilsCrossed, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { get } from '../api/client'
import type { PublicBranchResponse, PublicMenuResponse } from '../api/types'
import bunCha from '../assets/photos/bun-cha.webp'
import heroPho from '../assets/photos/hero-pho.webp'
import mamCom from '../assets/photos/mam-com.webp'
import phoTop from '../assets/photos/pho-top.webp'
import { Empty, ErrorNotice, Loading } from '../components/Feedback'
import { NearMe } from '../components/NearMe'
import { QrScan } from '../components/QrScan'
import { byDistance, formatKm, useMyLocation } from '../lib/geo'
import { money, number } from '../lib/format'
import { forgetSeat, lastSeat, lastTakeaway } from '../lib/seat'
import { useData } from '../lib/useData'

const YEAR = new Date().getFullYear()
const TAKEAWAY_BRANCH_KEY = 'dinechain.takeawayBranch'

const MILESTONES = [
  { year: '2018', title: 'Khai trương', desc: 'Chi nhánh đầu tiên ra đời tại Hoàn Kiếm, Hà Nội — phục vụ hơn 300 lượt khách mỗi ngày chỉ sau hai tuần mở cửa.' },
  { year: '2019', title: 'Mở rộng', desc: 'Ba chi nhánh mới ở Đống Đa và Cầu Giấy. Vượt mốc 100.000 lượt khách và ra mắt thực đơn theo mùa đầu tiên.' },
  { year: '2020', title: 'Bếp không ngủ', desc: 'Giữa đại dịch, DineChain ra mắt hệ thống đặt mang về trực tuyến, duy trì hoạt động và giữ nguyên đội ngũ 200+ nhân sự.' },
  { year: '2021', title: 'Bếp số', desc: 'Triển khai quy trình bếp điều phối tự động đầu tiên tại Việt Nam — thời gian chờ giảm 40%, không một đơn nào bị thất lạc.' },
  { year: '2022', title: 'Toàn quốc', desc: 'Tiến vào TP.HCM với hai chi nhánh tại Quận 1 và Bình Thạnh. DineChain chính thức trở thành chuỗi nhà hàng quy mô toàn quốc.' },
  { year: '2023', title: 'Ghi nhận', desc: 'Nhận giải "Chuỗi nhà hàng phát triển bền vững nhất" tại Food & Beverage Asia Summit. Hơn 300.000 lượt khách trong năm.' },
  { year: '2024', title: 'Thập kỷ đầu', desc: 'Chạm mốc 10 chi nhánh, 500.000 lượt khách/năm. Ra mắt hệ thống POS và quản lý bếp thế hệ mới.' },
  { year: '2025', title: 'Nền tảng mở', desc: 'DineChain Platform hoàn chỉnh — từ đặt bàn, gọi món QR, bếp số đến quản lý chuỗi toàn quốc trên một hệ thống duy nhất.' },
]

const FEATURES = [
  {
    eyebrow: 'Triết lý bếp',
    title: 'Mở bếp, mở lòng',
    body: 'Mỗi món ăn tại DineChain là kết quả của nguyên liệu Việt được chọn lọc kỹ càng và kỹ thuật chế biến đương đại. Chúng tôi tin rằng bữa ăn ngon nhất là bữa ăn biết nguồn gốc.',
    photo: mamCom,
    alt: 'Mâm cơm Việt truyền thống',
  },
  {
    eyebrow: 'Thực đơn',
    title: 'Hương vị Việt, kỹ thuật mới',
    body: 'Từ bún chả Hà Nội truyền thống đến phở bò ninh 12 tiếng, DineChain giữ hồn ẩm thực Việt và thêm vào những chi tiết đương đại khiến từng món trở nên khó quên.',
    photo: bunCha,
    alt: 'Bún chả Hà Nội',
    cta: true,
  },
  {
    eyebrow: 'Trải nghiệm',
    title: 'Không gian tạo ký ức',
    body: 'Ánh sáng trầm, không gian rộng rãi và đội ngũ phục vụ tận tâm — DineChain được thiết kế để mỗi bữa ăn đều trở thành một khoảnh khắc đáng nhớ, dù là buổi trưa bận rộn hay tối cuối tuần.',
    photo: phoTop,
    alt: 'Phở bò DineChain',
  },
]

export function Home() {
  const navigate = useNavigate()
  const menu = useData(() => get<PublicMenuResponse>('/public/menu'), [])
  const branches = useData(() => get<PublicBranchResponse[]>('/public/branches'), [], 60000)
  const [seat, setSeat] = useState(lastSeat)
  const [scanning, setScanning] = useState(false)
  const [takeaway] = useState(lastTakeaway)
  const [category, setCategory] = useState<number | null>(null)
  const [asking, setAsking] = useState(() => {
    if (lastSeat()) return false
    try { return sessionStorage.getItem('dinechain.asked') !== '1' } catch { return true }
  })

  function answer(choice: 'here' | 'away' | null) {
    setAsking(false)
    try { sessionStorage.setItem('dinechain.asked', '1') } catch {}
    if (choice === 'here') setScanning(true)
    if (choice === 'away') navigate('/mang-ve')
  }
  const openTable = useCallback((token: string) => navigate(`/goi-mon/${token}`), [navigate])

  function orderFrom(branch: PublicBranchResponse) {
    try { sessionStorage.setItem(TAKEAWAY_BRANCH_KEY, String(branch.id)) } catch {}
    navigate('/mang-ve')
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const categories = useMemo(() => {
    const used = new Set((menu.data?.dishes ?? []).map((d) => d.categoryId))
    return (menu.data?.categories ?? []).filter((c) => used.has(c.id))
  }, [menu.data])
  const dishes = (menu.data?.dishes ?? []).filter((d) => category == null || d.categoryId === category)
  const transfer = branches.data?.some((b) => b.transferAvailable) ?? false
  const located = (branches.data ?? []).filter((b) => b.address && b.address !== 'Chưa cập nhật' && b.city && b.city !== 'Chưa cập nhật')
  const cities = [...new Set(located.map((b) => b.city!))].map((city) => ({ city, branches: located.filter((b) => b.city === city) }))
  const branchCount = branches.data?.length ?? 0
  const here = useMyLocation()
  const origin = here.state.status === 'ok' ? { lat: here.state.lat, lng: here.state.lng } : null
  const nearby = byDistance(branches.data ?? [], origin)
  const nearestId = origin ? nearby.find((x) => x.km != null && x.item.acceptingTakeaway)?.item.id : undefined

  return (
    <div className="home">

      {/* ── HERO ── */}
      <section className="hk-hero">
        <img className="hk-hero-img" src={heroPho} alt="Bát phở bò DineChain" />
        <div className="hk-hero-shade" aria-hidden="true" />

        <header className="hk-header">
          <Link to="/" className="hk-wordmark">Dine<span>Chain</span></Link>
          <nav className="hk-nav" aria-label="Điều hướng chính">
            <button onClick={() => scrollTo('thuc-don')}>Thực đơn</button>
            <button onClick={() => scrollTo('chi-nhanh')}>Chi nhánh</button>
            <button onClick={() => scrollTo('lien-he')}>Liên hệ</button>
          </nav>
          <button className="btn-oval hk-header-cta" onClick={() => answer('away')}>
            <span>Đặt<br />mang về</span>
          </button>
        </header>

        <div className="hk-hero-body">
          {(seat || takeaway) && (
            <div className="hk-reminders">
              {seat && (
                <div className="hk-reminder">
                  <MapPin size={15} aria-hidden="true" />
                  <div className="hk-reminder-text">
                    <strong>Bàn {seat.tableName} · {seat.branchName}</strong>
                    <span>{seat.areaName}</span>
                  </div>
                  <button className="btn-oval hk-reminder-btn" onClick={() => openTable(seat.token)}>Gọi món</button>
                  <button className="hk-reminder-x" onClick={() => { forgetSeat(); setSeat(null) }} aria-label="Bỏ bàn"><X size={13} /></button>
                </div>
              )}
              {takeaway && (
                <Link to={`/don-mang-ve/${takeaway.token}`} className="hk-reminder">
                  <ReceiptText size={15} aria-hidden="true" />
                  <div className="hk-reminder-text">
                    <strong>Đơn mang về · {takeaway.code}</strong>
                    <span>{takeaway.branchName}</span>
                  </div>
                  <ChevronRight size={15} aria-hidden="true" />
                </Link>
              )}
            </div>
          )}
          <h1 className="hk-hero-title">Dine<span>Chain</span></h1>
          <p className="hk-hero-sub">Ẩm thực Việt — Tinh tế từng bữa ăn</p>
          <div className="hk-hero-ctas">
            <button className="btn-oval hk-cta-primary" onClick={() => setScanning(true)}>
              <span>Ăn<br />tại quán</span>
            </button>
            <Link to="/mang-ve" className="btn-oval hk-cta-outline">
              <span>Mang<br />về</span>
            </Link>
            <button className="hk-cta-ghost" onClick={() => scrollTo('thuc-don')}>Xem thực đơn ↓</button>
          </div>
        </div>
      </section>

      {/* ── MANIFESTO ── */}
      <section className="hk-manifesto">
        <p className="hk-manifesto-quote">Tinh tế. Năng lượng. Cảm xúc.</p>
        <p className="hk-manifesto-body">
          DineChain là chuỗi nhà hàng ẩm thực Việt đương đại với triết lý bếp mở — nơi nguyên liệu tươi sạch, kỹ thuật nấu tỉ mỉ và không gian tinh tế hoà quyện để tạo ra những bữa ăn đáng nhớ.
        </p>
      </section>

      {/* ── FEATURES: ảnh xen kẽ chữ ── */}
      {FEATURES.map((f, i) => (
        <section key={f.eyebrow} className={`hk-feature${i % 2 === 1 ? ' hk-feature-flip' : ''}`}>
          <div className="hk-feature-media">
            <img src={f.photo} alt={f.alt} loading="lazy" />
          </div>
          <div className="hk-feature-copy">
            <span className="hk-feature-eyebrow">{f.eyebrow}</span>
            <h2 className="hk-feature-title">{f.title}</h2>
            <p className="hk-feature-body">{f.body}</p>
            {f.cta && (
              <button className="btn-oval" style={{ marginTop: 12, color: 'var(--ink)' }} onClick={() => scrollTo('thuc-don')}>
                <span>Xem<br />thực đơn</span>
              </button>
            )}
          </div>
        </section>
      ))}

      {/* ── MENU ── */}
      <section id="thuc-don" className="hk-menu-section">
        <div className="hk-menu-head">
          <h2>Thực đơn</h2>
          <div className="hk-menu-actions">
            <button className="btn-oval hk-cta-primary" onClick={() => setScanning(true)}>
              <span>Ăn tại quán</span>
            </button>
            <Link to="/mang-ve" className="btn-oval" style={{ color: 'var(--ink)' }}>
              <span>Mang về</span>
            </Link>
          </div>
        </div>

        {categories.length > 1 && (
          <div className="hk-menu-tabs" role="group" aria-label="Nhóm món">
            <button aria-pressed={category == null} onClick={() => setCategory(null)}>Tất cả</button>
            {categories.map((c) => (
              <button key={c.id} aria-pressed={category === c.id} onClick={() => setCategory(c.id!)}>{c.name}</button>
            ))}
          </div>
        )}

        {menu.error && <ErrorNotice message={menu.error} onRetry={menu.reload} />}
        {menu.loading ? <Loading label="Đang tải thực đơn…" /> : dishes.length === 0 ? (
          !menu.error && <Empty title="Thực đơn đang được cập nhật" />
        ) : (
          <div className="hk-dish-grid">
            {dishes.map((d) => (
              <article key={d.id} className="hk-dish">
                <div className="hk-dish-photo">
                  {d.imageUrl
                    ? <img src={d.imageUrl} alt={d.name} loading="lazy" />
                    : <span className="hk-dish-ph" aria-hidden="true">{d.name}</span>}
                </div>
                <div className="hk-dish-info">
                  <h3>{d.name}</h3>
                  {d.description && <p>{d.description}</p>}
                  <span className="hk-dish-price num">{money(d.price)}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {menu.data?.vatPercent != null && (
          <p className="hk-menu-note">Giá chưa gồm VAT {number(menu.data.vatPercent, 2)}%. {transfer ? 'Thanh toán: chuyển khoản hoặc tiền mặt tại quầy.' : 'Thanh toán tiền mặt tại quầy.'}</p>
        )}
      </section>

      {/* ── TIMELINE ── */}
      <section className="hk-timeline-section">
        <h2>Hành trình của chúng tôi</h2>
        <div className="hk-tl-items">
          {MILESTONES.map((m) => (
            <div key={m.year} className="hk-tl-item">
              <span className="hk-tl-year">{m.year}</span>
              <div className="hk-tl-body">
                <strong>{m.title}</strong>
                <span>{m.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CHI NHÁNH ── */}
      <section id="chi-nhanh" className="hk-branches-section">
        <div className="hk-branches-head">
          <h2>Chi nhánh</h2>
          <NearMe tone="dark" status={here.state.status} message={here.state.status === 'error' ? here.state.message : undefined} onAsk={here.ask} />
        </div>
        {branches.error && <ErrorNotice message={branches.error} onRetry={branches.reload} />}
        <div className="hk-branch-list">
          {nearby.map(({ item: b, km }) => (
            <button key={b.id} className="hk-branch-item" disabled={!b.acceptingTakeaway} onClick={() => orderFrom(b)}>
              <span className="hk-branch-code">{b.code}</span>
              <span className="hk-branch-main">
                <strong>
                  {b.name}
                  {b.id === nearestId && <span className="nearest-tag">Gần nhất</span>}
                </strong>
                {b.address && b.address !== 'Chưa cập nhật' && (
                  <span>{b.address}{b.city && b.city !== 'Chưa cập nhật' ? `, ${b.city}` : ''}</span>
                )}
                {km != null && <span>Cách bạn {formatKm(km)}</span>}
              </span>
              {b.acceptingTakeaway
                ? <span className="btn-oval btn-oval-sm hk-branch-cta" aria-hidden="true">Đặt mang về</span>
                : <span className="hk-branch-closed">Bếp đang kín</span>}
            </button>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="lien-he" className="hk-foot">
        <div className="hk-foot-brand">
          <Link to="/" className="hk-wordmark">Dine<span>Chain</span></Link>
          {cities.length > 0 && <p>{branchCount} chi nhánh · {cities.map((c) => c.city).join(' · ')}</p>}
        </div>
        {cities.map((c) => (
          <div key={c.city} className="hk-foot-col">
            <h4>{c.city}</h4>
            <ul>
              {c.branches.map((b) => (
                <li key={b.id}><strong>{b.name}</strong><span>{b.address}</span></li>
              ))}
            </ul>
          </div>
        ))}
        <div className="hk-foot-col">
          <h4>Đặt món</h4>
          <nav aria-label="Đặt món">
            <button onClick={() => setScanning(true)}>Ăn tại quán · quét mã bàn</button>
            <Link to="/mang-ve">Đặt mang về</Link>
            <button onClick={() => scrollTo('thuc-don')}>Xem thực đơn</button>
          </nav>
        </div>
        <div className="hk-foot-col">
          <h4>Giờ mở cửa</h4>
          <ul>
            <li><strong>Thứ 2 – Thứ 6</strong><span>10:30 – 22:00</span></li>
            <li><strong>Thứ 7 – Chủ nhật</strong><span>08:00 – 22:30</span></li>
          </ul>
        </div>
        <small className="hk-foot-copy">© {YEAR} DineChain · Ẩm thực Việt đương đại</small>
      </footer>

      {/* ── MOBILE NAV BAR ── */}
      <nav className="hk-mobile-bar" aria-label="Điều hướng nhanh">
        <button onClick={() => setScanning(true)}><ScanQrCode size={18} aria-hidden="true" /> {seat ? 'Bàn khác' : 'Quét bàn'}</button>
        <Link to="/mang-ve"><ShoppingBag size={18} aria-hidden="true" /> Mang về</Link>
        <button onClick={() => scrollTo('thuc-don')}><BookOpen size={18} aria-hidden="true" /> Thực đơn</button>
      </nav>

      {/* ── MODAL: chọn cách dùng bữa ── */}
      {asking && (
        <div className="guest-sheet-backdrop" onClick={() => answer(null)}>
          <div className="guest-sheet choice-sheet" role="dialog" aria-modal="true" aria-labelledby="choice-title" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2 id="choice-title">Bạn dùng bữa thế nào?</h2>
              <button className="icon-btn" aria-label="Xem thực đơn trước" onClick={() => answer(null)}><X size={18} /></button>
            </div>
            <div className="choice-options">
              <button className="choice" onClick={() => answer('here')}>
                <UtensilsCrossed size={24} aria-hidden="true" />
                <strong>Ăn tại quán</strong>
                <span>Quét mã QR dán trên bàn để gọi món</span>
              </button>
              <button className="choice" onClick={() => answer('away')}>
                <ShoppingBag size={24} aria-hidden="true" />
                <strong>Mang về</strong>
                <span>Chọn chi nhánh, đặt món, trả tiền trước</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {scanning && <QrScan onToken={openTable} onClose={() => setScanning(false)} />}
    </div>
  )
}
