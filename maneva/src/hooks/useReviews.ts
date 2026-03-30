/**
 * useReviews.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook de estado para las reseñas de una sede concreta.
 * Expone la lista de reseñas y la acción `create` para añadir una nueva,
 * inyectando automáticamente el `user_id` y `location_id`.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react'
import { getReviewsBySalon, createReview } from '@/services/reviews.service'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database.types'

type Review = Database['public']['Tables']['reviews']['Row']

export function useReviews(salonId: string) {
  const [data, setData] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const fetchReviews = useCallback(async () => {
    if (!salonId) return
    setLoading(true)
    setError(null)
    try {
      const result = await getReviewsBySalon(salonId)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar reseñas')
    } finally {
      setLoading(false)
    }
  }, [salonId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  /** Crea una reseña para el salón actual con el usuario autenticado */
  const create = async (payload: Omit<Database['public']['Tables']['reviews']['Insert'], 'user_id' | 'location_id'>) => {
    if (!user || !salonId) return
    setLoading(true)
    setError(null)
    try {
      await createReview({ ...payload, user_id: user.id, location_id: salonId })
      await fetchReviews()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear reseña'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refresh: fetchReviews, create }
}

