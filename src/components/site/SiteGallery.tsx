import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
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

function cdnGrid(url: string)  { return url.includes('cloudinary.com') ? url.replace('/upload/', '/upload/f_auto,q_auto,w_800/') : url }
function cdnFull(url: string)  { return url.includes('cloudinary.com') ? url.replace('/upload/', '/upload/f_auto,q_auto,w_1600/') : url }

interface Props { items?: SiteGalleryItem[] }

export function SiteGallery({ items }: Props) {
  const data = items && items.length > 0
    ? [...items].sort((a, b) => a.order - b.order)
    : SEED

  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    if (lightbox === null) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setLightbox((i) => ((i ?? 0) + 1) % data.length)
      if (e.key === 'ArrowLeft')  setLightbox((i) => ((i ?? 0) - 1 + data.length) % data.length)
      if (e.key === 'Escape')     setLightbox(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, data.length])

  return (
    <section className="gal-wrap" id="thu-vien" aria-label="Thư viện ảnh">
      <div className="gal-grid">
        {data.map((item, i) => (
          <button
            key={item.id}
            className="gal-cell"
            onClick={() => setLightbox(i)}
            aria-label={item.caption ?? `Ảnh ${i + 1}`}
          >
            <img
              src={cdnGrid(item.image_url)}
              alt=""
              loading={i < 3 ? 'eager' : 'lazy'}
            />
            {item.caption && (
              <span className="gal-cell-cap" aria-hidden="true">{item.caption}</span>
            )}
          </button>
        ))}
      </div>

      {lightbox !== null && createPortal(
        <div className="gal-lb" role="dialog" aria-modal="true" aria-label="Xem ảnh lớn">
          <button className="gal-lb-close" onClick={() => setLightbox(null)} aria-label="Đóng">
            <X size={20} />
          </button>
          <button
            className="gal-lb-arrow gal-lb-arrow--left"
            onClick={() => setLightbox((i) => ((i ?? 0) - 1 + data.length) % data.length)}
            aria-label="Trước"
          >
            <ChevronLeft size={28} />
          </button>
          <img
            className="gal-lb-img"
            src={cdnFull(data[lightbox].image_url)}
            alt={data[lightbox].caption ?? ''}
          />
          <button
            className="gal-lb-arrow gal-lb-arrow--right"
            onClick={() => setLightbox((i) => ((i ?? 0) + 1) % data.length)}
            aria-label="Tiếp"
          >
            <ChevronRight size={28} />
          </button>
          {data[lightbox].caption && (
            <p className="gal-lb-caption">{data[lightbox].caption}</p>
          )}
          <div className="gal-lb-bg" onClick={() => setLightbox(null)} />
        </div>,
        document.body
      )}
    </section>
  )
}
