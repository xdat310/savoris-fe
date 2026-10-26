import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export class PublicErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Public page rendering failed', error, info.componentStack)
  }

  render() {
    if (this.state.failed) return <main className="public-error-fallback" role="alert">
      <p>Savoris đang chuẩn bị trải nghiệm này.</p>
      <Link to="/">Quay về trang chủ</Link>
    </main>
    return this.props.children
  }
}
