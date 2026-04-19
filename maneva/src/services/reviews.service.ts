/**
 * reviews.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Capa de acceso a datos para la tabla `reviews`.
 * Las reseñas se asocian a `location_id` (sede concreta) y `user_id` (cliente).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Review = Database['public']['Tables']['reviews']['Row']
type ReviewInsert = Database['public']['Tables']['reviews']['Insert']

/**
 * Devuelve todas las reseñas de una sede, incluyendo el nombre del autor.
 * Ordenadas por fecha de creación descendente (más recientes primero).
 */
export async function getReviewsBySalon(locationId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      users (
        first_name,
        last_name
      )
    `)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Crea una nueva reseña. El `user_id` y `location_id` se inyectan
 * desde el hook — nunca desde el componente directamente.
 */
export async function createReview(payload: ReviewInsert): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

