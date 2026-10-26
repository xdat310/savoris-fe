import { Eye, EyeOff, LockKeyhole, LogIn, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useAuth } from '../auth'
import { ErrorNotice } from '../components/Feedback'
import { Icon } from '../components/ui/Icon'

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showForgotHelp, setShowForgotHelp] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) { setError('Nhập tên đăng nhập và mật khẩu'); return }
    setBusy(true); setError(null)
    try { await login(username.trim(), password) }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Không đăng nhập được'); setBusy(false) }
  }

  return (
    <div className="al">
      <div className="al-overlay" aria-hidden="true" />
      <main className="al-center">
        <div className="al-form-wrap">
          <div className="al-brand">
            <span className="al-brand-name">SAVORIS</span>
            <span className="al-brand-sub">Khu vực nhân viên</span>
          </div>

          <h1 className="al-form-title">Đăng nhập</h1>
          <p className="al-form-sub">Dùng tài khoản do quản lý cấp.</p>

          {error && <ErrorNotice message={error} />}

          <form onSubmit={submit} className="al-form" noValidate>
            <label className="al-field">
              <span>Tên đăng nhập</span>
              <div className="al-input-wrap">
                <Icon icon={UserRound} className="al-input-icon" />
                <input
                  className="al-input" autoComplete="username" placeholder="vd: quanly"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  required autoFocus spellCheck={false} autoCapitalize="none"
                />
              </div>
            </label>
            <label className="al-field">
              <span>Mật khẩu</span>
              <div className="al-input-wrap">
                <Icon icon={LockKeyhole} className="al-input-icon" />
                <input
                  className="al-input al-input--pw" type={showPw ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="al-pw-eye" onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPw}>
                  <Icon icon={showPw ? EyeOff : Eye} size={18} />
                </button>
              </div>
            </label>

            <button className="al-submit" disabled={busy} aria-busy={busy}>
              {busy ? <span className="spinner" aria-hidden="true" /> : <Icon icon={LogIn} size={20} />}
              {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>

          <div className="al-foot">
            <button type="button" className="al-forgot" onClick={() => setShowForgotHelp((visible) => !visible)}>Quên mật khẩu?</button>
            {showForgotHelp && <p role="status">Vui lòng liên hệ quản lý cơ sở của bạn để đặt lại mật khẩu.</p>}
          </div>
        </div>
      </main>
    </div>
  )
}
