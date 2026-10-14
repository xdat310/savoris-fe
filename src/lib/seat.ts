// The table this phone last scanned, so the home page can send the guest straight back to it.
// Forgotten after a few hours: the next guest on a shared phone or the next visit starts clean.
const KEY = 'savoris.seat'
const LEGACY_KEY = 'dinechain.seat'
const TTL = 4 * 60 * 60 * 1000

export interface Seat { token: string; tableName: string; areaName: string; branchName: string; at: number }

export function rememberSeat(seat: Omit<Seat, 'at'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...seat, at: Date.now() }))
  } catch {
    // storage blocked: the QR link still works, the home page just won't remember
  }
}

export function lastSeat(): Seat | null {
  try {
    const seat = JSON.parse(localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY) ?? 'null') as Seat | null
    if (seat && !localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(seat))
    if (seat) localStorage.removeItem(LEGACY_KEY)
    return seat && Date.now() - seat.at < TTL ? seat : null
  } catch {
    return null
  }
}

export function forgetSeat() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing remembered
  }
}

// Accepts the full link printed in a table QR (any host: Wi-Fi IP, ngrok…) and returns its table token
export function tokenFromQr(text: string): string | null {
  const match = text.trim().match(/\/goi-mon\/([A-Za-z0-9]+)/)
  return match ? match[1] : null
}

// The last takeaway this phone ordered, so the home page can link back to its tracking page
const TAKEAWAY_KEY = 'savoris.takeaway'
const LEGACY_TAKEAWAY_KEY = 'dinechain.takeaway'

export interface TakeawayRef { token: string; code: string; branchName: string; at: number }

export function rememberTakeaway(ref: Omit<TakeawayRef, 'at'>) {
  try {
    localStorage.setItem(TAKEAWAY_KEY, JSON.stringify({ ...ref, at: Date.now() }))
  } catch {
    // storage blocked: the tracking link still works while the page is open
  }
}

export function lastTakeaway(): TakeawayRef | null {
  try {
    const ref = JSON.parse(localStorage.getItem(TAKEAWAY_KEY) ?? localStorage.getItem(LEGACY_TAKEAWAY_KEY) ?? 'null') as TakeawayRef | null
    if (ref && !localStorage.getItem(TAKEAWAY_KEY)) localStorage.setItem(TAKEAWAY_KEY, JSON.stringify(ref))
    if (ref) localStorage.removeItem(LEGACY_TAKEAWAY_KEY)
    return ref && Date.now() - ref.at < TTL ? ref : null
  } catch {
    return null
  }
}
