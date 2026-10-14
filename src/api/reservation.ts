import { get, post } from './client'

export interface SlotAvailability {
  slotTime: string          // ISO datetime
  bookedGuests: number
  maxCapacity: number
  available: boolean
  suggestedAlternative: string | null
}

export interface GuestReservationPayload {
  branchId: number
  guestName: string
  guestPhone: string
  reservationDate: string   // ISO datetime
  numberOfGuests: number
  notes?: string
}

export interface GuestReservationResult {
  id: number
  branchId: number
  reservationDate: string
  numberOfGuests: number
  status: string
}

export const getSlots = (branchId: number, date: string) =>
  get<SlotAvailability[]>(`/reservations/guest/slots?branchId=${branchId}&date=${date}`)

export const createGuestReservation = (body: GuestReservationPayload) =>
  post<GuestReservationResult>('/reservations/guest', body)
