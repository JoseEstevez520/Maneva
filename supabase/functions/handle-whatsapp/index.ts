import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseTwilioWebhook, normalizePhone, twimlResponse } from '../_shared/twilio.ts'
import { callAIWithFallback, ChatMessage } from '../_shared/groq.ts'
import {
  getAvailableSlots,
  createBooking,
  BookingProgress,
  SlotOption,
  emptyProgress,
  parseProgress,
} from '../_shared/booking.ts'
import { format, parseISO } from 'npm:date-fns@3'
import { es } from 'npm:date-fns@3/locale'

// ─── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? null
const DEFAULT_LOCATION_ID = Deno.env.get('DEFAULT_LOCATION_ID')!

const GENERIC_ERROR_MSG =
  'Lo siento, en este momento no puedo atenderte. Por favor inténtalo de nuevo en unos minutos o llámanos directamente.'

// ─── Handler principal ─────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const rawBody = await req.text()

  try {
    const { from, to, body: userMessage } = parseTwilioWebhook(rawBody)
    const phone = normalizePhone(from)
    const toPhone = normalizePhone(to)

    if (!phone || !userMessage.trim()) return twimlResponse('Mensaje vacío recibido.')

    // 1. Identificar usuario por teléfono
    const { data: userRow } = await supabase
      .from('users')
      .select('id, first_name')
      .eq('phone', phone)
      .maybeSingle()

    const userId: string | null = userRow?.id ?? null

    // 2. Resolver location por número WhatsApp destino
    const locationId = await resolveLocationId(toPhone)

    const { data: location } = await supabase
      .from('salon_locations')
      .select('name')
      .eq('id', locationId)
      .single()

    const { data: services } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price, category')
      .eq('location_id', locationId)
      .eq('active', true)

    // 3. Cargar historial de las últimas 24h (máx 20 mensajes — menos contexto basura, más foco)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('direction, message, ai_response')
      .eq('phone_number', phone)
      .eq('location_id', locationId)
      .gte('created_at', since24h)
      .order('created_at', { ascending: true })
      .limit(20)

    const conversationHistory: ChatMessage[] = (history ?? []).map((msg) => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.message ?? '',
    } as ChatMessage))

    // 4. Recuperar el estado de reserva del último mensaje saliente
    const lastOutbound = [...(history ?? [])].reverse().find((m) => m.direction === 'outbound')
    const progress = parseProgress(lastOutbound?.ai_response ?? null)

    const todayStr = new Date().toISOString().slice(0, 10)

    // 5. Construir system prompt (sin estado — el estado va en el mensaje del usuario)
    const systemPrompt = buildSystemPrompt({
      locationName: location?.name ?? 'la peluquería',
      services: services ?? [],
      userName: userRow?.first_name ?? null,
      isGuest: userId === null,
    })

    // 6. Inyectar el estado de la reserva DENTRO del mensaje del usuario.
    //    Los modelos siempre leen el mensaje actual con máxima atención.
    //    Esto evita que olviden el servicio o los slots entre mensajes.
    const contextPrefix = buildContextPrefix(progress, services ?? [], todayStr)
    const messageForAI = contextPrefix
      ? `${contextPrefix}\n\nCliente dice: "${userMessage}"`
      : userMessage

    // 7. Llamar a la IA
    const aiResponse = await callAIWithFallback(
      [{ role: 'system', content: systemPrompt }, ...conversationHistory, { role: 'user', content: messageForAI }],
      GROQ_API_KEY,
      OPENAI_API_KEY,
    )

    // 8. Ejecutar acción o actualizar estado
    let replyText = aiResponse.reply
    let nextProgress: BookingProgress = { ...progress }

    if (aiResponse.bookingState?.serviceIds?.length) {
      nextProgress = {
        ...nextProgress,
        serviceIds: aiResponse.bookingState.serviceIds,
        serviceNames: aiResponse.bookingState.serviceNames ?? nextProgress.serviceNames,
      }
    }

    // Safety net: si la IA olvidó devolver bookingState, detectar el servicio del texto
    // Busca en el mensaje del usuario Y en la última respuesta del bot (el bot suele repetir el nombre del servicio)
    if (nextProgress.serviceIds.length === 0) {
      const detected = detectServiceFromRecent(userMessage, lastOutbound?.message ?? '', services ?? [])
      if (detected) {
        nextProgress = { ...nextProgress, serviceIds: [detected.id], serviceNames: [detected.name] }
      }
    }

    if (aiResponse.action) {
      const result = await handleAction({
        action: aiResponse.action,
        locationId,
        userId,
        phone,
        progress,
        services: services ?? [],
      })
      replyText = result.reply
      nextProgress = result.progress
    }

    // 9. Guardar mensajes con estado persistido
    await supabase.from('whatsapp_messages').insert({
      phone_number: phone,
      location_id: locationId,
      direction: 'inbound',
      message: userMessage,
      user_id: userId,
      processed_by_ai: true,
    })

    await supabase.from('whatsapp_messages').insert({
      phone_number: phone,
      location_id: locationId,
      direction: 'outbound',
      message: replyText,
      user_id: userId,
      ai_response: JSON.stringify(nextProgress),
      processed_by_ai: true,
    })

    return twimlResponse(replyText)
  } catch (err) {
    console.error('handle-whatsapp error:', err)
    return twimlResponse(GENERIC_ERROR_MSG)
  }
})

