/**
 * campaigns.service.ts
 * ────────────────────────────────────────────────────────────────
 * Capa de acceso a datos para campañas.
 * ────────────────────────────────────────────────────────────────
 */
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Campaign = Database['public']['Tables']['campaigns']['Row']
type SalonLocation = Database['public']['Tables']['salon_locations']['Row']
type Salon = Database['public']['Tables']['salons']['Row']

/** Tipo enriquecido de campaña con info del salón */
export type CampaignWithSalon = Campaign & {
  salon_locations: (SalonLocation & {
    salons: Pick<Salon, 'name' | 'description'> | null
  }) | null
}

/**
 * Devuelve campañas activas para una lista de sedes con info del salón.
 */
export async function getActiveCampaigns(locationIds: string[]): Promise<CampaignWithSalon[]> {
  if (locationIds.length === 0) return []

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      salon_locations (
        id,
        name,
        city,
        address,
        phone,
        salons (
          name,
          description
        )
      )
    `)
    .in('location_id', locationIds)
    .eq('active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .order('start_date', { ascending: true })

  if (error) throw error
  return data as CampaignWithSalon[]
}

/**
 * Devuelve todas las campañas activas con info del salón.
 */
export async function getAllActiveCampaigns(): Promise<CampaignWithSalon[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      salon_locations (
        id,
        name,
        city,
        address,
        phone,
        salons (
          name,
          description
        )
      )
    `)
    .eq('active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .order('start_date', { ascending: true })

  if (error) throw error
  return data as CampaignWithSalon[]
}

/**
 * Devuelve una campaña específica por ID con todos los detalles.
 */
export async function getCampaignById(id: string): Promise<CampaignWithSalon | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      salon_locations (
        id,
        name,
        city,
        address,
        phone,
        salons (
          name,
          description
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data as CampaignWithSalon
}