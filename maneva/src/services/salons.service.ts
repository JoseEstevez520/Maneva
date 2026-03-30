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
 * Devuelve sedes cercanas a unas coordenadas.
 * @todo Implementar con PostGIS RPC (`nearby_salons`) cuando esté habilitado.
 * Por ahora retorna todos los activos como fallback.
 */
export async function getSalonsByLocation(_lat: number, _lng: number, _radiusKm: number = 10): Promise<UnifiedSalon[]> {
  return getSalons()
}

