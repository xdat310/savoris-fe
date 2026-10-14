const vnd = new Intl.NumberFormat('vi-VN')

// 125000 -> "125.000đ"
export function money(value: number | undefined | null) {
  return `${vnd.format(Math.round(value ?? 0))}đ`
}

export function number(value: number | undefined | null, digits = 0) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value ?? 0)
}

export function time(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function dateTime(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
}

// Local yyyy-MM-dd (toISOString would shift to UTC)
export function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Chủ chuỗi',
  BRANCH_MANAGER: 'Quản lý chi nhánh',
  CASHIER: 'Thu ngân',
  WAITER: 'Phục vụ',
  CHEF: 'Đầu bếp',
  WAREHOUSE: 'Kho',
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
