import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Appointment = Database['public']['Tables']['appointments']['Row']
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
type Service = Database['public']['Tables']['services']['Row']

export type { Service }

export type EmployeeInfo = {
  id: string
  firstName: string | null
  lastName: string | null
  position: string | null
  photoUrl: string | null
}

// serviceAssignments: serviceId → employeeId (one entry per service)
// employees: unique employees involved (1 = single, 2+ = multi)
export type AvailableSlot = {
  start: string
  end: string
  employees: EmployeeInfo[]
  serviceAssignments: Record<string, string>
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

// ─── Citas del usuario ─────────────────────────────────────────────────────────

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

// ─── Servicios ─────────────────────────────────────────────────────────────────

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

// ─── Empleados ─────────────────────────────────────────────────────────────────

type RawEmployee = {
  id: string
  position: string | null
  photo_url: string | null
  users: { first_name: string | null; last_name: string | null } | null
  employee_services: { service_id: string }[]
}

function mapEmployee(emp: RawEmployee): EmployeeInfo {
  return {
    id: emp.id,
    position: emp.position,
    photoUrl: emp.photo_url,
    firstName: emp.users?.first_name ?? null,
    lastName: emp.users?.last_name ?? null,
  }
}

async function fetchEmployeesWithServices(locationId: string, serviceIdFilter: string[]): Promise<RawEmployee[]> {
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
    .in('employee_services.service_id', serviceIdFilter)

  if (error) throw error
  return data as unknown as RawEmployee[]
}

/** Empleados que pueden realizar TODOS los servicios solicitados. */
export async function getEligibleEmployees(
  locationId: string,
  serviceIds: string[],
): Promise<EmployeeInfo[]> {
  const raw = await fetchEmployeesWithServices(locationId, serviceIds)
  return raw
    .filter((emp) => {
      const empSvcIds = emp.employee_services.map((es) => es.service_id)
      return serviceIds.every((sid) => empSvcIds.includes(sid))
    })
    .map(mapEmployee)
}

/**
 * Para cada servicio, devuelve qué empleados pueden realizarlo.
 * Usado en el modo multi-empleado cuando ninguno puede hacer todos.
 */
export async function getServiceEmployees(
  locationId: string,
  serviceIds: string[],
): Promise<Record<string, EmployeeInfo[]>> {
  const raw = await fetchEmployeesWithServices(locationId, serviceIds)
  const result: Record<string, EmployeeInfo[]> = {}
  for (const sid of serviceIds) {
    result[sid] = raw
      .filter((emp) => emp.employee_services.some((es) => es.service_id === sid))
      .map(mapEmployee)
  }
  return result
}

// ─── Disponibilidad ────────────────────────────────────────────────────────────

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

type EmployeeBusyInterval = { startMin: number; endMin: number }

type EmployeeScheduleData = {
  info: EmployeeInfo
  workStart: number
  workEnd: number
  busy: EmployeeBusyInterval[]
}

/** Carga disponibilidad y citas ocupadas de un empleado para una fecha. */
async function loadEmployeeSchedule(
  employee: EmployeeInfo,
  date: string,
  dayOfWeek: number,
  salonOpenMin: number,
  salonCloseMin: number,
): Promise<EmployeeScheduleData | null> {
  const { data: availability } = await supabase
    .from('employee_availability')
    .select('start_time, end_time')
    .eq('employee_id', employee.id)
    .eq('day_of_week', dayOfWeek)
    .lte('valid_from', date)
    .or(`valid_to.is.null,valid_to.gte.${date}`)
    .maybeSingle()

  if (!availability) return null

  const { data: unavailable } = await supabase
    .from('employee_unavailability')
    .select('id')
    .eq('employee_id', employee.id)
    .lte('start_date', date)
    .gte('end_date', date)
    .limit(1)

  if (unavailable && unavailable.length > 0) return null

  const { data: busyRaw } = await supabase
    .from('appointment_services')
    .select(`appointments!inner ( scheduled_at, scheduled_end, status )`)
    .eq('employee_id', employee.id)
    .gte('appointments.scheduled_at', `${date}T00:00:00`)
    .lte('appointments.scheduled_at', `${date}T23:59:59`)
    .not('appointments.status', 'eq', 'cancelled')

  type BusyRaw = { appointments: { scheduled_at: string; scheduled_end: string } | null }
  const busy = ((busyRaw ?? []) as unknown as BusyRaw[])
    .filter((r) => r.appointments !== null)
    .map((r) => ({
      startMin: timeStringToMinutes(r.appointments!.scheduled_at.slice(11, 16)),
      endMin: timeStringToMinutes(r.appointments!.scheduled_end.slice(11, 16)),
    }))

  const empStartMin = timeStringToMinutes(availability.start_time)
  const empEndMin = timeStringToMinutes(availability.end_time)
  const workStart = Math.max(salonOpenMin, empStartMin)
  const workEnd = Math.min(salonCloseMin, empEndMin)

  if (workStart >= workEnd) return null

  return { info: employee, workStart, workEnd, busy }
}

function isFree(schedule: EmployeeScheduleData, fromMin: number, toMin: number): boolean {
  if (fromMin < schedule.workStart || toMin > schedule.workEnd) return false
  return !schedule.busy.some((b) => fromMin < b.endMin && toMin > b.startMin)
}

export async function getAvailableSlots(params: {
  locationId: string
  serviceIds: string[]
  date: string
  preferredEmployeeId?: string
  /** Multi-empleado: serviceId → employeeId específico */
  serviceEmployeeMap?: Record<string, string>
}): Promise<AvailableSlot[]> {
  const { locationId, serviceIds, date, preferredEmployeeId, serviceEmployeeMap } = params

  const dayOfWeek = new Date(date + 'T12:00:00').getDay()

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

  const { data: services, error: svcError } = await supabase
    .from('services')
    .select('id, duration_minutes')
    .in('id', serviceIds)

  if (svcError) throw svcError

  const durationMap: Record<string, number> = {}
  for (const s of services ?? []) durationMap[s.id] = s.duration_minutes ?? 0

  const totalDuration = serviceIds.reduce((sum, sid) => sum + (durationMap[sid] ?? 0), 0)
  if (totalDuration === 0) return []

  // ── Modo multi-empleado ───────────────────────────────────────────────────────
  if (serviceEmployeeMap) {
    return getMultiEmployeeSlots({
      locationId,
      serviceIds,
      date,
      dayOfWeek,
      salonOpenMin,
      salonCloseMin,
      durationMap,
      serviceEmployeeMap,
    })
  }

  // ── Modo un solo empleado ─────────────────────────────────────────────────────
  let candidates = await getEligibleEmployees(locationId, serviceIds)
  if (preferredEmployeeId) {
    candidates = candidates.filter((e) => e.id === preferredEmployeeId)
  }
  if (candidates.length === 0) return []

  const slots: AvailableSlot[] = []

  for (const employee of candidates) {
    const schedule = await loadEmployeeSchedule(employee, date, dayOfWeek, salonOpenMin, salonCloseMin)
    if (!schedule) continue

    for (let t = schedule.workStart; t + totalDuration <= schedule.workEnd; t += SLOT_STEP_MINUTES) {
      if (!isFree(schedule, t, t + totalDuration)) continue

      const startDate = combineDateAndTime(date, minutesToTimeString(t))
      const endDate = combineDateAndTime(date, minutesToTimeString(t + totalDuration))

      slots.push({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        employees: [employee],
        serviceAssignments: Object.fromEntries(serviceIds.map((sid) => [sid, employee.id])),
      })
    }
  }

  slots.sort((a, b) => a.start.localeCompare(b.start))
  return slots
}

async function getMultiEmployeeSlots(params: {
  locationId: string
  serviceIds: string[]
  date: string
  dayOfWeek: number
  salonOpenMin: number
  salonCloseMin: number
  durationMap: Record<string, number>
  serviceEmployeeMap: Record<string, string>
}): Promise<AvailableSlot[]> {
  const { serviceIds, date, dayOfWeek, salonOpenMin, salonCloseMin, durationMap, serviceEmployeeMap } = params

  // Agrupar servicios por empleado (mantener orden de serviceIds)
  const empBlocks: { employeeId: string; svcIds: string[]; totalDuration: number }[] = []
  for (const sid of serviceIds) {
    const empId = serviceEmployeeMap[sid]
    if (!empId) continue
    const existing = empBlocks.find((b) => b.employeeId === empId)
    if (existing) {
      existing.svcIds.push(sid)
      existing.totalDuration += durationMap[sid] ?? 0
    } else {
      empBlocks.push({ employeeId: empId, svcIds: [sid], totalDuration: durationMap[sid] ?? 0 })
    }
  }

  if (empBlocks.length === 0) return []

  // Cargar schedule de cada empleado único
  const uniqueEmpIds = [...new Set(empBlocks.map((b) => b.employeeId))]
  const schedules: Record<string, EmployeeScheduleData> = {}
  const employeeInfoMap: Record<string, EmployeeInfo> = {}

  for (const empId of uniqueEmpIds) {
    // Fetch employee info
    const { data: empRaw } = await supabase
      .from('employees')
      .select(`
        id, position, photo_url,
        users!employees_user_id_fkey ( first_name, last_name )
      `)
      .eq('id', empId)
      .single()

    if (!empRaw) continue
    type EmpRaw = { id: string; position: string | null; photo_url: string | null; users: { first_name: string | null; last_name: string | null } | null }
    const emp = empRaw as unknown as EmpRaw
    const info: EmployeeInfo = {
      id: emp.id,
      position: emp.position,
      photoUrl: emp.photo_url,
      firstName: emp.users?.first_name ?? null,
      lastName: emp.users?.last_name ?? null,
    }
    employeeInfoMap[empId] = info
    const schedule = await loadEmployeeSchedule(info, date, dayOfWeek, salonOpenMin, salonCloseMin)
    if (schedule) schedules[empId] = schedule
  }

  // El rango de inicio posible es la intersección de todos los horarios laborales
  const overallStart = Math.max(...Object.values(schedules).map((s) => s.workStart))
  const totalDuration = empBlocks.reduce((sum, b) => sum + b.totalDuration, 0)
  const overallEnd = Math.min(...Object.values(schedules).map((s) => s.workEnd))

  if (overallStart >= overallEnd) return []

  const slots: AvailableSlot[] = []

  for (let t = overallStart; t + totalDuration <= overallEnd; t += SLOT_STEP_MINUTES) {
    let cursor = t
    let allFree = true

    for (const block of empBlocks) {
      const schedule = schedules[block.employeeId]
      if (!schedule || !isFree(schedule, cursor, cursor + block.totalDuration)) {
        allFree = false
        break
      }
      cursor += block.totalDuration
    }

    if (!allFree) continue

    const startDate = combineDateAndTime(date, minutesToTimeString(t))
    const endDate = combineDateAndTime(date, minutesToTimeString(t + totalDuration))

    const uniqueEmployees = uniqueEmpIds
      .filter((id) => schedules[id] && employeeInfoMap[id])
      .map((id) => employeeInfoMap[id])

    slots.push({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      employees: uniqueEmployees,
      serviceAssignments: { ...serviceEmployeeMap },
    })
  }

  slots.sort((a, b) => a.start.localeCompare(b.start))
  return slots
}

// ─── Crear cita ────────────────────────────────────────────────────────────────

export async function bookAppointment(payload: BookingPayload): Promise<Appointment> {
  const { clientId, locationId, scheduledAt, scheduledEnd, services, clientNotes, source } = payload

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
    await supabase.from('appointments').delete().eq('id', appointment.id)
    throw svcError
  }

  return appointment
}
