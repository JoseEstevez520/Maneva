/**
 * useLocation.ts
 * ────────────────────────────────────────────────────────────────
 * Hook para obtener la ubicación del usuario.
 * ────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react'
import * as Location from 'expo-location'
import { Coordinates } from '@/lib/location.utils'

interface UseLocationReturn {
  coords: Coordinates | null
  loading: boolean
  error: string | null
  retry: () => void
}

export function useLocation(): UseLocationReturn {
  const [coords, setCoords] = useState<Coordinates | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLocation = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Solicitar permisos
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado')
        setCoords({
          latitude: 40.4168, // Madrid por defecto
          longitude: -3.7038,
        })
        setLoading(false)
        return
      }

      // Obtener ubicación
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al obtener ubicación')
      // Fallback a Madrid
      setCoords({
        latitude: 40.4168,
        longitude: -3.7038,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLocation()
  }, [fetchLocation])

  return { coords, loading, error, retry: fetchLocation }
}