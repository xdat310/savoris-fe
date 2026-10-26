import { ArrowUpRight, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublicBranch, SiteNavItem } from '../../api/site'

interface Props { nav?: SiteNavItem[]; branches?: PublicBranch[]; currentBranchSlug?: string; currentBranchName?: string; logoUrl?: string }

function branchStatus(branch: PublicBranch) {
  if (branch.openNow === false) return 'Tạm dừng mang về'
  if (branch.acceptingTakeaway === false) return 'Tạm dừng mang về'
  if (Number(branch.estimatedWaitMinutes ?? 0) >= 20) return 'Đang đông'
  return branch.openNow === true ? 'Đang mở' : 'Đang cập nhật'
}

export function SiteHeader({ nav = [], branches = [], currentBranchSlug, currentBranchName, logoUrl }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const branchList = (Array.isArray(branches) ? branches : []).filter(branch => Boolean(branch.slug)).slice(0, 4)
  const links = (Array.isArray(nav) ? nav : []).filter(item => item.visible).sort((a,b)=>a.order-b.order)
  const visibleLinks = links.length ? links.map(item=>({label:item.label,link:item.link})) : [
    { label: 'Giới thiệu', link: '#ve-chung-toi' },
    { label: 'Thực đơn', link: `/chi-nhanh/${currentBranchSlug || branchList[0]?.slug || 'hoan-kiem'}/thuc-don` },
    { label: 'Liên hệ', link: '#lien-he' },
  ]

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 40)
    update(); window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  useEffect(() => {
    document.body.style.overflow = mobileOpen || branchOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen, branchOpen])
  useEffect(() => {
    if (!branchOpen) return
    const root = dialog.current
    root?.querySelector<HTMLElement>('button, a')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setBranchOpen(false); trigger.current?.focus(); return }
      if (event.key !== 'Tab' || !root) return
      const items = [...root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]')]
      if (!items.length) return
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [branchOpen])

  return <>
    <header className={`sh${scrolled ? ' sh--solid' : ''}`} role="banner"><div className="sh-inner">
      <Link to="/" className="sh-logo" aria-label="Savoris — trang chủ">{logoUrl?<img className="sh-logo-img" src={logoUrl} alt="Savoris"/>:<span className="sh-logo-text">SAVORIS</span>}{currentBranchSlug && <span className="sh-current-branch">{currentBranchName||branchList.find(b=>b.slug===currentBranchSlug)?.name}</span>}</Link>
      <nav className="sh-nav" aria-label="Điều hướng chính">{visibleLinks.slice(0,2).map((item,index)=><a key={`${item.link}-${index}`} className="sh-nav-item" href={item.link}>{item.label}</a>)}
        {branchList.length>0 && <button ref={trigger} className="sh-nav-item sh-nav-item--branch" aria-haspopup="dialog" aria-expanded={branchOpen} onClick={()=>setBranchOpen(true)}>Chi nhánh</button>}
        {visibleLinks.slice(2,3).map((item,index)=><a key={`${item.link}-${index}`} className="sh-nav-item" href={item.link}>{item.label}</a>)}
        <Link className="sh-cta" to={currentBranchSlug?`/dat-ban?chi-nhanh=${currentBranchSlug}`:'/dat-ban'}>Đặt bàn</Link>
      </nav>
      {branchList.length>0&&<button className="sh-mobile-branches" aria-label="Chọn chi nhánh" onClick={()=>setBranchOpen(true)}>Chi nhánh</button>}
      <button className="sh-hamburger" aria-label={mobileOpen?'Đóng menu':'Mở menu'} aria-expanded={mobileOpen} onClick={()=>setMobileOpen(value=>!value)}>{mobileOpen?<X size={22}/>:<Menu size={22}/>}</button>
    </div></header>
    <div className={`sh-overlay${mobileOpen?' sh-overlay--open':''}`} aria-hidden={!mobileOpen}><nav className="sh-overlay-nav" aria-label="Menu di động">
      {visibleLinks.map((item,index)=><a key={`${item.link}-${index}`} className="sh-overlay-item" href={item.link} onClick={()=>setMobileOpen(false)} tabIndex={mobileOpen?0:-1}>{item.label}</a>)}
      {branchList.length>0&&<button className="sh-overlay-item" onClick={()=>{setMobileOpen(false);setBranchOpen(true)}} tabIndex={mobileOpen?0:-1}>Chi nhánh</button>}
      <Link className="sh-overlay-cta" to={currentBranchSlug?`/dat-ban?chi-nhanh=${currentBranchSlug}`:'/dat-ban'} onClick={()=>setMobileOpen(false)} tabIndex={mobileOpen?0:-1}>Đặt bàn</Link>
    </nav></div>
    {branchOpen&&<div className="sh-branch-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget){setBranchOpen(false);trigger.current?.focus()}}}>
      <section className="sh-branch-dialog" role="dialog" aria-modal="true" aria-label="Chọn chi nhánh" ref={dialog}>
        <header><div><span>SAVORIS · HÀ NỘI</span><h2>Chọn chi nhánh</h2><p>Mỗi điểm hẹn mang một sắc thái riêng.</p></div><button aria-label="Đóng danh sách chi nhánh" onClick={()=>{setBranchOpen(false);trigger.current?.focus()}}><X size={22}/></button></header>
        <div className="sh-branch-grid">{branchList.map((branch,index)=><Link key={branch.id??branch.slug} className={`sh-branch-card${branch.slug===currentBranchSlug?' is-current':''}`} to={`/chi-nhanh/${branch.slug}`} onClick={()=>setBranchOpen(false)}>
          <div className="sh-branch-photo">{branch.imageUrl&&<img src={branch.imageUrl} alt="" loading={index===0?'eager':'lazy'}/>}<span>{branch.code||`CN0${index+1}`} · {branch.name}</span></div>
          <p className="sh-branch-district">{branch.city||branch.address||'Hà Nội'}</p><span className="sh-branch-status"><i/>{branchStatus(branch)}</span><span className="sh-branch-link">Xem chi nhánh <ArrowUpRight size={14}/></span>
        </Link>)}</div>
      </section>
    </div>}
  </>
}
