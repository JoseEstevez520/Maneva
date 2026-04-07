/**
 * salons.service.ts
 * ────────────────────────────────────────────────────────────────
 * Capa de acceso a datos para salones y sus ubicaciones.
 * ────────────────────────────────────────────────────────────────
 */
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type SalonLocation = Database['public']['Tables']['salon_locations']['Row']
type Salon = Database['public']['Tables']['salons']['Row']
type Service = Database['public']['Tables']['services']['Row']
type Employee = Database['public']['Tables']['employees']['Row']
type Campaign = Database['public']['Tables']['campaigns']['Row']
type Review = Database['public']['Tables']['reviews']['Row']
type EcoLabel = Database['public']['Tables']['eco_labels']['Row']

/**
 * Tipo unificado para la UI
 */
export type UnifiedSalon = SalonLocation & {
  salons: Pick<Salon, 'name' | 'description'> | null
}

/** Tipo para el perfil detallado del salón */
export type SalonDetail = UnifiedSalon & {
  services: Service[] | null
  employees: Employee[] | null
  campaigns: Campaign[] | null
  reviews: Review[] | null
  ecoLabels: EcoLabel[] | null
  avgRating: number | null
}

export type FavoriteSalonInfo = UnifiedSalon & {
  avgRating: number | null
}

/**
 * Devuelve todas las sedes activas con sus datos de salón y rating promedio.
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
      reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null
    return { ...loc, avgRating }
  })
}

/**
 * Devuelve todas las sedes activas.
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
 * Devuelve una sede concreta con todos sus detalles (perfil completo).
 */
export async function getSalonById(id: string): Promise<SalonDetail> {
  const { data, error } = await supabase
    .from('salon_locations')
    .select(`
      *,
      salons (
        name,
        description
      ),
      services (
        id,
        name,
        description,
        price
      ),
      employees (
        id,
        photo_url,
        bio,
        position,
        specialties
      ),
      campaigns (
        id,
        name,
        start_date,
        end_date,
        type
      ),
      reviews (
        id,
        rating,
        comment,
        created_at
      ),
      eco_labels (
        id,
        label_type,
        valid_until
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  type SalonWithAll = SalonDetail & {
    reviews: { rating: number; comment?: string; created_at: string; id: string }[] | null
  }

  const salon = data as SalonWithAll
  const reviews = salon.reviews ?? []
  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null

  return {
    ...salon,
    avgRating,
  }
}

/**
 * Devuelve el salón favorito del usuario.
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
 * Devuelve sedes cercanas a unas coordenadas (placeholder).
 */
export async function getSalonsByLocation(
  _lat: number,
  _lng: number,
  _radiusKm: number = 10
): Promise<UnifiedSalon[]> {
  return getSalons()
}