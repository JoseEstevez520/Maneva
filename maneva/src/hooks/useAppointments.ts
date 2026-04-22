import { useState, useEffect, useCallback } from 'react'
import {
  getMyAppointments,
  createAppointment,
  cancelAppointment,
  getNextAppointment,
  getLocationServices,
  getEligibleEmployees,
  getServiceEmployees,
  getAvailableSlots,
  bookAppointment,
  NextAppointment,
  AvailableSlot,
  EmployeeInfo,
  Service,
} from '@/services/appointments.service'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database.types'

type Appointment = Database['public']['Tables']['appointments']['Row']
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']

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

export function useNextAppointment() {
  const [data, setData] = useState<NextAppointment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const result = await getNextAppointment(user.id)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar la próxima cita')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refresh: fetch }
}

export function useLocationServices(locationId: string | null) {
  const [data, setData] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!locationId) return
    setLoading(true)
    setError(null)
    getLocationServices(locationId)
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Error al cargar servicios'),
      )
      .finally(() => setLoading(false))
  }, [locationId])

  return { data, loading, error }
}

export function useAvailableSlots(params: {
  locationId: string | null
  serviceIds: string[]
  date: string | null
  preferredEmployeeId?: string
  serviceEmployeeMap?: Record<string, string>
}) {
  const { locationId, serviceIds, date, preferredEmployeeId, serviceEmployeeMap } = params
  const [data, setData] = useState<AvailableSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!locationId || !date || serviceIds.length === 0) {
      setData([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const slots = await getAvailableSlots({
        locationId,
        serviceIds,
        date,
        preferredEmployeeId,
        serviceEmployeeMap,
      })
      setData(slots)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar disponibilidad')
    } finally {
      setLoading(false)
    }
  }, [locationId, date, serviceIds.join(','), preferredEmployeeId, JSON.stringify(serviceEmployeeMap)])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refresh: fetch }
}

export function useEligibleEmployees(locationId: string | null, serviceIds: string[]) {
  const [data, setData] = useState<EmployeeInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!locationId || serviceIds.length === 0) {
      setData([])
      return
    }
    setLoading(true)
    setError(null)
    getEligibleEmployees(locationId, serviceIds)
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Error al cargar empleados'),
      )
      .finally(() => setLoading(false))
  }, [locationId, serviceIds.join(',')])

  return { data, loading, error }
}

export function useServiceEmployees(
  locationId: string | null,
  serviceIds: string[],
  enabled: boolean,
) {
  const [data, setData] = useState<Record<string, EmployeeInfo[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || !locationId || serviceIds.length === 0) {
      setData({})
      return
    }
    setLoading(true)
    getServiceEmployees(locationId, serviceIds)
      .then(setData)
      .catch(() => setData({}))
      .finally(() => setLoading(false))
  }, [locationId, serviceIds.join(','), enabled])

  return { data, loading }
}

// ─── Flujo de reserva ──────────────────────────────────────────────────────────

export type BookingStep = 'services' | 'employee' | 'date' | 'slot' | 'confirm' | 'done'

export function useBookingFlow(locationId: string) {
  const { user } = useAuthStore()

  const [step, setStep] = useState<BookingStep>('services')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  // Modo un empleado
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  // Modo multi-empleado: serviceId → employeeId
  const [serviceEmployeeMap, setServiceEmployeeMap] = useState<Record<string, string>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [clientNotes, setClientNotes] = useState('')
  const [booking, setBooking] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: services, loading: servicesLoading } = useLocationServices(locationId)
  const { data: employees, loading: employeesLoading } = useEligibleEmployees(locationId, selectedServiceIds)

  // Modo multi-empleado: ningún empleado puede hacer todos los servicios
  const isMultiEmployee = selectedServiceIds.length > 0 && !employeesLoading && employees.length === 0

  const { data: serviceEmployees, loading: serviceEmployeesLoading } = useServiceEmployees(
    locationId,
    selectedServiceIds,
    isMultiEmployee,
  )

  const { data: slots, loading: slotsLoading } = useAvailableSlots({
    locationId,
    serviceIds: selectedServiceIds,
    date: selectedDate,
    preferredEmployeeId: isMultiEmployee ? undefined : (selectedEmployeeId ?? undefined),
    serviceEmployeeMap: isMultiEmployee ? serviceEmployeeMap : undefined,
  })

  // ── Acciones (sin auto-avance de paso) ────────────────────────────────────────

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
    setSelectedEmployeeId(null)
    setServiceEmployeeMap({})
    setSelectedSlot(null)
  }

  /** Modo un empleado: elige profesional (null = sin preferencia). No avanza el paso. */
  const pickEmployee = (employeeId: string | null) => {
    setSelectedEmployeeId(employeeId)
    setSelectedDate(null)
    setSelectedSlot(null)
  }

  /** Modo multi-empleado: asigna un empleado a un servicio concreto. */
  const assignServiceEmployee = (serviceId: string, employeeId: string) => {
    setServiceEmployeeMap((prev) => ({ ...prev, [serviceId]: employeeId }))
    setSelectedDate(null)
    setSelectedSlot(null)
  }

  /** ¿Están todos los servicios asignados? (para el botón Continuar del paso employee multi) */
  const allServicesAssigned = isMultiEmployee
    ? selectedServiceIds.every((sid) => Boolean(serviceEmployeeMap[sid]))
    : true  // en modo un empleado, siempre se puede continuar (puede ir con sin preferencia)

  /** Selecciona fecha. No avanza el paso. */
  const pickDate = (date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  /** Selecciona slot. No avanza el paso. */
  const pickSlot = (slot: AvailableSlot) => {
    setSelectedSlot(slot)
  }

  const confirm = async () => {
    if (!user || !selectedSlot || selectedServiceIds.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const selectedServices = services
        .filter((s) => selectedServiceIds.includes(s.id))
        .map((s) => ({
          serviceId: s.id,
          employeeId: selectedSlot.serviceAssignments[s.id],
          durationMinutes: s.duration_minutes,
          price: s.price,
        }))

      const result = await bookAppointment({
        clientId: user.id,
        locationId,
        scheduledAt: selectedSlot.start,
        scheduledEnd: selectedSlot.end,
        services: selectedServices,
        clientNotes: clientNotes || undefined,
        source: 'app',
      })
      setBooking(result)
      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al confirmar la cita')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep('services')
    setSelectedServiceIds([])
    setSelectedEmployeeId(null)
    setServiceEmployeeMap({})
    setSelectedDate(null)
    setSelectedSlot(null)
    setClientNotes('')
    setBooking(null)
    setError(null)
  }

  return {
    step,
    setStep,
    services,
    servicesLoading,
    employees,
    employeesLoading,
    isMultiEmployee,
    serviceEmployees,
    serviceEmployeesLoading,
    serviceEmployeeMap,
    slots,
    slotsLoading,
    selectedServiceIds,
    selectedEmployeeId,
    selectedDate,
    selectedSlot,
    allServicesAssigned,
    clientNotes,
    setClientNotes,
    booking,
    loading,
    error,
    toggleService,
    pickEmployee,
    assignServiceEmployee,
    pickDate,
    pickSlot,
    confirm,
    reset,
  }
}
