// Constantes globales de la aplicación Maneva
// Si una constante cambia, solo se toca este fichero.

export const BOOKING_SLOT_DURATION = 30 // minutos

export const MAX_PHOTOS_PER_SALON = 10

export const SERVICE_CATEGORIES = [
  'cut',
  'color',
  'beard',
  'treatment',
] as const

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'cancelled',
  'done',
] as const

export const USER_ROLES = [
  'client',
  'owner',
  'stylist',
] as const

export type ServiceCategory = typeof SERVICE_CATEGORIES[number]
export type BookingStatus = typeof BOOKING_STATUSES[number]
export type UserRole = typeof USER_ROLES[number]
