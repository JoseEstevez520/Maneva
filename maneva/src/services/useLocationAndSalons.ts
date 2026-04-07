/**
 * useLocationAndSalons.ts
 * ───────────────────���────────────────────────────────────────────
 * Hook combinado para obtener ubicación y salones filtrados.
 * ────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react'
import { useSalonsWithRating } from './useSalons'
import { useLocation } from './useLocation'
import { calculateDistance, formatDistance } from '@/lib/location.utils'

interface SalonWithDistance {
  id: string
  name: string
  distance: string
  distanceKm: number
  rating: number | null
  address: string
  [key: string]: any
}

interface UseLocationAndSalonsReturn {
  salons: SalonWithDistance[]
  loading: boolean
  error: string | null
  userLocation: { latitude: number; longitude: number } | null
}

export function useLocationAndSalons(): UseLocationAndSalonsReturn {
  const { data: salonsData, loading: salonsLoading, error: salonsError } = useSalonsWithRating()
  const { coords: userCoords, loading: locationLoading, error: locationError } = useLocation()
  const [salonsWithDistance, setSalonsWithDistance] = useState<SalonWithDistance[]>([])

  useEffect(() => {
    if (userCoords && salonsData.length > 0) {
      const enhanced = salonsData.map((salon) => {
        const distanceKm = calculateDistance(
          userCoords.latitude,
          userCoords.longitude,
          salon.latitude || 0,
          salon.longitude || 0
        )

        return {
          ...salon,
          distance: formatDistance(distanceKm),
          distanceKm,
        }
      })

      // Ordenar por distancia
      enhanced.sort((a, b) => a.distanceKm - b.distanceKm)
      setSalonsWithDistance(enhanced)
    }
  }, [userCoords, salonsData])

  return {
    salons: salonsWithDistance,
    loading: salonsLoading || locationLoading,
    error: salonsError || locationError,
    userLocation: userCoords,
  }
}