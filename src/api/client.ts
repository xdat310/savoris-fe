import type { AuthResponse, ErrorResponse, StaffResponse } from './types'

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'
export interface Session {
  staff: StaffResponse
  accessToken?: string
  refreshToken?: string
}

// Vietnamese wording for the error codes staff meet most; anything else shows the server's message
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Sai tên đăng nhập hoặc mật khẩu',
  TOO_MANY_LOGIN_ATTEMPTS: 'Sai quá nhiều lần, thử lại sau 15 phút',
  ACCOUNT_RESIGNED: 'Tài khoản đã nghỉ việc',
  FORBIDDEN: 'Bạn không có quyền làm việc này',
  BRANCH_BUSY: 'Bếp đang quá tải: tạm ngưng nhận đơn mang đi / giao hàng',
  MENU_ITEM_UNAVAILABLE: 'Món này đang hết hoặc không bán ở chi nhánh',
  INSUFFICIENT_CASH: 'Khách đưa chưa đủ tiền',
  ALREADY_PAID: 'Đơn đã thanh toán',
  ORDER_NOT_PAID: 'Đơn chưa thanh toán',
  NOT_ENOUGH_POINTS: 'Khách không đủ điểm',
  PROMOTION_NOT_APPLICABLE: 'Mã khuyến mãi không dùng được cho đơn này',
  PAYMENT_METHOD_NOT_SUPPORTED: 'Phương thức thanh toán này chưa được hỗ trợ cho đơn hàng',
  DUPLICATE_TABLE_NAME: 'Chi nhánh đã có bàn tên này, đặt tên khác',
}

export class ApiError extends Error {
  status: number
  code?: string
  detail?: string

  constructor(status: number, body?: ErrorResponse) {
    const code = body?.code
    const fieldErrors = body?.errors?.map((e) => e.message).filter(Boolean).join('; ')
    super((code && MESSAGES[code]) || fieldErrors || body?.message || `Lỗi ${status}`)
    this.status = status
    this.code = code
    this.detail = body?.message
  }
}

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem('savoris.staff')
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    return s?.staff?.id ? s : null
  } catch {
    return null
  }
}

export function saveSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem('savoris.staff', JSON.stringify(session))
    else sessionStorage.removeItem('savoris.staff')
  } catch {
    // private mode: the session simply lives in memory
  }
  current = session
  listeners.forEach((l) => l(session))
}

export function sessionFromAuth(payload: AuthResponse | StaffResponse, previous?: Session): Session | null {
  const response = payload as AuthResponse & StaffResponse
  const staff = response.staff ?? (response.id ? response as StaffResponse : previous?.staff)
  if (!staff?.id) return null
  return {
    staff,
    accessToken: response.accessToken ?? previous?.accessToken,
    refreshToken: response.refreshToken ?? previous?.refreshToken,
  }
}

let current: Session | null = loadSession()
const listeners = new Set<(s: Session | null) => void>()
export function onSessionChange(listener: (s: Session | null) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function getSession() {
  return current
}

let refreshing: Promise<boolean> | null = null

// Access tokens last an hour; on a 401 try the refresh token once before giving up
async function refresh(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const rt = current?.refreshToken
      if (!rt) return false
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })
      if (!res.ok) return false
      const payload = (await res.json()) as AuthResponse | StaffResponse
      const session = sessionFromAuth(payload, current ?? undefined)
      if (!session) return false
      saveSession(session)
      return true
    } catch {
      return false
    } finally {
      setTimeout(() => (refreshing = null), 0)
    }
  })()
  return refreshing
}

export async function api<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const headers: Record<string, string> = {}
  const form = body instanceof FormData
  if (body !== undefined && !form) headers['Content-Type'] = 'application/json'
  const token = current?.accessToken
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, credentials: 'include', cache: 'no-store', body: body === undefined ? undefined : form ? body : JSON.stringify(body) })
  } catch {
    throw new ApiError(0, { code: 'NETWORK', message: 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.' })
  }

  if (res.status === 401 && retry && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    if (await refresh()) return api<T>(method, path, body, false)
    saveSession(null)
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => undefined)) as ErrorResponse | undefined
    throw new ApiError(res.status, data)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const get = <T,>(path: string) => api<T>('GET', path)
export const post = <T,>(path: string, body?: unknown) => api<T>('POST', path, body ?? {})
export const put = <T,>(path: string, body?: unknown) => api<T>('PUT', path, body)
export const del = <T,>(path: string) => api<T>('DELETE', path)
export function upload<T>(path: string, file: File, method = 'PUT') {
  const form = new FormData()
  form.append('file', file)
  return api<T>(method, path, form)
}
