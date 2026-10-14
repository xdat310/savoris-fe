import { ArrowRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import beefWine from '../../assets/photos/beef-steak-wine.webp'
import restaurantInt from '../../assets/photos/restaurant-interior.webp'
import steakCloseup from '../../assets/photos/steak-closeup.webp'
import type { SiteSection } from '../../api/site'

const SEED: SiteSection[] = [
  {
    id: 1, order: 1, visible: true, image_side: 'right',
    image_url: beefWine, public_id: '',
    title: 'Ẩm thực\ntinh hoa',
    body: 'Chúng tôi tin rằng mỗi bữa ăn là một câu chuyện. Từ những thớ thịt bò Wagyu A5 chọn lọc, hải sản tươi nguyên con đến sốt truffle đen nhập từ Périgord — mỗi đĩa ăn là tác phẩm của đầu bếp đã qua đào tạo tại Âu châu. Savoris mang đến trải nghiệm ẩm thực vượt ra ngoài khái niệm bữa ăn thông thường.',
    link_text: 'Tìm hiểu thêm', link_url: '#ve-chung-toi',
  },
  {
    id: 2, order: 2, visible: true, image_side: 'left',
    image_url: restaurantInt, public_id: '',
    title: 'Tinh tế.\nSang trọng.\nĐáng nhớ.',
    body: 'Không gian Savoris được thiết kế bởi NTK nội thất từng giành giải Hospitality Design Award. Ánh nến lung linh, đá cẩm thạch Carrara, và âm nhạc jazz độc quyền tạo nên bầu không khí chỉ những nhà hàng đẳng cấp nhất thế giới mới có. Mỗi chi tiết đều được chắt lọc.',
    link_text: 'Xem không gian', link_url: '#thu-vien',
  },
  {
    id: 3, order: 3, visible: true, image_side: 'right',
    image_url: steakCloseup, public_id: '',
    title: 'Không gian\nriêng tư',
    body: 'Phòng riêng Private Dining dành cho tiệc doanh nghiệp, kỷ niệm đặc biệt hay buổi họp mặt VIP. Đội ngũ sự kiện của chúng tôi sẽ thiết kế thực đơn degustación và trang trí riêng theo yêu cầu, đảm bảo một buổi tối đáng nhớ cho mọi dịp.',
    link_text: 'Liên hệ đặt phòng', link_url: '#lien-he',
  },
]

function cdnUrl(url: string, w: number) {
  if (!url.includes('cloudinary.com')) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`)
}

function useFadeIn(ref: React.RefObject<Element | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('sc-visible'); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
}

function StoryBlock({ s, index }: { s: SiteSection; index: number }) {
  const ref = useRef<HTMLElement>(null)
  useFadeIn(ref as React.RefObject<Element>)
  const flip = s.image_side === 'left'

  return (
    <article
      ref={ref}
      className={`story-block sc-fade${flip ? ' story-block--flip' : ''}`}
    >
      <div className="story-media">
        <img
          src={cdnUrl(s.image_url, 960)}
          srcSet={`${cdnUrl(s.image_url, 640)} 640w, ${cdnUrl(s.image_url, 960)} 960w`}
          sizes="(max-width:900px) 100vw, 45vw"
          alt=""
          loading={index === 0 ? 'eager' : 'lazy'}
        />
        <div className="story-vignette" aria-hidden="true" />
      </div>
      <div className="story-copy">
        <span className="story-eyebrow">0{index + 1}</span>
        <h2 className="story-title">
          {s.title.split('\n').map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </h2>
        <p className="story-body">{s.body}</p>
        {s.link_text && (
          <a className="story-link" href={s.link_url ?? '#'}>
            {s.link_text} <ArrowRight size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  )
}

interface Props { sections?: SiteSection[] }

export function SiteStory({ sections }: Props) {
  const data = sections && sections.length > 0
    ? sections.filter((s) => s.visible).sort((a, b) => a.order - b.order)
    : SEED
  return (
    <section className="story-wrap" aria-label="Câu chuyện của chúng tôi">
      {data.map((s, i) => <StoryBlock key={s.id} s={s} index={i} />)}
    </section>
  )
}
