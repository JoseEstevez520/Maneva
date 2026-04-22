import { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type SlotOption = {
  start: string
  end: string
  employeeId: string
  employeeName: string
}

/**
 * Estado unificado de la reserva en curso.
 * Se persiste en ai_response de CADA mensaje saliente del bot,
 * garantizando que el contexto nunca se pierde entre mensajes.
 */
export type BookingProgress = {
  type: 'booking_progress'
  // Servicios identificados en la conversación
  serviceIds: string[]
  serviceNames: string[]
  // Última fecha consultada y resultado
  checkedDate: string | null
  checkedDateHadSlots: boolean
  // Slots disponibles mostrados al cliente (vacío si no se han mostrado)
  slots: SlotOption[]
  // Slot que el cliente eligió (antes de confirmar)
  selectedSlot: SlotOption | null
  // Flujo de invitado: esperando nombre para confirmar
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

/**
 * Parsea el ai_response del último mensaje del bot.
 * Migra formatos antiguos (slot_selection, no_slots, pending_booking) al nuevo.
 */
export function parseProgress(aiResponse: string | null): BookingProgress {
  if (!aiResponse) return emptyProgress()
  try {
    const ctx = JSON.parse(aiResponse)

    if (ctx.type === 'booking_progress') return ctx as BookingProgress

    // ── Migración de formatos anteriores ────────────────────────────────────────
    if (ctx.type === 'slot_selection') {
      const firstSlot: SlotOption | undefined = ctx.slots?.[0]
      return {
        ...emptyProgress(),
        serviceIds: ctx.serviceIds ?? [],
        serviceNames: [],
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
        checkedDateHadSlots: false,
      }
    }

    if (ctx.type === 'pending_booking') {
      return {
        ...emptyProgress(),
        serviceIds: ctx.serviceIds ?? [],
        serviceNames: [],
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

function dateTime(date: string, time: string): Date {
  const t = time.length === 5 ? `${time}:00` : time
  return new Date(`${date}T${t}`)
}

export async function getAvailableSlots(
  supabase: SupabaseClient,
  locationId: string,
  serviceIds: string[],
  date: string,
): Promise<SlotOption[]> {
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay()

  const { data: lh } = await supabase
    .from('location_hours')
    .select('open_time, close_time')
    .eq('location_id', locationId)
    .eq('day_of_week', dayOfWeek)
    .lte('valid_from', date)
    .or(`valid_to.is.null,valid_to.gte.${date}`)
    .maybeSingle()

  if (!lh?.open_time || !lh?.close_time) return []

  const salonOpen = timeToMin(lh.open_time)
  const salonClose = timeToMin(lh.close_time)

  const { data: services } = await supabase
    .from('services')
    .select('id, duration_minutes')
    .in('id', serviceIds)

  const totalDuration = (services ?? []).reduce((s, svc) => s + (svc.duration_minutes ?? 0), 0)
  if (totalDuration === 0) return []

  const { data: empRaw } = await supabase
    .from('employees')
    .select(`
      id,
      position,
      users!employees_user_id_fkey ( first_name, last_name ),
      employee_services!inner ( service_id )
    `)
    .eq('location_id', locationId)
    .eq('active', true)
    .in('employee_services.service_id', serviceIds)

  type EmpRaw = {
    id: string
    position: string | null
    users: { first_name: string | null; last_name: string | null } | null
    employee_services: { service_id: string }[]
  }

  const candidates = ((empRaw ?? []) as unknown as EmpRaw[]).filter((e) => {
    const ids = e.employee_services.map((es) => es.service_id)
    return serviceIds.every((sid) => ids.includes(sid))
  })

  const slots: SlotOption[] = []

  for (const emp of candidates) {
    const { data: av } = await supabase
      .from('employee_availability')
      .select('start_time, end_time')
      .eq('employee_id', emp.id)
      .eq('day_of_week', dayOfWeek)
      .lte('valid_from', date)
      .or(`valid_to.is.null,valid_to.gte.${date}`)
      .maybeSingle()

    if (!av) continue

    const { data: unavail } = await supabase
      .from('employee_unavailability')
      .select('id')
      .eq('employee_id', emp.id)
      .lte('start_date', date)
      .gte('end_date', date)
      .limit(1)

    if (unavail && unavail.length > 0) continue

    const { data: busyRaw } = await supabase
      .from('appointment_services')
      .select(`appointments!inner ( scheduled_at, scheduled_end, status )`)
      .eq('employee_id', emp.id)
      .gte('appointments.scheduled_at', `${date}T00:00:00`)
      .lte('appointments.scheduled_at', `${date}T23:59:59`)
      .not('appointments.status', 'eq', 'cancelled')

    type BusyRaw = { appointments: { scheduled_at: string; scheduled_end: string } | null }
    const busy = ((busyRaw ?? []) as unknown as BusyRaw[])
      .filter((r) => r.appointments)
      .map((r) => ({
        startMin: timeToMin(r.appointments!.scheduled_at.slice(11, 16)),
        endMin: timeToMin(r.appointments!.scheduled_end.slice(11, 16)),
      }))

    const winStart = Math.max(salonOpen, timeToMin(av.start_time))
    const winEnd = Math.min(salonClose, timeToMin(av.end_time))

    const fullName = [emp.users?.first_name, emp.users?.last_name].filter(Boolean).join(' ')

    for (let t = winStart; t + totalDuration <= winEnd; t += SLOT_STEP) {
      const slotEnd = t + totalDuration
      const overlaps = busy.some((b) => t < b.endMin && slotEnd > b.startMin)
      if (overlaps) continue

      slots.push({
        start: dateTime(date, minToTime(t)).toISOString(),
        end: dateTime(date, minToTime(slotEnd)).toISOString(),
        employeeId: emp.id,
        employeeName: fullName || (emp.position ?? 'Profesional'),
      })
    }
  }

  slots.sort((a, b) => a.start.localeCompare(b.start))
  return slots.slice(0, 8)
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
