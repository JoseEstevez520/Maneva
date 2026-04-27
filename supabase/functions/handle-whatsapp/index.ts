/**
 * handle-whatsapp — Edge Function autónoma (Twilio → DeepSeek → Supabase)
 * ─────────────────────────────────────────────────────────────────────────────
 * FLUJO:
 *   1. Recibe webhook de Twilio (POST form-urlencoded)
 *   2. Identifica usuario y carga contexto del salón
 *   3. Recupera BookingProgress del último mensaje del bot (memoria persistente)
 *   4. Llama a DeepSeek con historial + estado actual
 *   5. Ejecuta la acción devuelta (consultar huecos, reservar, cancelar…)
 *   6. Guarda ambos mensajes en whatsapp_messages con el nuevo BookingProgress
 *   7. Responde a Twilio con TwiML
 *
 * VARIABLES DE ENTORNO:
 *   SUPABASE_URL              — automática
 *   SUPABASE_SERVICE_ROLE_KEY — automática
 *   DEEPSEEK_API_KEY          — tu API key de DeepSeek
 *   DEFAULT_LOCATION_ID       — UUID del salón por defecto
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseTwilioWebhook, normalizePhone, twimlResponse, errorResponse } from '../_shared/twilio.ts'
import { callDeepSeek, ChatMessage, AIResponse } from '../_shared/deepseek.ts'
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

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!
const DEFAULT_LOCATION_ID = Deno.env.get('DEFAULT_LOCATION_ID')!

// ─── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const rawBody = await req.text()

  try {
    const { from, to, body: userMessage } = parseTwilioWebhook(rawBody)
    const phone = normalizePhone(from)
    const toPhone = normalizePhone(to)

    if (!phone || !userMessage.trim()) return twimlResponse('')

    // 1. Resolver salón por número de WhatsApp de destino
    const { data: channel } = await supabase
      .from('booking_channels')
      .select('location_id')
      .eq('channel_type', 'whatsapp')
      .eq('channel_identifier', toPhone)
      .eq('active', true)
      .maybeSingle()

    const locationId = channel?.location_id ?? DEFAULT_LOCATION_ID

    // 2. Identificar usuario por teléfono
    const { data: userRow } = await supabase
      .from('users')
      .select('id, first_name')
      .eq('phone', phone)
      .maybeSingle()

    const userId = userRow?.id ?? null

    // 3. Cargar nombre del salón y servicios activos
    const [{ data: location }, { data: services }] = await Promise.all([
      supabase.from('salon_locations').select('name').eq('id', locationId).single(),
      supabase
        .from('services')
        .select('id, name, duration_minutes, price, category')
        .eq('location_id', locationId)
        .eq('active', true),
    ])

    // 4. Cargar historial últimas 24h (máx 20 mensajes)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('direction, message, ai_response, created_at')
      .eq('phone_number', phone)
      .eq('location_id', locationId)
      .gte('created_at', since24h)
      .order('created_at', { ascending: false })
      .limit(20)

    const chronological = (history ?? []).reverse()

    // 5. Recuperar BookingProgress del último mensaje del bot
    // Esto es lo que garantiza que el bot nunca olvida lo que ya se habló:
    // el estado completo se persiste en BD en cada respuesta.
    const lastOutbound = (history ?? []).find((m) => m.direction === 'outbound')
    const progress = parseProgress(lastOutbound?.ai_response ?? null)

    // 6. Historial de mensajes para DeepSeek
    const conversationHistory: ChatMessage[] = chronological
      .filter((m) => m.message)
      .map((m) => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.message!,
      }))

    // 7. System prompt con estado persistido
    const systemPrompt = buildSystemPrompt({
      locationName: location?.name ?? 'la peluquería',
      services: services ?? [],
      userName: userRow?.first_name ?? null,
      progress,
    })

    // 8. Llamar a DeepSeek
    const aiResponse = await callDeepSeek(
      [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ],
      DEEPSEEK_API_KEY,
    )

    // 9. Ejecutar acción si la hay
    let replyText = aiResponse.reply
    let newProgress = progress

    if (aiResponse.action) {
      const result = await handleAction({
        action: aiResponse.action,
        locationId,
        userId,
        progress,
        services: services ?? [],
      })
      replyText = result.reply
      newProgress = result.progress
    }

    // 10. Persistir ambos mensajes (el estado siempre va en ai_response del outbound)
    await supabase.from('whatsapp_messages').insert([
      {
        phone_number: phone,
        location_id: locationId,
        direction: 'inbound',
        message: userMessage,
        user_id: userId,
        processed_by_ai: true,
      },
      {
        phone_number: phone,
        location_id: locationId,
        direction: 'outbound',
        message: replyText,
        user_id: userId,
        ai_response: JSON.stringify(newProgress),
        processed_by_ai: true,
      },
    ])

    return twimlResponse(replyText)
  } catch (err) {
    console.error('[handle-whatsapp] Error:', err)
    return errorResponse('Error interno')
  }
})

// ─── System prompt ─────────────────────────────────────────────────────────────

type ServiceRow = {
  id: string
  name: string
  duration_minutes: number
  price: number
  category: string | null
}

function buildSystemPrompt(params: {
  locationName: string
  services: ServiceRow[]
  userName: string | null
  progress: BookingProgress
}): string {
  const { locationName, services, userName, progress } = params

  const servicesList = services
    .map((s) => `- ${s.name} (${s.duration_minutes} min, ${s.price}€) [ID: ${s.id}]`)
    .join('\n')

  // Inyectar estado actual para que DeepSeek sepa exactamente en qué punto está la reserva
  let stateSection = ''

  if (progress.serviceIds.length > 0) {
    stateSection += `\nSERVICIOS YA ELEGIDOS: ${progress.serviceNames.join(', ')} [IDs: ${progress.serviceIds.join(', ')}]`
    stateSection += '\n→ NO preguntes por el servicio de nuevo. Ya está seleccionado.'
  }

  if (progress.slots.length > 0 && progress.checkedDateHadSlots) {
    const slotList = progress.slots
      .map((s, i) => `  ${i + 1}. ${formatSlotShort(s)} — ${s.employeeName}`)
      .join('\n')
    stateSection += `\n\nSLOTS DISPONIBLES (ya mostrados al cliente):\n${slotList}`
    stateSection += '\n→ El cliente debe elegir uno. Si dice "el primero", slotIndex=0; "el segundo", slotIndex=1; etc.'
  } else if (progress.checkedDate && !progress.checkedDateHadSlots) {
    stateSection += `\nFECHA SIN DISPONIBILIDAD: ${progress.checkedDate}`
    stateSection += '\n→ Propón otra fecha o pregunta si quiere buscar en otro día.'
  }

  if (progress.selectedSlot) {
    stateSection += `\n\nSLOT ELEGIDO: ${formatSlotShort(progress.selectedSlot)} — ${progress.selectedSlot.employeeName}`
    if (progress.awaitingGuestName) {
      stateSection += '\n→ El cliente no está registrado. Recoge su nombre para confirmar.'
    }
  }

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const todayWeekday = format(today, 'EEEE', { locale: es })

  return `Eres el asistente de reservas de "${locationName}"${userName ? `, atendiendo a ${userName}` : ''}. Gestionas citas por WhatsApp.

SERVICIOS DISPONIBLES:
${servicesList}

ESTADO ACTUAL DE LA RESERVA:${stateSection || '\n(sin información previa — saluda y pregunta en qué puedes ayudar)'}

INSTRUCCIONES:
- Responde SIEMPRE en español, de forma breve y amable (máx 4 frases).
- Hoy es ${todayStr} (${todayWeekday}). Interpreta fechas relativas correctamente.
- Para reservar necesitas: servicio, fecha y hora. Recoge uno a uno si faltan.
- Si el ESTADO ACTUAL ya tiene datos, NO los vuelvas a pedir.
- Cuando muestres slots disponibles, usa el formato de la acción check_availability — no los escribas tú directamente.
- SIEMPRE devuelve JSON válido con exactamente estos campos:
  {"reply": "<mensaje para el cliente>", "action": null}

ACCIONES DISPONIBLES (sustituir null por el objeto):
  Consultar disponibilidad: {"type":"check_availability","serviceIds":["<id>"],"date":"YYYY-MM-DD","preferredTime":"HH:MM"}
  Confirmar reserva:        {"type":"book","slotIndex":<número 0-based>}
  Cancelar cita:            {"type":"cancel","appointmentId":"<id>"}
  Ver mis citas:            {"type":"list_appointments"}

REGLAS CRÍTICAS:
- NUNCA inventes IDs de servicios. Usa solo los de la lista de arriba.
- NUNCA inventes slots. Solo usa los del ESTADO ACTUAL → SLOTS DISPONIBLES.
- Si el cliente da el número de una opción (ej: "el 2"), slotIndex = número - 1.
- Si aún no hay slots mostrados, usa check_availability antes de book.`
}

// ─── Ejecutor de acciones ──────────────────────────────────────────────────────

async function handleAction(params: {
  action: NonNullable<AIResponse['action']>
  locationId: string
  userId: string | null
  progress: BookingProgress
  services: ServiceRow[]
}): Promise<{ reply: string; progress: BookingProgress }> {
  const { action, locationId, userId, progress, services } = params

  // ── check_availability ────────────────────────────────────────────────────────
  if (action.type === 'check_availability') {
    const serviceIds = action.serviceIds.length > 0 ? action.serviceIds : progress.serviceIds
    const serviceNames = serviceIds.map((id) => services.find((s) => s.id === id)?.name ?? id)

    const slots = await getAvailableSlots(
      supabase,
      locationId,
      serviceIds,
      action.date,
      action.preferredTime ?? null,
    )

    const newProgress: BookingProgress = {
      ...progress,
      serviceIds,
      serviceNames,
      checkedDate: action.date,
      checkedDateHadSlots: slots.length > 0,
      slots,
      selectedSlot: null,
    }

    if (slots.length === 0) {
      return {
        reply: `Lo siento, no hay disponibilidad para el ${formatDate(action.date)}. ¿Quieres que busque otro día?`,
        progress: newProgress,
      }
    }

    const slotList = slots
      .map((s, i) => `${i + 1}. ${formatSlotShort(s)} — ${s.employeeName}`)
      .join('\n')

    return {
      reply: `Disponibilidad para el ${formatDate(action.date)}:\n\n${slotList}\n\n¿Cuál te viene mejor? Responde con el número.`,
      progress: newProgress,
    }
  }

  // ── book ──────────────────────────────────────────────────────────────────────
  if (action.type === 'book') {
    const slot: SlotOption | undefined = progress.slots[action.slotIndex ?? 0]

    if (!slot) {
      return {
        reply: 'No encontré ese horario en la lista. ¿Puedes indicarme el número de la opción?',
        progress,
      }
    }

    // Usuario no registrado: guardar slot y pedir nombre
    if (!userId) {
      return {
        reply: `Perfecto, ${formatSlotShort(slot)} con ${slot.employeeName}. Para confirmar necesito tu nombre completo.`,
        progress: { ...progress, selectedSlot: slot, awaitingGuestName: true },
      }
    }

    const booking = await createBooking(supabase, {
      clientId: userId,
      locationId,
      slot,
      serviceIds: progress.serviceIds,
      source: 'whatsapp',
    })

    return {
      reply: `✅ ¡Cita confirmada!\n\n📅 ${formatSlotShort(slot)}\n💇 ${slot.employeeName}\n🔖 Ref: ${booking.id.slice(0, 8).toUpperCase()}\n\nTe esperamos. Puedes cancelar hasta 24h antes respondiendo a este chat.`,
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

    if (error) return { reply: 'No pude cancelar esa cita. ¿Es correcto el identificador?', progress }
    return { reply: '❌ Cita cancelada correctamente.', progress: emptyProgress() }
  }

  // ── list_appointments ─────────────────────────────────────────────────────────
  if (action.type === 'list_appointments') {
    if (!userId) {
      return {
        reply: 'No encontré tu cuenta. Regístrate en la app para gestionar tus citas.',
        progress,
      }
    }

    const { data: appts } = await supabase
      .from('appointments')
      .select('scheduled_at, status, appointment_services ( services ( name ) )')
      .eq('client_id', userId)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_at', new Date().toISOString())
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
        const svc = a.appointment_services?.[0]?.services?.name ?? 'Servicio'
        return `• ${svc} — ${formatDateTime(a.scheduled_at)}`
      })
      .join('\n')

    return { reply: `Tus próximas citas:\n\n${list}`, progress }
  }

  return { reply: 'No entendí esa acción. ¿Puedes repetirlo de otra forma?', progress }
}

// ─── Helpers de formato ────────────────────────────────────────────────────────

function formatSlotShort(slot: SlotOption): string {
  try {
    return format(parseISO(slot.start), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
  } catch {
    return slot.start
  }
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(`${dateStr}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })
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
