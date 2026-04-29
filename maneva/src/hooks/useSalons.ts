/**
 * useSalons.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hooks de estado para la carga de salones/sedes.
 * - `useSalons()` → lista completa de sedes activas (Home, Buscar)
 * - `useSalon(id)` → detalle de una sede concreta (próxima pantalla de detalle)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react'
import {
  getSalons,
  getSalonById,
  getFavoriteSalon,
  getSalonsWithRating,
  isFavoriteSalon,
  addFavoriteSalon,
  removeFavoriteSalon,
  UnifiedSalon,
  FavoriteSalonInfo,
  type SalonDetail,
} from '@/services/salons.service'
import { useAuthStore } from '@/store/authStore'

/** Hook principal — devuelve todas las sedes activas con refresh */
export function useSalons() {
  const [data, setData] = useState<UnifiedSalon[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSalons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getSalons()
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar salones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSalons()
  }, [fetchSalons])

  return { data, loading, error, refresh: fetchSalons }
}

/** Hook para la búsqueda — devuelve sedes activas con rating y precio medio */
export function useSalonsWithRating() {
  const [data, setData] = useState<(UnifiedSalon & { avgRating: number | null; avgPrice: number | null })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSalons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getSalonsWithRating()
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar salones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSalons()
  }, [fetchSalons])

  return { data, loading, error, refresh: fetchSalons }
}

/** Hook de detalle — devuelve una sede por ID */
export function useSalon(id: string) {
  const [data, setData] = useState<SalonDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSalon = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const result = await getSalonById(id)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar salón')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSalon()
  }, [fetchSalon])

  return { data, loading, error, refresh: fetchSalon }
}

/**
 * Devuelve el salón favorito del usuario autenticado.
 * Usado en la sección "TU SALÓN" de la HomeScreen.
 */
export function useFavoriteSalon() {
  const [data, setData] = useState<FavoriteSalonInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const result = await getFavoriteSalon(user.id)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar salón favorito')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refresh: fetch }
}

/**
 * Estado de favorito para una sede concreta y acción de toggle.
 */
export function useSalonFavorite(locationId: string) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const refresh = useCallback(async () => {
    if (!user || !locationId) {
      setIsFavorite(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await isFavoriteSalon(user.id, locationId)
      setIsFavorite(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar favorito')
    } finally {
      setLoading(false)
    }
  }, [locationId, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const toggle = useCallback(async () => {
    if (!user || !locationId) return

    setLoading(true)
    setError(null)
    try {
      if (isFavorite) {
        await removeFavoriteSalon(user.id, locationId)
        setIsFavorite(false)
      } else {
        await addFavoriteSalon(user.id, locationId)
        setIsFavorite(true)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar favorito')
    } finally {
      setLoading(false)
    }
  }, [isFavorite, locationId, user])

  return { isFavorite, loading, error, refresh, toggle }
}
