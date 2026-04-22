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

    // 3. Cargar historial de las últimas 24h (máx 80 mensajes, orden cronológico)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('direction, message, ai_response')
      .eq('phone_number', phone)
      .eq('location_id', locationId)
      .gte('created_at', since24h)
      .order('created_at', { ascending: true })
      .limit(80)

    const conversationHistory: ChatMessage[] = (history ?? []).map((msg) => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.message ?? '',
    } as ChatMessage))

    // 4. Recuperar el estado de reserva del último mensaje saliente
    const lastOutbound = [...(history ?? [])].reverse().find((m) => m.direction === 'outbound')
    const progress = parseProgress(lastOutbound?.ai_response ?? null)

    // 5. Construir prompt con estado completo
    const systemPrompt = buildSystemPrompt({
      locationName: location?.name ?? 'la peluquería',
      services: services ?? [],
      userName: userRow?.first_name ?? null,
      isGuest: userId === null,
      progress,
    })

    // 6. Llamar a la IA
    const aiResponse = await callAIWithFallback(
      [{ role: 'system', content: systemPrompt }, ...conversationHistory, { role: 'user', content: userMessage }],
      GROQ_API_KEY,
      OPENAI_API_KEY,
    )

    // 7. Ejecutar acción o actualizar estado a partir de lo que la IA extrajo
    let replyText = aiResponse.reply
    let nextProgress: BookingProgress = { ...progress }

    // Si la IA identificó servicios aunque no haya acción, persistirlos
    if (aiResponse.bookingState?.serviceIds?.length) {
      nextProgress = {
        ...nextProgress,
        serviceIds: aiResponse.bookingState.serviceIds,
        serviceNames: aiResponse.bookingState.serviceNames ?? nextProgress.serviceNames,
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

    // 8. Guardar mensajes (entrante + respuesta con estado persistido)
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
      ai_response: JSON.stringify(nextProgress),  // SIEMPRE guardamos el estado
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
  progress: BookingProgress
}): string {
  const { locationName, services, userName, isGuest, progress } = params
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // Lista de servicios con nombres coloquiales de ayuda al mapeo
  const servicesList = services
    .map((s) => {
      const aliases = buildAliases(s.name)
      return `  • ${s.name}${aliases} — ${s.duration_minutes} min, ${s.price}€  [ID: ${s.id}]`
    })
    .join('\n')

  // Sección de estado actual de la reserva
  const stateSection = buildStateSection(progress, services)

  // Instrucción específica de invitado
  const guestNote = isGuest
    ? `\n⚠️  CLIENTE SIN CUENTA: Puede reservar sin problema. No pidas email ni contraseña. Cuando elija un slot, el sistema le pedirá automáticamente el nombre — tú no lo hagas antes.`
    : ''

  return `Eres el asistente de reservas de "${locationName}"${userName ? ` (hablando con ${userName})` : ''}. Tu único objetivo es ayudar a concretar citas por WhatsApp de forma rápida y natural.

════════════════════════════════════════
SERVICIOS DISPONIBLES
════════════════════════════════════════
${servicesList}

════════════════════════════════════════
FECHA Y HORA ACTUAL
════════════════════════════════════════
Hoy: ${todayStr} (${format(today, "EEEE d 'de' MMMM", { locale: es })})
Mañana: ${nextDay(todayStr)}
Próximo lunes: ${nextWeekday(today, 1)}
Próximo martes: ${nextWeekday(today, 2)}
Próximo miércoles: ${nextWeekday(today, 3)}
Próximo jueves: ${nextWeekday(today, 4)}
Próximo viernes: ${nextWeekday(today, 5)}

════════════════════════════════════════
FLUJO DE RESERVA — SIGUE ESTE ORDEN
════════════════════════════════════════
PASO 1 — ENTENDER QUÉ QUIERE
  La gente habla de forma natural. Ejemplos de mapeo:
  "cortarme el pelo" → Corte de Caballero o Corte de Dama según contexto
  "la barba" / "afeitarme" / "arreglarme la barba" → Barba y Afeitado
  "teñirme" / "el tinte" / "cambiar de color" → Tinte Completo
  "mechas" / "balayage" / "rayitos" → Mechas Balayage
  "peinarme para una boda/evento/fiesta" → Peinado Evento
  "la manicura" / "las uñas" → Manicura
  Si NO puedes identificar el servicio exacto con certeza → pregunta UNA VEZ de forma directa.
  Si sí puedes identificarlo → guárdalo en bookingState y continúa.

PASO 2 — OBTENER LA FECHA
  Interpreta siempre fechas relativas:
  "mañana" → ${nextDay(todayStr)}
  "pasado mañana" → ${nextDay(nextDay(todayStr))}
  "el viernes" → primer viernes futuro (${nextWeekday(today, 5)})
  "la semana que viene" → lunes ${nextWeekday(today, 1)}
  "en dos semanas" → ${nextWeekday(today, 1)} + 7 días
  En cuanto tengas servicio + fecha → ejecuta check_availability INMEDIATAMENTE sin preguntar más.

PASO 3 — MOSTRAR DISPONIBILIDAD
  Si hay huecos → muéstralos numerados, incluye hora y nombre del profesional.
  Si no hay huecos → di cuándo no hay y ofrece buscar el día siguiente tú mismo.
  Cuando el cliente elija un número o mencione una hora → action "book" con ese slotIndex.

PASO 4 — CONFIRMAR
  Usuario registrado → cita confirmada directamente.
  Invitado → pedir nombre → action "create_guest_and_book".

════════════════════════════════════════
REGLAS ESTRICTAS
════════════════════════════════════════
1. NUNCA digas "tenemos disponibilidad el X" sin haber ejecutado check_availability antes.
2. NUNCA preguntes más de una cosa en el mismo mensaje.
3. Si el cliente ya dio el servicio en esta conversación → NO lo vuelvas a preguntar.
4. Si ya diste fecha y servicio → ejecuta check_availability, no preguntes nada más.
5. Respuestas máximo 3 frases, tono amable e informal.
6. Si el cliente saluda o pregunta qué hacéis → responde brevemente y pregunta en qué puedes ayudar.
7. Si el cliente da servicio Y fecha en el mismo mensaje → ejecuta check_availability directamente.
8. "busca otro" / "prueba otro día" / "¿y mañana?" → usa los serviceIds del estado actual y busca la nueva fecha.${guestNote}

════════════════════════════════════════
FORMATO DE RESPUESTA — SIEMPRE JSON
════════════════════════════════════════
{
  "reply": "<mensaje para el cliente>",
  "action": null,
  "bookingState": { "serviceIds": ["<id>"], "serviceNames": ["<nombre>"] }
}

El campo "bookingState" es OBLIGATORIO en cuanto identifiques uno o más servicios.
Si no hay servicios identificados todavía, omite bookingState o ponlo vacío.

ACCIONES DISPONIBLES (sustituye null por el objeto):
  check_availability:      {"type": "check_availability", "serviceIds": ["<id>"], "date": "<YYYY-MM-DD>"}
  book (slot elegido):     {"type": "book", "slotIndex": <0-based>, "serviceIds": ["<id>"]}
  reserva invitado:        {"type": "create_guest_and_book", "firstName": "<nombre>"}
  cancelar cita:           {"type": "cancel", "appointmentId": "<id>"}
  ver mis citas:           {"type": "list_appointments"}

${stateSection}`
}

