/**
 * campaigns.service.ts
 * ────────────────────────────────────────────────────────────────────
 * Capa de acceso a datos para la tabla `campaigns` de Supabase.
 * ────────────────────────────────────────────────────────────────────
 */
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Campaign = Database['public']['Tables']['campaigns']['Row']

export type CampaignWithSalon = Campaign & {
  salon_locations: {
    name: string | null
    city: string | null
    address: string | null
    phone: string | null
    salons: {
      name: string | null
    } | null
  } | null
}

/**
 * Devuelve campañas activas para una lista de sedes CON INFO DEL SALÓN.
 * Filtra: active=true, start_date <= NOW <= end_date.
 */
export async function getActiveCampaigns(locationIds: string[]): Promise<CampaignWithSalon[]> {
  if (locationIds.length === 0) return []

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      salon_locations:location_id (
        name,
        city,
        address,
        phone,
        salons (
          name
        )
      )
    `)
    .in('location_id', locationIds)
    .eq('active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .order('start_date', { ascending: true })

  if (error) throw error
  return (data || []) as CampaignWithSalon[]
}

/**
 * Devuelve TODAS las campañas activas CON INFO DEL SALÓN.
 * Usado en la home cuando queremos mostrar las de todos los salones.
 */
export async function getAllActiveCampaigns(): Promise<CampaignWithSalon[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      salon_locations:location_id (
        name,
        city,
        address,
        phone,
        salons (
          name
        )
      )
    `)
    .eq('active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .order('start_date', { ascending: true })

  if (error) throw error
  return (data || []) as CampaignWithSalon[]
}

/**
 * Devuelve una campaña por ID con toda la información del salón.
 */
export async function getCampaignById(id: string): Promise<CampaignWithSalon> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      salon_locations:location_id (
        name,
        city,
        address,
        phone,
        salons (
          name
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as CampaignWithSalon
}