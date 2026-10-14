import { ArrowRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import bunCha from '../../assets/photos/bun-cha.webp'
import mamCom from '../../assets/photos/mam-com.webp'
import phoTop from '../../assets/photos/pho-top.webp'
import type { SiteSection } from '../../api/site'

const SEED: SiteSection[] = [
  {
    id: 1, order: 1, visible: true, image_side: 'right',
    image_url: mamCom, public_id: '',
    title: 'Ẩm thực\ntinh hoa',
    body: 'Chúng tôi tin rằng mỗi bữa ăn là một câu chuyện. Từ nguyên liệu được tuyển chọn kỹ lưỡng từ những vùng đất tốt nhất Việt Nam, đến bàn tay điêu luyện của đội ngũ đầu bếp đã qua đào tạo quốc tế — Savoris mang đến trải nghiệm ẩm thực vượt ra ngoài khái niệm bữa ăn thông thường.',
    link_text: 'Tìm hiểu thêm', link_url: '#ve-chung-toi',
  },
  {
    id: 2, order: 2, visible: true, image_side: 'left',
    image_url: phoTop, public_id: '',
    title: 'Tinh tế.\nNăng lượng.\nSáng tạo.',
    body: 'Không gian Savoris được thiết kế để nuôi dưỡng cả thể xác lẫn tâm hồn. Ánh sáng ấm, âm nhạc tinh tế, và sự phục vụ tận tâm tạo nên một bầu không khí khó quên. Dù là buổi tối hẹn hò hay bữa trưa đối tác, mỗi chi tiết đều được chắt lọc.',
    link_text: 'Xem không gian', link_url: '#thu-vien',
  },
  {
    id: 3, order: 3, visible: true, image_side: 'right',
    image_url: bunCha, public_id: '',
    title: 'Không gian\nriêng tư',
    body: 'Phòng riêng dành cho tiệc công ty, kỷ niệm đặc biệt hay buổi họp mặt gia đình. Đội ngũ sự kiện của chúng tôi sẽ thiết kế thực đơn và trang trí riêng theo yêu cầu của bạn, đảm bảo một buổi tối đáng nhớ cho mọi dịp.',
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
