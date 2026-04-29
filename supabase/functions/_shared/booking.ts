import { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type SlotOption = {
  start: string
  end: string
  employeeId: string
  employeeName: string
}

export type BookingProgress = {
  type: 'booking_progress'
  serviceIds: string[]
  serviceNames: string[]
  checkedDate: string | null
  checkedDateHadSlots: boolean
  slots: SlotOption[]
  selectedSlot: SlotOption | null
  awaitingGuestName: boolean
}

export function emptyProgress(): BookingProgress {
  return {
    type: 'booking_progress',
    serviceIds: [],
    serviceNames: [],
    checkedDate: null,
    checkedDateHadSlots: false,
    slots: [],
    selectedSlot: null,
    awaitingGuestName: false,
  }
}

export function parseProgress(aiResponse: string | null): BookingProgress {
  if (!aiResponse) return emptyProgress()
  try {
    const ctx = JSON.parse(aiResponse)
    if (ctx.type === 'booking_progress') return ctx as BookingProgress

    // Migración de formatos anteriores
    if (ctx.type === 'slot_selection') {
      const firstSlot: SlotOption | undefined = ctx.slots?.[0]
      return {
        ...emptyProgress(),
        serviceIds: ctx.serviceIds ?? [],
        checkedDate: firstSlot?.start?.slice(0, 10) ?? null,
        checkedDateHadSlots: true,
        slots: ctx.slots ?? [],
      }
    }
    if (ctx.type === 'no_slots') {
      return {
        ...emptyProgress(),
        serviceIds: ctx.serviceIds ?? [],
        serviceNames: ctx.serviceNames ?? [],
        checkedDate: ctx.checkedDate ?? null,
      }
    }
    if (ctx.type === 'pending_booking') {
      return {
        ...emptyProgress(),
        serviceIds: ctx.serviceIds ?? [],
        selectedSlot: ctx.slot ?? null,
        awaitingGuestName: true,
      }
    }
  } catch { /* formato no reconocido */ }
  return emptyProgress()
}

const SLOT_STEP = 15

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// Los horarios en BD son locales del salón; la Edge Function corre en UTC,
// así que parsear sin zona horaria es equivalente a UTC (comportamiento correcto).
function dateTime(date: string, time: string): Date {
  const t = time.length === 5 ? `${time}:00` : time
  return new Date(`${date}T${t}`)
}

// Supabase no infiere bien los tipos en joins anidados desde Edge Functions
// (no tenemos acceso al database.types.ts generado), por eso los cast explícitos.
type EmpRow = {
  id: string
  position: string | null
  users: { first_name: string | null; last_name: string | null } | null
  employee_services: { service_id: string }[]
}

type BusyRow = {
  appointments: { scheduled_at: string; scheduled_end: string } | null
}

export async function getAvailableSlots(
  supabase: SupabaseClient,
  locationId: string,
  serviceIds: string[],
  date: string,
  preferredTime?: string | null,
): Promise<SlotOption[]> {
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay()

  // Tres queries independientes en paralelo
  const [{ data: lh }, { data: services }, { data: empRaw }] = await Promise.all([
    supabase
      .from('location_hours')
      .select('open_time, close_time')
      .eq('location_id', locationId)
      .eq('day_of_week', dayOfWeek)
      .lte('valid_from', date)
      .or(`valid_to.is.null,valid_to.gte.${date}`)
      .maybeSingle(),
    supabase
      .from('services')
      .select('id, duration_minutes')
      .in('id', serviceIds),
    supabase
      .from('employees')
      .select(`
        id,
        position,
        users!employees_user_id_fkey ( first_name, last_name ),
        employee_services!inner ( service_id )
      `)
      .eq('location_id', locationId)
      .eq('active', true)
      .in('employee_services.service_id', serviceIds),
  ])

  if (!lh?.open_time || !lh?.close_time) return []

  const salonOpen = timeToMin(lh.open_time)
  const salonClose = timeToMin(lh.close_time)
  const totalDuration = (services ?? []).reduce((s, svc) => s + (svc.duration_minutes ?? 0), 0)
  if (totalDuration === 0) return []

  const candidates = ((empRaw ?? []) as unknown as EmpRow[]).filter((e) => {
    const ids = e.employee_services.map((es) => es.service_id)
    return serviceIds.every((sid) => ids.includes(sid))
  })

  // Queries por empleado en paralelo (antes eran secuenciales: 3 queries × N empleados)
  const perEmpSlots = await Promise.all(
    candidates.map(async (emp) => {
      const [{ data: av }, { data: unavail }, { data: busyRaw }] = await Promise.all([
        supabase
          .from('employee_availability')
          .select('start_time, end_time')
          .eq('employee_id', emp.id)
          .eq('day_of_week', dayOfWeek)
          .lte('valid_from', date)
          .or(`valid_to.is.null,valid_to.gte.${date}`)
          .maybeSingle(),
        supabase
          .from('employee_unavailability')
          .select('id')
          .eq('employee_id', emp.id)
          .lte('start_date', date)
          .gte('end_date', date)
          .limit(1),
        supabase
          .from('appointment_services')
          .select(`appointments!inner ( scheduled_at, scheduled_end, status )`)
          .eq('employee_id', emp.id)
          .gte('appointments.scheduled_at', `${date}T00:00:00`)
          .lte('appointments.scheduled_at', `${date}T23:59:59`)
          .not('appointments.status', 'eq', 'cancelled'),
      ])

      if (!av || (unavail && unavail.length > 0)) return []

      const busy = ((busyRaw ?? []) as unknown as BusyRow[])
        .filter((r) => r.appointments)
        .map((r) => ({
          startMin: timeToMin(r.appointments!.scheduled_at.slice(11, 16)),
          endMin: timeToMin(r.appointments!.scheduled_end.slice(11, 16)),
        }))

      const winStart = Math.max(salonOpen, timeToMin(av.start_time))
      const winEnd = Math.min(salonClose, timeToMin(av.end_time))
      const fullName = [emp.users?.first_name, emp.users?.last_name].filter(Boolean).join(' ')
      const slots: SlotOption[] = []

      for (let t = winStart; t + totalDuration <= winEnd; t += SLOT_STEP) {
        const slotEnd = t + totalDuration
        if (busy.some((b) => t < b.endMin && slotEnd > b.startMin)) continue
        slots.push({
          start: dateTime(date, minToTime(t)).toISOString(),
          end: dateTime(date, minToTime(slotEnd)).toISOString(),
          employeeId: emp.id,
          employeeName: fullName || (emp.position ?? 'Profesional'),
        })
      }

      return slots
    }),
  )

  const all = perEmpSlots.flat().sort((a, b) => a.start.localeCompare(b.start))

  if (preferredTime) {
    const prefMin = timeToMin(preferredTime)
    const fromPref = all.filter((s) => timeToMin(s.start.slice(11, 16)) >= prefMin)
    if (fromPref.length >= 4) return fromPref.slice(0, 8)
    const before = all.filter((s) => timeToMin(s.start.slice(11, 16)) < prefMin).slice(-4)
    return [...before, ...fromPref].slice(0, 8)
  }

  return all.slice(0, 8)
}

export async function createBooking(
  supabase: SupabaseClient,
  params: {
    clientId: string
    locationId: string
    slot: SlotOption
    serviceIds: string[]
    source: string
  },
): Promise<{ id: string }> {
  const { clientId, locationId, slot, serviceIds, source } = params

  const { data: services } = await supabase
    .from('services')
    .select('id, duration_minutes, price')
    .in('id', serviceIds)

  const { data: appointment, error: apptErr } = await supabase
    .from('appointments')
    .insert({
      client_id: clientId,
      location_id: locationId,
      scheduled_at: slot.start,
      scheduled_end: slot.end,
      status: 'pending',
      source,
      paid: false,
    })
    .select('id')
    .single()

  if (apptErr) throw apptErr

  const apptServices = (services ?? []).map((s) => ({
    appointment_id: appointment.id,
    service_id: s.id,
    employee_id: slot.employeeId,
    duration_minutes: s.duration_minutes,
    price: s.price,
  }))

  const { error: svcErr } = await supabase.from('appointment_services').insert(apptServices)
  if (svcErr) {
    await supabase.from('appointments').delete().eq('id', appointment.id)
    throw svcErr
  }

  return { id: appointment.id }
}
