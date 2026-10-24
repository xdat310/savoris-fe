import { Link } from 'react-router-dom'
import type { SiteFooter as FooterData } from '../../api/site'

const YEAR = new Date().getFullYear()

// SVG social icons (inline, no extra dep)
function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}
function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.1" strokeWidth="3" />
    </svg>
  )
}
function IconTiktok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.53V6.75a4.85 4.85 0 0 1-1.01-.06z" />
    </svg>
  )
}

interface Props {
  config?: FooterData | null
  menuHref?: string
  onScrollTo?: (id: string) => void
}

export function SiteFooter({ config, menuHref = '/chi-nhanh/cn1/thuc-don' }: Props) {
  const year = YEAR

  return (
    <footer className="ftr-wrap" aria-label="Footer">
      <div className="ftr-inner">
        {/* Link columns */}
        <nav className="ftr-col" aria-label="Đặt món">
          <h4>ĐẶT MÓN</h4>
          <Link to="/dat-ban">Đặt bàn</Link>
          <a href={menuHref}>Xem thực đơn</a>
          <Link to="/mang-ve">Đặt mang về</Link>
        </nav>

        <nav className="ftr-col" aria-label="Khám phá">
          <h4>KHÁM PHÁ</h4>
          <a href="#ve-chung-toi">Về chúng tôi</a>
          <a href="#lien-he">Chi nhánh</a>
        </nav>

        <nav className="ftr-col" aria-label="Dịch vụ">
          <h4>DỊCH VỤ</h4>
<a href="mailto:careers@savoris.vn">Tuyển dụng</a>
          <a href="mailto:info@savoris.vn">Liên hệ hợp tác</a>
        </nav>

        {/* Social */}
        <div className="ftr-social">
          <h4>KẾT NỐI</h4>
          <div className="ftr-social-links">
            {config?.facebook_url && (
              <a href={config.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <IconFacebook />
              </a>
            )}
            {config?.instagram_url && (
              <a href={config.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <IconInstagram />
              </a>
            )}
            {config?.tiktok_url && (
              <a href={config.tiktok_url} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <IconTiktok />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="ftr-bottom">
        <small>© {year} Savoris · {config?.copyright ?? 'Ẩm thực Việt đương đại'}</small>
      </div>
    </footer>
  )
}
