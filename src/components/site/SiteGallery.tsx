import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SiteGalleryItem } from '../../api/site'
import { cloudinaryDeliveryUrl } from '../../lib/cloudinary'

function imageKey(value: string): string {
  try {
    const url = new URL(value, window.location.origin)
    url.search = ''
    url.hash = ''
    const marker = '/image/upload/'
    const uploadAt = url.pathname.indexOf(marker)
    if (uploadAt >= 0) {
      const tail = url.pathname.slice(uploadAt + marker.length)
      const version = tail.match(/(?:^|\/)(v\d+\/.*)$/)
      return `${url.hostname}${marker}${version?.[1] ?? tail.split('/').at(-1)}`
    }
    return `${url.hostname}${url.pathname}`
  } catch {
    return value.split(/[?#]/)[0]
  }
}

export function uniqueGalleryItems(items?: SiteGalleryItem[], excludedUrls: string[] = []): SiteGalleryItem[] {
  const seen = new Set<string>()
  excludedUrls.forEach((url) => seen.add(imageKey(url)))
  return [...(items ?? [])]
    .filter((item) => item.image_url?.trim())
    .sort((a, b) => a.order - b.order)
    .filter((item) => {
      const key = imageKey(item.image_url.trim())
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function cdnGrid(url: string)  { return cloudinaryDeliveryUrl(url, 'f_auto,q_auto,w_800') }
function cdnFull(url: string)  { return cloudinaryDeliveryUrl(url, 'f_auto,q_auto,w_1600') }

interface Props { items?: SiteGalleryItem[]; excludedUrls?: string[] }

export function SiteGallery({ items, excludedUrls }: Props) {
  const data = uniqueGalleryItems(items, excludedUrls)

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

  if (data.length === 0) return null

  return (
    <section className="gal-wrap" id="thu-vien" aria-label="Thư viện ảnh">
      <header className="gal-heading">
        <h2>Hương vị Savoris</h2>
        <p>Mỗi món ăn là một lát cắt của căn bếp và những mùa nguyên liệu.</p>
      </header>
      <div className={`gal-grid${data.length >= 4 ? ' gal-grid--editorial' : ''}`}>
        {data.map((item, i) => (
          <button
            key={item.id}
            className="gal-cell"
            onClick={() => setLightbox(i)}
            aria-label={item.caption ?? `Ảnh ${i + 1}`}
          >
            <img src={cdnGrid(item.image_url)} alt={item.caption ?? ''} loading={i < 3 ? 'eager' : 'lazy'} />
            {item.caption && <><span className="gal-cell-overlay" aria-hidden="true" /><span className="gal-cell-cap">{item.caption}</span></>}
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
