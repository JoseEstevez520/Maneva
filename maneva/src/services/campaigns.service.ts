/**
 * campaigns.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Capa de acceso a datos para la tabla `campaigns` de Supabase.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Campaign = Database['public']['Tables']['campaigns']['Row']

/**
 * Devuelve campañas activas para una lista de sedes.
 * Filtra: active=true, start_date <= NOW <= end_date.
 */
export async function getActiveCampaigns(locationIds: string[]): Promise<Campaign[]> {
  if (locationIds.length === 0) return []

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .in('location_id', locationIds)
    .eq('active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .order('start_date', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Devuelve todas las campañas activas sin filtrar por sede.
 * Usado en la home cuando queremos mostrar las de todos los salones.
 */
export async function getAllActiveCampaigns(): Promise<Campaign[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .order('start_date', { ascending: true })

  if (error) throw error
  return data
}