/** Genera sugerencias de nombres coloquiales para el prompt de mapeo */
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

/** Construye la sección de estado actual visible para el modelo */
function buildStateSection(progress: BookingProgress, services: ServiceRow[]): string {
  if (progress.serviceIds.length === 0 && !progress.checkedDate && !progress.selectedSlot) {
    return '' // Sin estado previo, no añadir nada
  }

  const lines: string[] = ['════════════════════════════════════════', 'ESTADO ACTUAL DE ESTA RESERVA', '════════════════════════════════════════']

  if (progress.serviceIds.length > 0) {
    const names = progress.serviceIds
      .map((id) => services.find((s) => s.id === id)?.name ?? id)
      .join(', ')
    lines.push(`Servicios identificados: ${names}`)
    lines.push(`IDs: ${JSON.stringify(progress.serviceIds)}`)
  }

  if (progress.awaitingGuestName && progress.selectedSlot) {
    lines.push('')
    lines.push(`▶ ACCIÓN INMEDIATA: El cliente eligió ${formatSlotForUser(progress.selectedSlot)} con ${progress.selectedSlot.employeeName}.`)
    lines.push(`  Está pendiente de dar su nombre. Su PRÓXIMO mensaje ES su nombre.`)
    lines.push(`  Cuando lo diga → action "create_guest_and_book" con firstName = lo que diga.`)
    lines.push(`  Ejemplo si dice "Ana" → {"type":"create_guest_and_book","firstName":"Ana"}`)
    return lines.join('\n')
  }

  if (progress.slots.length > 0) {
    lines.push('')
    lines.push(`▶ SLOTS DISPONIBLES (el cliente está eligiendo):`)
    progress.slots.forEach((s, i) => {
      lines.push(`  ${i + 1}. ${formatSlotForUser(s)} con ${s.employeeName} [start:${s.start}|end:${s.end}|emp:${s.employeeId}]`)
    })
    lines.push(`  Cuando elija un número o mencione una hora → action "book" con slotIndex (0-based) y serviceIds: ${JSON.stringify(progress.serviceIds)}.`)
    return lines.join('\n')
  }

  if (progress.checkedDate) {
    if (progress.checkedDateHadSlots) {
      lines.push(`Última fecha consultada: ${progress.checkedDate} (había huecos pero el cliente no eligió ninguno)`)
    } else {
      lines.push(`Última fecha consultada: ${progress.checkedDate} → SIN DISPONIBILIDAD`)
      lines.push(`▶ Si dice "busca otro"/"prueba otro día" → check_availability con serviceIds: ${JSON.stringify(progress.serviceIds)} y fecha: ${nextDay(progress.checkedDate)}`)
    }
  }

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
    const slots = await getAvailableSlots(supabase, locationId, action.serviceIds, action.date)
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

    // Invitado → pedir nombre
    if (!userId) {
      return {
        reply: `¡Perfecto! Para confirmar el ${formatSlotForUser(slot)} con ${slot.employeeName} solo necesito tu nombre. ¿Cómo te llamas?`,
        progress: { ...progress, selectedSlot: slot, awaitingGuestName: true },
      }
    }

    // Usuario registrado → confirmar directamente
    const booking = await createBooking(supabase, {
      clientId: userId,
      locationId,
      slot,
      serviceIds: action.serviceIds?.length ? action.serviceIds : progress.serviceIds,
      source: 'whatsapp',
    })

    return {
      reply: `✅ ¡Cita confirmada! El ${formatSlotForUser(slot)} con ${slot.employeeName}.\nID: ${booking.id.slice(0, 8).toUpperCase()}\n\nTe esperamos 😊`,
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

    // Crear cuenta Auth mínima con teléfono
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

    // Upsert en tabla users (por si no existe trigger automático)
    await supabase.from('users').upsert({ id: guestId, phone, first_name: firstName })

    const booking = await createBooking(supabase, {
      clientId: guestId,
      locationId,
      slot,
      serviceIds: progress.serviceIds,
      source: 'whatsapp',
    })

    return {
      reply: `✅ ¡Listo, ${firstName}! Cita confirmada para el ${formatSlotForUser(slot)} con ${slot.employeeName}.\nID: ${booking.id.slice(0, 8).toUpperCase()}\n\nTe esperamos 😊 Si quieres gestionar tus citas desde el móvil, descarga Maneva y regístrate con este número.`,
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

    if (error) return { reply: 'No pude cancelar esa cita. ¿El ID es correcto?', progress }
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

/** Devuelve la fecha del próximo día de la semana (1=lunes, 5=viernes) */
function nextWeekday(from: Date, targetDay: number): string {
  const d = new Date(from)
  d.setHours(12, 0, 0, 0)
  const current = d.getDay() // 0=domingo
  // Normalizar: JavaScript usa 0=domingo, nosotros 1=lunes..7=domingo
  const jsTarget = targetDay % 7  // lunes=1→1, domingo=7→0
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