// ─── Resolución de location ────────────────────────────────────────────────────
async function resolveLocationId(toPhone: string): Promise<string> {
  const { data } = await supabase
    .from('booking_channels')
    .select('location_id')
    .eq('channel_type', 'whatsapp')
    .eq('channel_identifier', toPhone)
    .eq('active', true)
    .maybeSingle()

  return data?.location_id ?? DEFAULT_LOCATION_ID
}

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type ServiceRow = {
  id: string
  name: string
  duration_minutes: number
  price: number
  category: string | null
}

// ─── Prompt del sistema ────────────────────────────────────────────────────────
function buildSystemPrompt(params: {
  locationName: string
  services: ServiceRow[]
  userName: string | null
  isGuest: boolean
}): string {
  const { locationName, services, userName, isGuest } = params
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const servicesList = services
    .map((s) => {
      const aliases = buildAliases(s.name)
      return `  • ${s.name}${aliases} — ${s.duration_minutes} min, ${s.price}€  [ID: ${s.id}]`
    })
    .join('\n')

  const guestNote = isGuest
    ? `\n⚠️  CLIENTE SIN CUENTA: Puede reservar sin problema. No pidas email ni contraseña. Cuando elija un slot, el sistema le pedirá automáticamente el nombre — tú no lo hagas antes.`
    : ''

  return `Eres el asistente de reservas de "${locationName}"${userName ? ` (hablando con ${userName})` : ''}. Ayudas a reservar citas por WhatsApp de forma rápida y natural.

════════════════════════════════════════
TU RESPUESTA SIEMPRE DEBE SER ESTE JSON (sin texto fuera del JSON):
{
  "reply": "<mensaje corto y amable para el cliente>",
  "action": <acción o null>,
  "bookingState": { "serviceIds": ["<id>"], "serviceNames": ["<nombre>"] }
}
REGLAS CRÍTICAS:
• "bookingState" es SIEMPRE obligatorio. Si aún no sabes el servicio → arrays vacíos. Si ya lo sabes → rellénalo SIEMPRE aunque no haya acción.
• NUNCA pongas IDs UUID, timestamps ISO ni datos del [RECUERDO] en el campo "reply". Solo texto natural en español.
• NUNCA inventes disponibilidad sin ejecutar check_availability.
════════════════════════════════════════

════════════════════════════════════════
SERVICIOS DISPONIBLES (usa exactamente estos IDs)
════════════════════════════════════════
${servicesList}

════════════════════════════════════════
FECHAS DE REFERENCIA (hoy es ${todayStr})
════════════════════════════════════════
Hoy:               ${todayStr} (${format(today, "EEEE d 'de' MMMM", { locale: es })})
Mañana:            ${nextDay(todayStr)}
Pasado mañana:     ${nextDay(nextDay(todayStr))}
Próximo lunes:     ${nextWeekday(today, 1)}
Próximo martes:    ${nextWeekday(today, 2)}
Próximo miércoles: ${nextWeekday(today, 3)}
Próximo jueves:    ${nextWeekday(today, 4)}
Próximo viernes:   ${nextWeekday(today, 5)}

════════════════════════════════════════
FLUJO DE RESERVA
════════════════════════════════════════

PASO 1 — IDENTIFICAR EL SERVICIO:
  "cortarme el pelo"/"un corte" → pregunta si es caballero o dama si no hay contexto
  "la barba"/"afeitarme" → Barba y Afeitado
  "teñirme"/"el tinte" → Tinte Completo
  "mechas"/"balayage"/"rayitos" → Mechas Balayage
  "peinarme para boda/evento" → Peinado Evento
  "la manicura"/"las uñas" → Manicura
  → En cuanto lo identifiques: ponlo en bookingState. Solo una pregunta si no queda claro.

PASO 2 — OBTENER LA FECHA:
  → Servicio + fecha → check_availability INMEDIATAMENTE.
  → Si menciona hora además de fecha (ej: "viernes a las 11:45") → inclúyela en "preferredTime": "11:45".

PASO 3 — MOSTRAR Y ELEGIR SLOT:
  → Muéstralos numerados: "1. viernes 25 a las 10:00 – Ana García"
  → Cliente elige número N → action "book" con slotIndex: N-1 (0-based).

PASO 4 — CONFIRMAR:
  → Usuario registrado: confirmar directamente con action "book".
  → Cliente sin cuenta: pedir solo el nombre → action "create_guest_and_book" con firstName.

REGLAS GENERALES:
  • Máximo 3 frases por mensaje. Tono amable e informal.
  • NUNCA preguntes más de una cosa a la vez.
  • Si el [RECUERDO] indica que ya hay un servicio elegido: NO lo preguntes de nuevo.
  • Si dice "busca otro día" → check_availability con los mismos serviceIds del [RECUERDO].${guestNote}

════════════════════════════════════════
ACCIONES DISPONIBLES
════════════════════════════════════════
check_availability: {"type":"check_availability","serviceIds":["<id>"],"date":"<YYYY-MM-DD>","preferredTime":"<HH:MM opcional>"}
book:               {"type":"book","slotIndex":<número 0-based>,"serviceIds":["<id>"]}
invitado:           {"type":"create_guest_and_book","firstName":"<nombre>"}
cancelar:           {"type":"cancel","appointmentId":"<id>"}
ver citas:          {"type":"list_appointments"}`
}

