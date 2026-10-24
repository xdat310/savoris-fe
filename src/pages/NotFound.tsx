import { Link, useLocation } from 'react-router-dom'

export function NotFound() {
  const { pathname } = useLocation()
  return <main className="venue-menu-page venue-not-found">
    <Link to="/" className="venue-brand">SAVORIS</Link>
    <span>404 · KHÔNG TÌM THẤY TRANG</span>
    <h1 aria-label="Trang này không tồn tại">Trang này<br />không tồn tại.</h1>
    <p>Đường dẫn <code>{pathname}</code> không có trên website.</p>
    <Link className="venue-button" to="/">Về trang chủ</Link>
  </main>
}
