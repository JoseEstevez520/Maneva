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
type User = Database['public']['Tables']['users']['Row']

export type EmployeeWithUser = Employee & {
  users: Pick<User, 'first_name' | 'last_name'> | null
}
type Campaign = Database['public']['Tables']['campaigns']['Row']
type Review = Database['public']['Tables']['reviews']['Row']
type EcoLabel = Database['public']['Tables']['eco_labels']['Row']
type LocationHour = Database['public']['Tables']['location_hours']['Row']

export type ReviewWithUser = Review & {
  users: Pick<User, 'first_name' | 'last_name'> | null
}

/**
 * Tipo unificado para la UI
 */
export type UnifiedSalon = SalonLocation & {
  salons: Pick<Salon, 'name' | 'description' | 'logo'> | null
}

/** Tipo para el perfil detallado del salón */
export type SalonDetail = UnifiedSalon & {
  services: Service[] | null
  employees: EmployeeWithUser[] | null
  campaigns: Campaign[] | null
  reviews: ReviewWithUser[] | null
  eco_labels: EcoLabel[] | null
  location_hours: LocationHour[] | null
  avgRating: number | null
}

export type FavoriteSalonInfo = UnifiedSalon & {
  avgRating: number | null
}

/**
 * Devuelve todas las sedes activas con sus datos de salón, rating promedio y
 * precio medio calculado desde los servicios del salón.
 *
 * `avgPrice` se deriva de los precios de los servicios activos de cada sede,
 * lo que evita necesitar una columna `price_range` explícita en salon_locations.
 * Si una sede no tiene servicios registrados, `avgPrice` será null.
 */
export async function getSalonsWithRating(): Promise<
  (UnifiedSalon & { avgRating: number | null; avgPrice: number | null })[]
> {
  const { data, error } = await supabase
    .from('salon_locations')
    .select(`
      *,
      salons (
        name,
        description,
        logo
      ),
      reviews (
        rating
      ),
      services (
        price
      )
    `)
    .eq('active', true)

  if (error) throw error

  type SalonWithReviewsAndServices = UnifiedSalon & {
    reviews: { rating: number }[] | null
    services: { price: number }[] | null
  }

  return (data as SalonWithReviewsAndServices[]).map((loc) => {
    const reviews = loc.reviews ?? []
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null

    // Precio medio de los servicios de la sede. Null si aún no tiene servicios.
    const services = loc.services ?? []
    const avgPrice =
      services.length > 0
        ? services.reduce((sum, s) => sum + s.price, 0) / services.length
        : null

    return { ...loc, avgRating, avgPrice }
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
        description,
        logo
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
        description,
        logo
      ),
      services (
        id,
        name,
        description,
        price,
        duration_minutes
      ),
      employees (
        id,
        photo_url,
        bio,
        position,
        specialties,
        users (
          first_name,
          last_name
        )
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
        created_at,
        users (
          first_name,
          last_name
        )
      ),
      eco_labels (
        id,
        label_type,
        valid_until
      ),
      location_hours (
        id,
        day_of_week,
        open_time,
        close_time
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  type SalonWithAll = UnifiedSalon & {
    services: Service[] | null
    employees: EmployeeWithUser[] | null
    campaigns: Campaign[] | null
    reviews: ReviewWithUser[] | null
    eco_labels: EcoLabel[] | null
    location_hours: LocationHour[] | null
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
          description,
          logo
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
 * Indica si una sede está marcada como favorita por el usuario.
 */
export async function isFavoriteSalon(userId: string, locationId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorite_locations')
    .select('id')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') return false
    throw error
  }

  return Boolean(data)
}

/**
 * Marca una sede como favorita para el usuario actual.
 */
export async function addFavoriteSalon(userId: string, locationId: string): Promise<void> {
  const alreadyFavorite = await isFavoriteSalon(userId, locationId)
  if (alreadyFavorite) return

  const { error } = await supabase
    .from('favorite_locations')
    .insert({ user_id: userId, location_id: locationId })

  if (error) throw error
}

/**
 * Quita una sede de favoritos para el usuario actual.
 */
export async function removeFavoriteSalon(userId: string, locationId: string): Promise<void> {
  const { error } = await supabase
    .from('favorite_locations')
    .delete()
    .eq('user_id', userId)
    .eq('location_id', locationId)

  if (error) throw error
}

/**
 * Devuelve los IDs de salones marcados como favoritos por el usuario.
 */
export async function getFavoriteSalonIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorite_locations')
    .select('location_id')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((r) => r.location_id)
}

/**
 * Devuelve los empleados activos de una sede concreta.
 */
export async function getEmployeesByLocation(locationId: string): Promise<EmployeeWithUser[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, photo_url, bio, position, specialties, location_id, users(first_name, last_name)')
    .eq('location_id', locationId)
    .eq('active', true)
    .order('id')

  if (error) throw error
  return (data ?? []) as EmployeeWithUser[]
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