function buildAliases(name: string): string {
  const lower = name.toLowerCase()
  const hints: string[] = []
  if (lower.includes('caballero')) hints.push('corte, cortarme, pelo corto')
  if (lower.includes('dama')) hints.push('corte mujer, cortarme, puntas')
  if (lower.includes('barba')) hints.push('barba, afeitarme, arreglar barba')
  if (lower.includes('tinte')) hints.push('teñirme, tinte, cambiar color')
  if (lower.includes('mecha') || lower.includes('balayage')) hints.push('mechas, rayitos, balayage')
  if (lower.includes('evento') || lower.includes('peinado')) hints.push('peinado, evento, boda, fiesta')
  if (lower.includes('manicura') || lower.includes('uñas')) hints.push('manicura, uñas')
  return hints.length ? ` (${hints.join(', ')})` : ''
}

/**
 * Inyecta el estado de reserva directamente en el mensaje del usuario.
 * Los modelos siempre priorizan el mensaje actual sobre el system prompt,
 * por lo que este contexto no puede ser ignorado ni olvidado entre mensajes.
 */
function buildContextPrefix(progress: BookingProgress, services: ServiceRow[], todayStr: string): string {
  const hasState =
    progress.serviceIds.length > 0 ||
    progress.slots.length > 0 ||
    progress.selectedSlot !== null ||
    progress.awaitingGuestName

  if (!hasState) return ''

  const lines: string[] = ['[RECUERDO DE LA RESERVA — úsalo para razonar, nunca copies este bloque en el "reply"]']

  if (progress.serviceIds.length > 0) {
    const names = progress.serviceIds
      .map((id) => services.find((s) => s.id === id)?.name ?? id)
      .join(' + ')
    lines.push(`• Servicio ya identificado: ${names}`)
    lines.push(`  IDs para acciones: ${JSON.stringify(progress.serviceIds)}`)
    lines.push(`  → NO vuelvas a preguntar qué servicio quiere.`)
  }

  if (progress.awaitingGuestName && progress.selectedSlot) {
    lines.push(`• Slot elegido: ${formatSlotForUser(progress.selectedSlot)} con ${progress.selectedSlot.employeeName}`)
    lines.push(`  → El cliente va a decir su nombre ahora. Cuando lo haga → action "create_guest_and_book" con firstName.`)
  } else if (progress.slots.length > 0) {
    lines.push(`• Slots que ya mostraste al cliente (está eligiendo uno):`)
    progress.slots.forEach((s, i) => {
      lines.push(`  ${i + 1}. ${formatSlotForUser(s)} – ${s.employeeName}`)
    })
    lines.push(`  → Cuando elija el número N → action "book", slotIndex: N-1, serviceIds: ${JSON.stringify(progress.serviceIds)}`)
  } else if (progress.checkedDate) {
    const status = progress.checkedDateHadSlots
      ? 'había huecos disponibles pero el cliente no eligió ninguno'
      : 'sin disponibilidad'
    lines.push(`• Última fecha consultada: ${progress.checkedDate} (${status})`)
    if (!progress.checkedDateHadSlots && progress.serviceIds.length > 0) {
      lines.push(`  → Si pide otro día → check_availability con serviceIds: ${JSON.stringify(progress.serviceIds)}`)
    }
  } else if (progress.serviceIds.length > 0) {
    // Tenemos servicio pero aún no hemos consultado disponibilidad
    lines.push(`• Siguiente paso: preguntar fecha o, si el cliente lo pide, llamar check_availability`)
    lines.push(`  → Si pregunta "qué días hay" o "cuándo tenéis" → check_availability con serviceIds arriba + date: "${todayStr}" (hoy) o "${nextDay(todayStr)}" (mañana)`)
  }

  lines.push('[/RECUERDO]')
  return lines.join('\n')
}

