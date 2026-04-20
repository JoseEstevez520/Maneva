import { useState, useEffect, useCallback } from 'react'
import {
  getMyAppointments,
  createAppointment,
  cancelAppointment,
  getNextAppointment,
  getLocationServices,
  getEligibleEmployees,
  getAvailableSlots,
  bookAppointment,
  NextAppointment,
  AvailableSlot,
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
  employeeId?: string
}) {
  const { locationId, serviceIds, date, employeeId } = params
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
      const slots = await getAvailableSlots({ locationId, serviceIds, date, employeeId })
      setData(slots)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar disponibilidad')
    } finally {
      setLoading(false)
    }
  }, [locationId, date, serviceIds.join(','), employeeId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refresh: fetch }
}

export type BookingStep = 'services' | 'date' | 'slot' | 'confirm' | 'done'

export type BookingState = {
  step: BookingStep
  locationId: string
  selectedServiceIds: string[]
  selectedDate: string | null
  selectedSlot: AvailableSlot | null
  clientNotes: string
}

export function useBookingFlow(locationId: string) {
  const { user } = useAuthStore()

  const [step, setStep] = useState<BookingStep>('services')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [clientNotes, setClientNotes] = useState('')
  const [booking, setBooking] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: services, loading: servicesLoading } = useLocationServices(locationId)
  const { data: slots, loading: slotsLoading } = useAvailableSlots({
    locationId,
    serviceIds: selectedServiceIds,
    date: selectedDate,
  })

  const { data: employees } = useEligibleEmployees(locationId, selectedServiceIds)

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
    setSelectedSlot(null)
  }

  const selectDate = (date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setStep('slot')
  }

  const selectSlot = (slot: AvailableSlot) => {
    setSelectedSlot(slot)
    setStep('confirm')
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
          employeeId: selectedSlot.employee.id,
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
    slots,
    slotsLoading,
    selectedServiceIds,
    selectedDate,
    selectedSlot,
    clientNotes,
    setClientNotes,
    booking,
    loading,
    error,
    toggleService,
    selectDate,
    selectSlot,
    confirm,
    reset,
  }
}

export function useEligibleEmployees(locationId: string | null, serviceIds: string[]) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getEligibleEmployees>>>([])
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
