import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useAuth } from '../auth'
import { ErrorNotice } from '../components/Feedback'

const DEMO = [
  { username: 'admin',   password: '12345', label: 'Quản trị viên' },
  { username: 'quanly',  password: '12345', label: 'Quản lý' },
  { username: 'thungan', password: '12345', label: 'Thu ngân' },
  { username: 'phucvu',  password: '12345', label: 'Phục vụ' },
  { username: 'daubep',  password: '12345', label: 'Đầu bếp' },
  { username: 'kho',     password: '12345', label: 'Kho' },
]

const DEV = import.meta.env.DEV

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [busy, setBusy]     = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)

  async function signIn(user: string, pass: string, who: string) {
    setBusy(who); setError(null)
    try { await login(user.trim(), pass) }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Không đăng nhập được'); setBusy(null) }
  }

  function submit(e: FormEvent) { e.preventDefault(); signIn(username, password, 'form') }

  return (
    <div className="al">
      {/* ── Left hero panel ── */}
      <div className="al-left" aria-hidden="true">
        <div className="al-lattice" />
        <div className="al-left-body">
          <p className="al-eyebrow">HỆ THỐNG QUẢN LÝ CHUỖI</p>
          <h1 className="al-headline">
            Tinh tế.<br />Đồng bộ.<br />Không<br />gián đoạn.
          </h1>
          <p className="al-mark">Dine<span>Chain</span></p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="al-right">
        <div className="al-form-wrap">
          <h2 className="al-form-title">Đăng nhập</h2>
          <p className="al-form-sub">Tài khoản nhân viên do quản lý cấp.</p>

          {error && <ErrorNotice message={error} />}

          <form onSubmit={submit} className="al-form" noValidate>
            <label className="al-field">
              <span>Tên đăng nhập</span>
              <input
                className="al-input" autoComplete="username"
                value={username} onChange={(e) => setUsername(e.target.value)}
                required autoFocus
              />
            </label>
            <label className="al-field">
              <span>Mật khẩu</span>
              <div className="al-pw-wrap">
                <input
                  className="al-input" type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="al-pw-eye" onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </label>

            <button type="button" className="al-forgot">Quên mật khẩu?</button>

            <button className="al-submit" disabled={busy !== null}>
              {busy === 'form' ? <span className="spinner" aria-hidden="true" /> : 'ĐĂNG NHẬP'}
            </button>
          </form>

          {DEV && (
            <div className="al-quick">
              <p className="al-quick-label">Vào nhanh <span>· mật khẩu 12345</span></p>
              <div className="al-quick-grid">
                {DEMO.map((d) => (
                  <button key={d.username} className="al-quick-card" disabled={busy !== null}
                    onClick={() => signIn(d.username, d.password, d.username)}>
                    <span className="al-quick-role">{d.label}</span>
                    <span className="al-quick-user">
                      {busy === d.username ? <span className="spinner" aria-hidden="true" /> : d.username}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