// ─── Acciones ──────────────────────────────────────────────────────────────────
async function handleAction(params: {
  action: NonNullable<Awaited<ReturnType<typeof callAIWithFallback>>['action']>
  locationId: string
  userId: string | null
  phone: string
  progress: BookingProgress
  services: ServiceRow[]
}): Promise<{ reply: string; progress: BookingProgress }> {
  const { action, locationId, userId, phone, progress, services } = params

  // ── check_availability ────────────────────────────────────────────────────────
  if (action.type === 'check_availability') {
    const slots = await getAvailableSlots(supabase, locationId, action.serviceIds, action.date, action.preferredTime ?? null)
    const serviceNames = action.serviceIds.map((id) => services.find((s) => s.id === id)?.name ?? id)

    const base: BookingProgress = {
      ...progress,
      serviceIds: action.serviceIds,
      serviceNames,
      checkedDate: action.date,
      checkedDateHadSlots: slots.length > 0,
      slots,
      selectedSlot: null,
      awaitingGuestName: false,
    }

    if (slots.length === 0) {
      return {
        reply: `Sin disponibilidad para ${serviceNames.join(' y ')} el ${formatDate(action.date)}. ¿Busco el día siguiente (${formatDate(nextDay(action.date))})?`,
        progress: base,
      }
    }

    const slotList = slots.map((s, i) => `${i + 1}. ${formatSlotForUser(s)} – ${s.employeeName}`).join('\n')
    return {
      reply: `Disponibilidad para el ${formatDate(action.date)}:\n\n${slotList}\n\n¿Cuál te viene bien?`,
      progress: base,
    }
  }

  // ── book ──────────────────────────────────────────────────────────────────────
  if (action.type === 'book') {
    const slotsToUse = progress.slots.length > 0 ? progress.slots : []

    if (slotsToUse.length === 0 || action.slotIndex === undefined) {
      return {
        reply: 'No encontré huecos disponibles. Dime el servicio y la fecha que prefieres.',
        progress,
      }
    }

    const slot: SlotOption | undefined = slotsToUse[action.slotIndex]
    if (!slot) {
      const max = slotsToUse.length
      return {
        reply: `Elige un número entre 1 y ${max}, por favor.`,
        progress,
      }
    }

    if (!userId) {
      return {
        reply: `¡Perfecto! Para confirmar el ${formatSlotForUser(slot)} con ${slot.employeeName} solo necesito tu nombre. ¿Cómo te llamas?`,
        progress: { ...progress, selectedSlot: slot, awaitingGuestName: true },
      }
    }

    const booking = await createBooking(supabase, {
      clientId: userId,
      locationId,
      slot,
      serviceIds: action.serviceIds?.length ? action.serviceIds : progress.serviceIds,
      source: 'whatsapp',
    })

    return {
      reply: `✅ ¡Cita confirmada! El ${formatSlotForUser(slot)} con ${slot.employeeName}.\nReferencia: ${booking.id.slice(0, 8).toUpperCase()}\n\nTe esperamos 😊`,
      progress: emptyProgress(),
    }
  }

  // ── create_guest_and_book ─────────────────────────────────────────────────────
  if (action.type === 'create_guest_and_book') {
    const slot = progress.selectedSlot
    if (!slot) {
      return {
        reply: 'No encontré la cita pendiente. ¿Puedes indicarme de nuevo qué servicio y fecha quieres?',
        progress: emptyProgress(),
      }
    }

    const firstName = action.firstName?.trim()
    if (!firstName) {
      return {
        reply: '¿Cómo te llamas? Solo dime tu nombre.',
        progress,
      }
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      phone,
      phone_confirm: true,
      user_metadata: { first_name: firstName },
    })

    if (authError || !authData?.user) {
      console.error('Error creating guest user:', authError)
      return {
        reply: 'Hubo un problema técnico. Inténtalo de nuevo en un momento.',
        progress,
      }
    }

    const guestId = authData.user.id
    await supabase.from('users').upsert({ id: guestId, phone, first_name: firstName })

    const booking = await createBooking(supabase, {
      clientId: guestId,
      locationId,
      slot,
      serviceIds: progress.serviceIds,
      source: 'whatsapp',
    })

    return {
      reply: `✅ ¡Listo, ${firstName}! Cita confirmada para el ${formatSlotForUser(slot)} con ${slot.employeeName}.\nReferencia: ${booking.id.slice(0, 8).toUpperCase()}\n\nTe esperamos 😊`,
      progress: emptyProgress(),
    }
  }

  // ── cancel ────────────────────────────────────────────────────────────────────
  if (action.type === 'cancel') {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', action.appointmentId)
      .eq('client_id', userId ?? '')

    if (error) return { reply: 'No pude cancelar esa cita. ¿La referencia es correcta?', progress }
    return { reply: '❌ Cita cancelada correctamente.', progress: emptyProgress() }
  }

  // ── list_appointments ─────────────────────────────────────────────────────────
  if (action.type === 'list_appointments') {
    if (!userId) return { reply: 'No encontré tu cuenta. Regístrate en la app con este número de teléfono.', progress }

    const now = new Date().toISOString()
    const { data: appts } = await supabase
      .from('appointments')
      .select(`scheduled_at, status, appointment_services ( services ( name ) )`)
      .eq('client_id', userId)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(3)

    if (!appts || appts.length === 0) {
      return { reply: 'No tienes citas próximas.', progress }
    }

    type ApptRow = {
      scheduled_at: string
      status: string
      appointment_services: { services: { name: string } | null }[]
    }

    const list = (appts as unknown as ApptRow[])
      .map((a) => {
        const svcName = a.appointment_services?.[0]?.services?.name ?? 'Servicio'
        return `• ${svcName} – ${formatDateTime(a.scheduled_at)}`
      })
      .join('\n')

    return { reply: `Tus próximas citas:\n\n${list}`, progress }
  }

  return { reply: 'No entendí esa acción.', progress }
}

