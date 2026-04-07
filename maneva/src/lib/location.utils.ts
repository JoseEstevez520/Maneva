/**
 * location.utils.ts
 * ────────────────────────────────────────────────────────────────
 * Utilidades para geolocalización y cálculo de distancias.
 * ────────────────────────────────────────────────────────────────
 */

export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Calcula la distancia en km entre dos puntos usando la fórmula de Haversine.
 * @param lat1, lon1 - Coordenadas del punto 1
 * @param lat2, lon2 - Coordenadas del punto 2
 * @returns Distancia en km
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Formatea distancia a string legible.
 * @example 2.3 → "2.3 km", 0.5 → "500 m"
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}