import { ArrowUpRight, Award, Quote } from 'lucide-react'
import './site-cms-highlights.css'

type Branch = { id?: number; name?: string; slug?: string }
type RecordRow = Record<string, unknown>
interface Props { offers: RecordRow[]; accolades: RecordRow[]; testimonials: RecordRow[]; menus: RecordRow[]; branches: Branch[] }
const text = (row: RecordRow, ...keys: string[]) => String(keys.map((key) => row[key]).find((value) => value != null) ?? '')

export function SiteCmsHighlights({ offers, accolades, testimonials, menus, branches }: Props) {
  const visibleOffers = offers.filter((item) => item.visible !== false)
  const visibleMenus = menus.filter((item) => item.visible !== false && text(item, 'file_url', 'fileUrl'))
  const visibleAwards = accolades.filter((item) => item.visible !== false)
  const realReviews = testimonials.filter((item) => item.visible !== false && text(item, 'source').trim())
  if (!visibleOffers.length && !visibleMenus.length && !visibleAwards.length && !realReviews.length) return null
  return <section className="cms-highlights">
    {visibleOffers.length > 0 && <div className="cms-highlights-block" id="uu-dai"><div className="cms-highlights-title"><span>SAVORIS · TRẢI NGHIỆM</span><h2>Hương vị cho<br/>những dịp đáng nhớ.</h2></div><div className="cms-offer-grid">{visibleOffers.map((item, index) => <article key={text(item,'id') || index} className={index % 2 ? 'is-offset' : ''}>{text(item,'image_url','imageUrl') && <img src={text(item,'image_url','imageUrl')} alt={text(item,'image_alt','imageAlt','title')} loading="lazy"/>}<small>{text(item,'schedule')}</small><h3>{text(item,'title')}</h3><p>{text(item,'description')}</p>{text(item,'price') && <strong>{new Intl.NumberFormat('vi-VN').format(Number(text(item,'price')))} ₫{text(item,'unit') ? ` / ${text(item,'unit')}` : ''}</strong>}</article>)}</div></div>}
    {visibleMenus.length > 0 && <div className="cms-highlights-block cms-menus" id="thuc-don"><div className="cms-highlights-title"><span>THỰC ĐƠN</span><h2>Khám phá tại<br/>từng chi nhánh.</h2></div><div className="cms-menu-grid">{visibleMenus.map((item,index) => { const branch = branches.find((b) => b.id === Number(text(item,'branch_id','branchId'))); const href = branch?.slug ? `/chi-nhanh/${branch.slug}/thuc-don` : text(item,'file_url','fileUrl'); return <article key={text(item,'id') || index}>{text(item,'image_url','imageUrl') && <img src={text(item,'image_url','imageUrl')} alt={text(item,'title')} loading="lazy"/>}<span>{branch?.name ?? 'SAVORIS'}</span><h3>{text(item,'title') || 'Thực đơn Savoris'}</h3><a href={href}>Mở thực đơn PDF <ArrowUpRight size={14}/></a></article>})}</div></div>}
    {visibleAwards.length > 0 && <div className="cms-highlights-block cms-awards"><span>GHI NHẬN</span><h2>Giải thưởng & dấu ấn</h2><div>{visibleAwards.map((item,index) => <article key={text(item,'id') || index}><Award size={19}/><strong>{text(item,'award_year','year')}</strong><p>{text(item,'content')}</p></article>)}</div></div>}
    {realReviews.length > 0 && <div className="cms-highlights-block cms-reviews"><span>THỰC KHÁCH CHIA SẺ</span><div>{realReviews.map((item,index) => <blockquote key={text(item,'id') || index}><Quote size={20}/><p>“{text(item,'quote')}”</p><footer>{text(item,'reviewer')}<small>{text(item,'source')}{text(item,'title') ? ` · ${text(item,'title')}` : ''}</small></footer></blockquote>)}</div></div>}
  </section>
}
