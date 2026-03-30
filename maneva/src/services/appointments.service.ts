/**
 * appointments.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Capa de acceso a datos para la tabla `appointments` de Supabase.
 * Todas las operaciones de citas pasan por aquí — nunca acceder a Supabase
 * directamente desde hooks o componentes.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Appointment = Database['public']['Tables']['appointments']['Row']
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']

/**
 * Devuelve todas las citas de un cliente, enriquecidas con
 * el nombre del salón y los servicios asociados.
 * Ordenadas por fecha de inicio ascendente (próximas primero).
 */
export async function getMyAppointments(userId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      salon_locations (
        name,
        address
      ),
      appointment_services (
        services (
          name,
          duration_minutes,
          price
        )
      )
    `)
    .eq('client_id', userId)
    .order('scheduled_at', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Tipo enriquecido para la próxima cita con datos de salón y servicios.
 */
export type NextAppointment = {
  id: string
  scheduled_at: string
  status: string
  salon_name: string
  service_name: string | null
  location_id: string
}

/**
 * Devuelve la próxima cita confirmada o pendiente del usuario,
 * ordenada por fecha ascendente (la más inminente primero).
 */
export async function getNextAppointment(userId: string): Promise<NextAppointment | null> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_at,
      status,
      location_id,
      salon_locations (
        name
      ),
      appointment_services (
        services (
          name
        )
      )
    `)
    .eq('client_id', userId)
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .single()

  if (error) {
    // PGRST116 = no rows found — no es un error real
    if (error.code === 'PGRST116') return null
    throw error
  }

  type AppointmentQueryRow = {
    id: string
    scheduled_at: string
    status: string
    location_id: string
    salon_locations: { name: string } | null
    appointment_services: { services: { name: string } | null }[] | null
  }

  const raw = data as unknown as AppointmentQueryRow
  return {
    id: raw.id,
    scheduled_at: raw.scheduled_at,
    status: raw.status,
    location_id: raw.location_id,
    salon_name: raw.salon_locations?.name ?? 'Salón',
    service_name: raw.appointment_services?.[0]?.services?.name ?? null,
  }
}

/**
 * Crea una nueva cita. El `client_id` se inyecta desde el hook
 * que llama a esta función — nunca se pasa desde el componente.
 */
export async function createAppointment(payload: AppointmentInsert): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Cancela una cita actualizando su status a 'cancelled'.
 * La política de cancelación (penalizaciones, tiempos) se gestiona en Supabase RLS.
 */
export async function cancelAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) throw error
}

/**
 * Obtiene los slots disponibles de un empleado en una fecha concreta.
 * @todo Implementar llamada a RPC de Supabase con lógica de disponibilidad real.
 */
export async function getAvailableSlots(_employeeId: string, _date: string): Promise<unknown[]> {
  // Pendiente de RPC / Edge Function con lógica de disponibilidad
  return []
}

