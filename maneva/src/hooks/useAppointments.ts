/**
 * useAppointments.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hooks de estado para la gestión de citas del cliente autenticado.
 * Encapsula carga, creación y cancelación — los componentes no tocan
 * el service layer directamente.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react'
import { getMyAppointments, createAppointment, cancelAppointment } from '@/services/appointments.service'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database.types'

type Appointment = Database['public']['Tables']['appointments']['Row']
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']

/**
 * Carga y gestiona las citas del usuario autenticado.
 * Retorna: datos, estado de carga/error, y acciones `create` y `cancel`.
 */
export function useMyAppointments() {
  const [data, setData] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const fetchAppointments = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const result = await getMyAppointments(user.id)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  /** Crea una nueva cita inyectando automáticamente el `client_id` del usuario */
  const create = async (payload: Omit<AppointmentInsert, 'client_id'>) => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      await createAppointment({ ...payload, client_id: user.id })
      await fetchAppointments()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear cita'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }

  /** Cancela una cita por ID y recarga la lista */
  const cancel = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await cancelAppointment(id)
      await fetchAppointments()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cancelar'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refresh: fetchAppointments, create, cancel }
}