// ─── Detección determinista de servicios ──────────────────────────────────────
/**
 * Safety net: si la IA no devuelve bookingState, detectamos el servicio
 * del texto del cliente y/o de la última respuesta del bot.
 * El bot suele repetir el nombre del servicio ("Genial, un tinte completo..."),
 * lo que hace que la detección desde su respuesta sea muy fiable.
 * Solo devuelve resultado cuando hay coincidencia ÚNICA (evita falsos positivos).
 */
function detectServiceFromRecent(
  userMessage: string,
  lastBotReply: string,
  services: ServiceRow[],
): ServiceRow | null {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()

  const searchText = normalize(userMessage + ' ' + lastBotReply)
  const matched: ServiceRow[] = []

  for (const svc of services) {
    const candidates = [svc.name, ...getServiceKeywords(svc.name)]
    const hits = candidates.some((c) => searchText.includes(normalize(c)))
    if (hits && !matched.find((m) => m.id === svc.id)) {
      matched.push(svc)
    }
  }

  return matched.length === 1 ? matched[0] : null
}

function getServiceKeywords(name: string): string[] {
  const lower = name.toLowerCase()
  const kw: string[] = []

  if (lower.includes('tinte') || lower.includes('color')) {
    kw.push('tinte', 'tintado', 'tintura', 'teñir', 'coloracion', 'coloración', 'teñirme')
  }
  if (lower.includes('barba')) {
    kw.push('barba', 'afeitar', 'afeitado', 'afeitarme')
  }
  if (lower.includes('mecha') || lower.includes('balayage')) {
    kw.push('mechas', 'mecha', 'balayage', 'rayitos', 'mechones')
  }
  if (lower.includes('peinado') || lower.includes('evento')) {
    kw.push('peinado', 'peinar', 'evento', 'boda', 'fiesta', 'ceremonia')
  }
  if (lower.includes('manicura')) {
    kw.push('manicura', 'unas', 'uñas', 'manos')
  }
  // 'corte' no se incluye — es ambiguo (caballero vs dama)

  return kw
}

// ─── Utilidades de fecha ───────────────────────────────────────────────────────
function nextDay(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  } catch {
    return dateStr
  }
}

function nextWeekday(from: Date, targetDay: number): string {
  const d = new Date(from)
  d.setHours(12, 0, 0, 0)
  const current = d.getDay()
  const jsTarget = targetDay % 7
  let daysAhead = jsTarget - current
  if (daysAhead <= 0) daysAhead += 7
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

function formatSlotForUser(slot: SlotOption): string {
  try {
    return format(parseISO(slot.start), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
  } catch {
    return slot.start
  }
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })
  } catch {
    return dateStr
  }
}

function formatDateTime(isoStr: string): string {
  try {
    return format(parseISO(isoStr), "d MMM 'a las' HH:mm", { locale: es })
  } catch {
    return isoStr
  }
}
