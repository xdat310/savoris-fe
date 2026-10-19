import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import beefWine     from '../../assets/photos/beef-steak-wine.webp'
import slicedSteak  from '../../assets/photos/sliced-steak.webp'
import steakPlate   from '../../assets/photos/steak-plate.webp'
import steakCloseup from '../../assets/photos/steak-closeup.webp'
import gourmet      from '../../assets/photos/gourmet-dishes.webp'
import interior     from '../../assets/photos/restaurant-interior.webp'
import fineDining   from '../../assets/photos/fine-dining-tokyo.webp'
import type { SiteGalleryItem } from '../../api/site'

const SEED: SiteGalleryItem[] = [
  { id: 1, order: 1, image_url: beefWine,     public_id: '', caption: 'Bò Wagyu A5 — Sốt rượu vang đỏ Bordeaux' },
  { id: 2, order: 2, image_url: steakCloseup, public_id: '', caption: 'Bít tết thăn ngoại — Sốt truffle đen Périgord' },
  { id: 3, order: 3, image_url: gourmet,      public_id: '', caption: 'Thực đơn Degustación 8 món — Chef\'s Table' },
  { id: 4, order: 4, image_url: interior,     public_id: '', caption: 'Không gian Savoris Hoàn Kiếm — Tầng 5' },
  { id: 5, order: 5, image_url: fineDining,   public_id: '', caption: 'Khai vị đặc trưng — Savoris Tây Hồ' },
  { id: 6, order: 6, image_url: slicedSteak,  public_id: '', caption: 'Sliced Wagyu — Sân thượng Đà Nẵng' },
  { id: 7, order: 7, image_url: steakPlate,   public_id: '', caption: 'Bò bít tết thăn lưng — Sốt béarnaise' },
]

function cdnGrid(url: string)  { return url.includes('cloudinary.com') ? url.replace('/upload/', '/upload/f_auto,q_auto,w_800/') : url }
function cdnFull(url: string)  { return url.includes('cloudinary.com') ? url.replace('/upload/', '/upload/f_auto,q_auto,w_1600/') : url }

interface Props { items?: SiteGalleryItem[] }

export function SiteGallery({ items }: Props) {
  const data = items && items.length > 0
    ? [...items].sort((a, b) => a.order - b.order)
    : SEED

  const [lightbox, setLightbox] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (lightbox === null) return
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [lightbox !== null])

  useEffect(() => {
    if (lightbox === null) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setLightbox((i) => ((i ?? 0) + 1) % data.length)
      if (e.key === 'ArrowLeft')  setLightbox((i) => ((i ?? 0) - 1 + data.length) % data.length)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, data.length])

  return (
    <section className="gal-wrap" id="thu-vien" aria-label="Thư viện ảnh">
      <div className="gal-list">
        {data.map((item, i) => (
          <button
            key={item.id}
            className="gal-item"
            onClick={() => setLightbox(i)}
            aria-label={item.caption ?? `Ảnh ${i + 1}`}
          >
            <img src={cdnGrid(item.image_url)} alt={item.caption ?? ''} loading={i < 3 ? 'eager' : 'lazy'} />
          </button>
        ))}
      </div>

      {lightbox !== null && createPortal(
        <dialog
          ref={dialogRef}
          className="gal-lb"
          aria-label="Xem ảnh lớn"
          onClose={() => setLightbox(null)}
          onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}
        >
          <button className="gal-lb-close" onClick={() => dialogRef.current?.close()} aria-label="Đóng">
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
        </dialog>,
        document.body
      )}
    </section>
  )
}
