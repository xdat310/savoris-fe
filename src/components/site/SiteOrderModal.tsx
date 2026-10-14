import { QrCode, ShoppingBag, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  open: boolean
  onClose: () => void
}

export function SiteOrderModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Trap focus / prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      ref.current?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="ord-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Chọn hình thức đặt món"
      tabIndex={-1}
      ref={ref}
    >
      {/* Backdrop */}
      <div className="ord-bg" onClick={onClose} />

      <div className="ord-sheet">
        <button className="ord-close" onClick={onClose} aria-label="Đóng">
          <X size={20} />
        </button>

        <p className="ord-eyebrow">THỰC ĐƠN</p>
        <h2 className="ord-heading">Bạn muốn thưởng thức<br />theo hình thức nào?</h2>

        <div className="ord-cards">
          {/* Dine-in card */}
          <button
            className="ord-card"
            onClick={() => {
              onClose()
              // QR scan → user scans table QR at the restaurant
              // For now, navigate to a menu placeholder
              navigate('/menu')
            }}
          >
            <div className="ord-card-icon">
              <QrCode size={36} strokeWidth={1.25} />
            </div>
            <strong className="ord-card-title">Ăn tại đây</strong>
            <p className="ord-card-desc">Quét mã QR tại bàn để gọi món trực tiếp — không cần chờ phục vụ.</p>
            <span className="ord-card-tag">QR · Tức thì</span>
          </button>

          {/* Takeaway card */}
          <button
            className="ord-card"
            onClick={() => {
              onClose()
              navigate('/mang-ve')
            }}
          >
            <div className="ord-card-icon">
              <ShoppingBag size={36} strokeWidth={1.25} />
            </div>
            <strong className="ord-card-title">Mang về</strong>
            <p className="ord-card-desc">Đặt trước, đến lấy hoặc giao tận nơi. Thanh toán online nhanh chóng.</p>
            <span className="ord-card-tag">Online · Giao hàng</span>
          </button>
        </div>
      </div>
    </div>
  )
}
