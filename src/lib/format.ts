// One place for every number, money, date and phone shown in the app (Vietnamese conventions).
const vnd = new Intl.NumberFormat('vi-VN')

/** Shown wherever a value is missing; render it with the `.empty-val` class so it is dimmed. */
export const EMPTY = '—'

// 1250000 -> "1.250.000 ₫"
export function money(value: number | undefined | null) {
  return `${vnd.format(Math.round(value ?? 0))} ₫`
}

// 35000 -> "35.000 ₫/giờ"; missing -> "—"
export function hourly(value: number | undefined | null) {
  return value == null ? EMPTY : `${money(value)}/giờ`
}

// 12.5 -> "12,5"
export function number(value: number | undefined | null, digits = 0) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value ?? 0)
}

// (12.5, "kg") -> "12,5 kg"
export function quantity(value: number | undefined | null, unit?: string, digits = 2) {
  const n = number(value, digits)
  return unit ? `${n} ${unit}` : n
}

// 1250000 -> "1,3 tr" ; 950000 -> "950 N" — chart axes and tight tiles only
export function compactMoney(value: number | undefined | null) {
  const v = value ?? 0
  if (Math.abs(v) >= 1_000_000_000) return `${number(v / 1_000_000_000, 1)} tỷ`
  if (Math.abs(v) >= 1_000_000) return `${number(v / 1_000_000, 1)} tr`
  if (Math.abs(v) >= 1_000) return `${number(v / 1_000, 0)} N`
  return number(v)
}

const pad = (n: number) => String(n).padStart(2, '0')
function toDate(value?: string | number | Date | null) {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

// -> "19:07" (24h)
export function time(value?: string | number | Date | null) {
  const d = toDate(value)
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : ''
}

// -> "16/10/2026"
export function date(value?: string | number | Date | null) {
  const d = toDate(value)
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : ''
}

// -> "16/10/2026 · 19:07"
export function dateTime(value?: string | number | Date | null) {
  const d = toDate(value)
  return d ? `${date(d)} · ${time(d)}` : ''
}

// "0912345678" -> "0912 345 678"; "+84912345678" -> "+84 912 345 678"; empty -> "—"
export function phone(value?: string | null) {
  if (!value) return EMPTY
  const digits = value.replace(/[^\d+]/g, '')
  if (/^0\d{9}$/.test(digits)) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  if (/^\+84\d{9}$/.test(digits)) return `+84 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
  return value
}

// Local yyyy-MM-dd (toISOString would shift to UTC)
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Chủ chuỗi',
  MANAGER: 'Quản lý chi nhánh',
  STAFF: 'Nhân viên phục vụ / Thu ngân',
  CHEF: 'Đầu bếp',
}

/** Badge colour per role, used by <RoleBadge>. */
export const ROLE_TONE: Record<string, 'accent' | 'info' | 'warning' | 'success' | 'violet' | 'neutral'> = {
  ADMIN: 'accent',
  BRANCH_MANAGER: 'accent',
  CASHIER: 'info',
  CHEF: 'warning',
  WAITER: 'success',
  WAREHOUSE: 'violet',
}

export const ORDER_TYPE_LABEL: Record<string, string> = {
  DINE_IN: 'Tại bàn',
  TAKEAWAY: 'Mang đi',
  DELIVERY: 'Giao hàng',
}

export const ITEM_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ bếp',
  COOKING: 'Đang nấu',
  VOID_REQUESTED: 'Yêu cầu huỷ',
  READY: 'Xong, chờ bưng',
  SERVED: 'Đã bưng',
  CANCELLED: 'Đã huỷ',
}
