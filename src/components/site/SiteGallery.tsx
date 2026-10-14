import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import bunCha from '../../assets/photos/bun-cha.webp'
import heroPho from '../../assets/photos/hero-pho.webp'
import mamCom from '../../assets/photos/mam-com.webp'
import phoTop from '../../assets/photos/pho-top.webp'
import type { SiteGalleryItem } from '../../api/site'

const SEED: SiteGalleryItem[] = [
  { id: 1, order: 1, image_url: heroPho,  public_id: '', caption: 'Phở bò hầm 12 tiếng' },
  { id: 2, order: 2, image_url: mamCom,   public_id: '', caption: 'Mâm cơm Việt truyền thống' },
  { id: 3, order: 3, image_url: bunCha,   public_id: '', caption: 'Bún chả Hà Nội' },
  { id: 4, order: 4, image_url: phoTop,   public_id: '', caption: 'Không gian Savoris Hoàn Kiếm' },
  { id: 5, order: 5, image_url: mamCom,   public_id: '', caption: 'Chi nhánh Tây Hồ' },
  { id: 6, order: 6, image_url: heroPho,  public_id: '', caption: 'Sân thượng Đà Nẵng' },
]

function cdnSlide(url: string)     { return url.includes('cloudinary.com') ? url.replace('/upload/', '/upload/f_auto,q_auto,w_1600/') : url }
function cdnThumb(url: string)     { return url.includes('cloudinary.com') ? url.replace('/upload/', '/upload/f_auto,q_auto,w_200/') : url }

interface Props { items?: SiteGalleryItem[] }

export function SiteGallery({ items }: Props) {
  const data = items && items.length > 0
    ? [...items].sort((a, b) => a.order - b.order)
    : SEED

  const [active, setActive]     = useState(0)
  const [paused, setPaused]     = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-advance every 5s
  useEffect(() => {
    if (paused) return
    timer.current = setInterval(() => {
      setActive((i) => (i + 1) % data.length)
    }, 5000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [paused, data.length])

  function go(dir: 1 | -1) {
    setActive((i) => (i + dir + data.length) % data.length)
    if (timer.current) { clearInterval(timer.current); timer.current = null }
  }

  // Keyboard for lightbox
  useEffect(() => {
    if (lightbox === null) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setLightbox((i) => ((i ?? 0) + 1) % data.length)
      if (e.key === 'ArrowLeft') setLightbox((i) => ((i ?? 0) - 1 + data.length) % data.length)
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, data.length])

  const cur = data[active]

  return (
    <section
      className="gal-wrap"
      aria-label="Thư viện ảnh"
      id="thu-vien"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Main slide */}
      <div className="gal-stage" onClick={() => setLightbox(active)}>
        {data.map((item, i) => (
          <img
            key={item.id}
            className={`gal-slide${i === active ? ' gal-slide--active' : ''}`}
            src={cdnSlide(item.image_url)}
            alt={item.caption ?? ''}
            loading={i === 0 ? 'eager' : 'lazy'}
            aria-hidden={i !== active}
          />
        ))}
        {/* Arrows */}
        <button className="gal-arrow gal-arrow--left" onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="Ảnh trước">
          <ChevronLeft size={28} />
        </button>
        <button className="gal-arrow gal-arrow--right" onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="Ảnh tiếp">
          <ChevronRight size={28} />
        </button>
        {/* Caption */}
        {cur.caption && <p className="gal-caption">{cur.caption}</p>}
      </div>

      {/* Thumbnail strip */}
      <div className="gal-thumbs" role="list" aria-label="Xem nhanh">
        {data.map((item, i) => (
          <button
            key={item.id}
            className={`gal-thumb${i === active ? ' gal-thumb--on' : ''}`}
            onClick={() => setActive(i)}
            role="listitem"
            aria-label={item.caption ?? `Ảnh ${i + 1}`}
            aria-pressed={i === active}
          >
            <img src={cdnThumb(item.image_url)} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && createPortal(
        <div className="gal-lb" role="dialog" aria-modal="true" aria-label="Xem ảnh lớn">
          <button className="gal-lb-close" onClick={() => setLightbox(null)} aria-label="Đóng"><X size={24} /></button>
          <button className="gal-lb-arrow gal-lb-arrow--left" onClick={() => setLightbox((i) => ((i ?? 0) - 1 + data.length) % data.length)} aria-label="Trước">
            <ChevronLeft size={32} />
          </button>
          <img className="gal-lb-img" src={cdnSlide(data[lightbox].image_url)} alt={data[lightbox].caption ?? ''} />
          <button className="gal-lb-arrow gal-lb-arrow--right" onClick={() => setLightbox((i) => ((i ?? 0) + 1) % data.length)} aria-label="Tiếp">
            <ChevronRight size={32} />
          </button>
          {data[lightbox].caption && <p className="gal-lb-caption">{data[lightbox].caption}</p>}
          <div className="gal-lb-bg" onClick={() => setLightbox(null)} />
        </div>,
        document.body
      )}
    </section>
  )
}
