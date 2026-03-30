/**
 * salons.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Capa de acceso a datos para salones y sus ubicaciones (`salon_locations`).
 * La entidad principal de la app es `salon_locations` (una sede concreta),
 * enriquecida con datos de su `salon` padre.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type SalonLocation = Database['public']['Tables']['salon_locations']['Row']
type Salon = Database['public']['Tables']['salons']['Row']

/**
 * Tipo unificado para la UI — combina la sede con los datos básicos del salón padre.
 * Se usa en SalonCard y pantallas de búsqueda/detalle.
 */
export type UnifiedSalon = SalonLocation & {
  salons: Pick<Salon, 'name' | 'description'> | null
}

/** Tipo para el salón favorito: incluye rating promedio calculado del cliente */
export type FavoriteSalonInfo = UnifiedSalon & {
  avgRating: number | null
}

/**
 * Devuelve todas las sedes activas con sus datos de salón y rating promedio.
 * Usado en la pantalla de búsqueda.
 */
export async function getSalonsWithRating(): Promise<(UnifiedSalon & { avgRating: number | null })[]> {
  const { data, error } = await supabase
    .from('salon_locations')
    .select(`
      *,
      salons (
        name,
        description
      ),
      reviews (
        rating
      )
    `)
    .eq('active', true)

  if (error) throw error

  type SalonWithReviews = UnifiedSalon & { reviews: { rating: number }[] | null }

  return (data as SalonWithReviews[]).map((loc) => {
    const reviews = loc.reviews ?? []
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null
    return { ...loc, avgRating }
  })
}

/**
 * Devuelve todas las sedes activas con sus datos de salón.
 * Usado por la pantalla Home y Buscar.
 */
export async function getSalons(): Promise<UnifiedSalon[]> {
  const { data, error } = await supabase
    .from('salon_locations')
    .select(`
      *,
      salons (
        name,
        description
      )
    `)
    .eq('active', true)

  if (error) throw error
  return data as UnifiedSalon[]
}

/**
 * Devuelve una sede concreta por su ID.
 * Usado en la pantalla de detalle de salón.
 */
export async function getSalonById(id: string): Promise<UnifiedSalon> {
  const { data, error } = await supabase
    .from('salon_locations')
    .select(`
      *,
      salons (
        name,
        description
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as UnifiedSalon
}

/**
 * Devuelve el primer salón favorito del usuario con datos de salón y rating promedio.
 * Retorna null si el usuario no tiene favoritos.
 */
export async function getFavoriteSalon(userId: string): Promise<FavoriteSalonInfo | null> {
  const { data, error } = await supabase
    .from('favorite_locations')
    .select(`
      location_id,
      salon_locations (
        *,
        salons (
          name,
          description
        ),
        reviews (
          rating
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  type ProfileQueryRow = {
    location_id: string
    salon_locations: UnifiedSalon & { reviews: { rating: number }[] | null } | null
  }

  const raw = data as ProfileQueryRow
  const location = raw.salon_locations
  const reviews: { rating: number }[] = location?.reviews ?? []
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length
      : null

  return {
    ...location,
    avgRating,
  } as FavoriteSalonInfo
}

/**
 * Devuelve sedes cercanas a unas coordenadas.
 * @todo Implementar con PostGIS RPC (`nearby_salons`) cuando esté habilitado.
 * Por ahora retorna todos los activos como fallback.
 */
export async function getSalonsByLocation(_lat: number, _lng: number, _radiusKm: number = 10): Promise<UnifiedSalon[]> {
  return getSalons()
}

