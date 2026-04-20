import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Appointment = Database['public']['Tables']['appointments']['Row']
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
type Service = Database['public']['Tables']['services']['Row']

export type { Service }

export type AvailableSlot = {
  start: string
  end: string
  employee: {
    id: string
    firstName: string | null
    lastName: string | null
    position: string | null
    photoUrl: string | null
  }
}

export type BookingPayload = {
  clientId: string
  locationId: string
  scheduledAt: string
  scheduledEnd: string
  services: { serviceId: string; employeeId: string; durationMinutes: number; price: number }[]
  clientNotes?: string
  source?: string
}

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

export type NextAppointment = {
  id: string
  scheduled_at: string
  status: string
  salon_name: string
  service_name: string | null
  location_id: string
}

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

export async function createAppointment(payload: AppointmentInsert): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function getLocationServices(locationId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('location_id', locationId)
    .eq('active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

type EligibleEmployee = {
  id: string
  position: string | null
  photoUrl: string | null
  firstName: string | null
  lastName: string | null
}

export async function getEligibleEmployees(
  locationId: string,
  serviceIds: string[],
): Promise<EligibleEmployee[]> {
  // Employees who can do ALL requested services
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      position,
      photo_url,
      users!employees_user_id_fkey (
        first_name,
        last_name
      ),
      employee_services!inner (
        service_id
      )
    `)
    .eq('location_id', locationId)
    .eq('active', true)
    .in('employee_services.service_id', serviceIds)

  if (error) throw error

  type RawEmployee = {
    id: string
    position: string | null
    photo_url: string | null
    users: { first_name: string | null; last_name: string | null } | null
    employee_services: { service_id: string }[]
  }

  // Filter: employee must have ALL serviceIds, not just one
  return (data as unknown as RawEmployee[])
    .filter((emp) => {
      const empServiceIds = emp.employee_services.map((es) => es.service_id)
      return serviceIds.every((sid) => empServiceIds.includes(sid))
    })
    .map((emp) => ({
      id: emp.id,
      position: emp.position,
      photoUrl: emp.photo_url,
      firstName: emp.users?.first_name ?? null,
      lastName: emp.users?.last_name ?? null,
    }))
}

const SLOT_STEP_MINUTES = 15

function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function combineDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time.length === 5 ? time + ':00' : time}`)
}

export async function getAvailableSlots(params: {
  locationId: string
  serviceIds: string[]
  date: string
  employeeId?: string
}): Promise<AvailableSlot[]> {
  const { locationId, serviceIds, date, employeeId } = params

  // day_of_week: 0=Sunday … 6=Saturday (matches JS getDay())
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()

  // 1. Location hours for this day
  const { data: locationHours, error: lhError } = await supabase
    .from('location_hours')
    .select('open_time, close_time')
    .eq('location_id', locationId)
    .eq('day_of_week', dayOfWeek)
    .lte('valid_from', date)
    .or(`valid_to.is.null,valid_to.gte.${date}`)
    .maybeSingle()

  if (lhError) throw lhError
  if (!locationHours?.open_time || !locationHours?.close_time) return []

  const salonOpenMin = timeStringToMinutes(locationHours.open_time)
  const salonCloseMin = timeStringToMinutes(locationHours.close_time)

  // 2. Total duration of selected services
  const { data: services, error: svcError } = await supabase
    .from('services')
    .select('id, duration_minutes')
    .in('id', serviceIds)

  if (svcError) throw svcError

  const totalDuration = (services ?? []).reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0,
  )
  if (totalDuration === 0) return []

  // 3. Eligible employees
  const candidates = employeeId
    ? await getEligibleEmployees(locationId, serviceIds).then((emps) =>
        emps.filter((e) => e.id === employeeId),
      )
    : await getEligibleEmployees(locationId, serviceIds)

  if (candidates.length === 0) return []

  // 4. For each employee, compute free slots
  const slots: AvailableSlot[] = []

  for (const employee of candidates) {
    // 4a. Employee work hours for this day
    const { data: availability, error: avError } = await supabase
      .from('employee_availability')
      .select('start_time, end_time')
      .eq('employee_id', employee.id)
      .eq('day_of_week', dayOfWeek)
      .lte('valid_from', date)
      .or(`valid_to.is.null,valid_to.gte.${date}`)
      .maybeSingle()

    if (avError) throw avError
    if (!availability) continue

    // 4b. Check if employee is on leave this date
    const { data: unavailable, error: unavError } = await supabase
      .from('employee_unavailability')
      .select('id')
      .eq('employee_id', employee.id)
      .lte('start_date', date)
      .gte('end_date', date)
      .limit(1)

    if (unavError) throw unavError
    if (unavailable && unavailable.length > 0) continue

    // 4c. Existing appointments for this employee on this date
    const dateStart = `${date}T00:00:00`
    const dateEnd = `${date}T23:59:59`

    const { data: busyRaw, error: busyError } = await supabase
      .from('appointment_services')
      .select(`
        appointments!inner (
          scheduled_at,
          scheduled_end,
          status
        )
      `)
      .eq('employee_id', employee.id)
      .gte('appointments.scheduled_at', dateStart)
      .lte('appointments.scheduled_at', dateEnd)
      .not('appointments.status', 'eq', 'cancelled')

    if (busyError) throw busyError

    type BusyRaw = {
      appointments: { scheduled_at: string; scheduled_end: string; status: string } | null
    }

    const busyIntervals = (busyRaw as unknown as BusyRaw[])
      .filter((r) => r.appointments !== null)
      .map((r) => ({
        startMin: timeStringToMinutes(r.appointments!.scheduled_at.slice(11, 16)),
        endMin: timeStringToMinutes(r.appointments!.scheduled_end.slice(11, 16)),
      }))

    // 4d. Working window = intersection of salon hours and employee hours
    const empStartMin = timeStringToMinutes(availability.start_time)
    const empEndMin = timeStringToMinutes(availability.end_time)
    const windowStart = Math.max(salonOpenMin, empStartMin)
    const windowEnd = Math.min(salonCloseMin, empEndMin)

    if (windowStart >= windowEnd) continue

    // 4e. Generate slots every SLOT_STEP_MINUTES
    for (let t = windowStart; t + totalDuration <= windowEnd; t += SLOT_STEP_MINUTES) {
      const slotEnd = t + totalDuration
      const overlaps = busyIntervals.some(
        (busy) => t < busy.endMin && slotEnd > busy.startMin,
      )
      if (overlaps) continue

      const startDate = combineDateAndTime(date, minutesToTimeString(t))
      const endDate = combineDateAndTime(date, minutesToTimeString(slotEnd))

      slots.push({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          position: employee.position,
          photoUrl: employee.photoUrl,
        },
      })
    }
  }

  // Sort by start time, then by employee name
  slots.sort((a, b) => a.start.localeCompare(b.start))
  return slots
}

export async function bookAppointment(payload: BookingPayload): Promise<Appointment> {
  const { clientId, locationId, scheduledAt, scheduledEnd, services, clientNotes, source } =
    payload

  const { data: appointment, error: apptError } = await supabase
    .from('appointments')
    .insert({
      client_id: clientId,
      location_id: locationId,
      scheduled_at: scheduledAt,
      scheduled_end: scheduledEnd,
      status: 'pending',
      client_notes: clientNotes ?? null,
      source: source ?? 'app',
      paid: false,
    })
    .select()
    .single()

  if (apptError) throw apptError

  const appointmentServices = services.map((s) => ({
    appointment_id: appointment.id,
    service_id: s.serviceId,
    employee_id: s.employeeId,
    duration_minutes: s.durationMinutes,
    price: s.price,
  }))

  const { error: svcError } = await supabase
    .from('appointment_services')
    .insert(appointmentServices)

  if (svcError) {
    // Best-effort rollback — production should use an RPC/transaction
    await supabase.from('appointments').delete().eq('id', appointment.id)
    throw svcError
  }

  return appointment
}
