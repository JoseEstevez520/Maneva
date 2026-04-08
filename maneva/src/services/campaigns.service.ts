/**
 * campaigns.service.ts
 * ────────────────────────────────────────────────────────────────────
 * Capa de acceso a datos para la tabla `campaigns` de Supabase.
 * ────────────────────────────────────────────────────────────────────
 */
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Campaign = Database['public']['Tables']['campaigns']['Row']

/**
 * Devuelve campañas activas para una lista de sedes CON INFO DEL SALÓN.
 * Filtra: active=true, start_date <= NOW <= end_date.
 */
export async function getActiveCampaigns(locationIds: string[]): Promise<(Campaign & { salon_locations: { name: string | null; city: string | null } | null })[]> {
  if (locationIds.length === 0) return []

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      salon_locations:location_id (
        name,
        city
      )
    `)
    .in('location_id', locationIds)
    .eq('active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .order('start_date', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Devuelve TODAS las campañas activas CON INFO DEL SALÓN.
 * Usado en la home cuando queremos mostrar las de todos los salones.
 */
export async function getAllActiveCampaigns(): Promise<(Campaign & { salon_locations: { name: string | null; city: string | null } | null })[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      salon_locations:location_id (
        name,
        city
      )
    `)
    .eq('active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .order('start_date', { ascending: true })

  if (error) throw error
  return data || []
}