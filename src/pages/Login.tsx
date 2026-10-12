import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useAuth } from '../auth'
import photo from '../assets/photos/mam-com.webp'
import { ErrorNotice } from '../components/Feedback'

// Starting accounts the backend creates on an empty database (one per role, shared password 12345)
const DEMO = [
  { username: 'admin', password: '12345', label: 'Chủ chuỗi' },
  { username: 'quanly', password: '12345', label: 'Quản lý' },
  { username: 'thungan', password: '12345', label: 'Thu ngân' },
  { username: 'phucvu', password: '12345', label: 'Phục vụ' },
  { username: 'daubep', password: '12345', label: 'Đầu bếp' },
  { username: 'kho', password: '12345', label: 'Kho' },
]

const QUICK_LOGIN = import.meta.env.DEV

const WEEKDAY = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' })
const DAY = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
const CLOCK = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function Login() {
  const { login } = useAuth()
  const now = useNow()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)

  async function signIn(user: string, pass: string, who: string) {
    setBusy(who)
    setError(null)
    try {
      await login(user.trim(), pass)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đăng nhập được')
      setBusy(null)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    signIn(username, password, 'form')
  }

  const weekday = WEEKDAY.format(now)
  const dayLabel = weekday.charAt(0).toUpperCase() + weekday.slice(1) + ', ' + DAY.format(now)

  return (
    <div className="login">
      <img className="login-photo" src={photo} alt="" />
      <div className="login-veil" aria-hidden="true" />

      <header className="login-header">
        <span className="login-wordmark">Dine<span>Chain</span></span>
      </header>

      <div className="login-stage">
        <div className="login-time-block">
          <span className="login-clock num">{CLOCK.format(now)}</span>
          <span className="login-day">{dayLabel}</span>
        </div>

        <section className="login-panel" aria-label="Đăng nhập">
          <form onSubmit={submit} className="login-fields">
            <div className="login-panel-head">
              <h1>Đăng nhập</h1>
              <p>Dùng tài khoản nhân viên do quản lý cấp.</p>
            </div>
            {error && <ErrorNotice message={error} />}
            <label className="login-field">
              <span>Tên đăng nhập</span>
              <input className="login-input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
            </label>
            <label className="login-field">
              <span>Mật khẩu</span>
              <div className="login-pw-wrap">
                <input className="login-input" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="login-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <button className="login-submit" disabled={busy !== null}>
              {busy === 'form' ? <span className="spinner" aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
              Vào ca
            </button>
          </form>

          {QUICK_LOGIN && (
            <div className="quick-login">
              <h3>Vào nhanh <span>tài khoản ban đầu · mật khẩu 12345</span></h3>
              <div className="quick-grid">
                {DEMO.map((d) => (
                  <button key={d.username} type="button" className="quick-role" disabled={busy !== null}
                    onClick={() => signIn(d.username, d.password, d.username)}>
                    <span className="quick-label">{d.label}</span>
                    <span className="quick-user">{busy === d.username ? <span className="spinner" aria-hidden="true" /> : d.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
