import { useState, useEffect } from 'react'
import { useSalonsWithRating } from '@/hooks/useSalons'
import { useLocation } from '@/hooks/useLocation'
import { calculateDistance, formatDistance } from '@/lib/location.utils'
import type { UnifiedSalon } from '@/services/salons.service'

type SalonWithRating = UnifiedSalon & { avgRating: number | null }

export type SalonWithDistance = SalonWithRating & {
  distance: string
  distanceKm: number
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
      const enhanced: SalonWithDistance[] = salonsData.map((salon) => {
        const distanceKm = calculateDistance(
          userCoords.latitude,
          userCoords.longitude,
          salon.latitude ?? 0,
          salon.longitude ?? 0,
        )
        return { ...salon, distance: formatDistance(distanceKm), distanceKm }
      })
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
