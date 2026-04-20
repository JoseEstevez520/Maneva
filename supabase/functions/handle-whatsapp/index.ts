import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseTwilioWebhook, normalizePhone, twimlResponse, errorResponse } from '../_shared/twilio.ts'
import { callGroq, ChatMessage } from '../_shared/groq.ts'
import { getAvailableSlots, createBooking, PendingSlotContext, SlotOption } from '../_shared/booking.ts'
import { format, parseISO } from 'npm:date-fns@3'
import { es } from 'npm:date-fns@3/locale'

// ─── Clientes de Supabase ──────────────────────────────────────────────────────
// service_role key para poder escribir en whatsapp_messages sin restricciones RLS
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
// Para la demo: una sola peluquería. En producción se busca por booking_channels.
const DEFAULT_LOCATION_ID = Deno.env.get('DEFAULT_LOCATION_ID')!

// ─── Handler principal ─────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const rawBody = await req.text()

  try {
    const { from, body: userMessage } = parseTwilioWebhook(rawBody)
    const phone = normalizePhone(from)

    if (!phone || !userMessage.trim()) return twimlResponse('Mensaje vacío recibido.')

    // 1. Buscar o identificar usuario por teléfono
    const { data: userRow } = await supabase
      .from('users')
      .select('id, first_name')
      .eq('phone', phone)
      .maybeSingle()

    const userId: string | null = userRow?.id ?? null

    // 2. Cargar contexto de la peluquería (nombre + servicios)
    const locationId = await resolveLocationId(phone)

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

    // 3. Cargar historial de conversación (últimos 10 intercambios)
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('direction, message, ai_response')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })
      .limit(20)

    const conversationHistory: ChatMessage[] = (history ?? [])
      .reverse()
      .map((msg) => ({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.direction === 'inbound' ? msg.message : (msg.message ?? ''),
      } as ChatMessage))

    // 4. Recuperar contexto de selección de slots pendiente (del último mensaje del bot)
    let pendingSlots: PendingSlotContext | null = null
    const lastOutbound = (history ?? []).find((m) => m.direction === 'outbound')
    if (lastOutbound?.ai_response) {
      try {
        const ctx = JSON.parse(lastOutbound.ai_response)
        if (ctx.type === 'slot_selection') pendingSlots = ctx as PendingSlotContext
      } catch { /* no había contexto estructurado */ }
    }

    // 5. Construir prompt del sistema
    const systemPrompt = buildSystemPrompt({
      locationName: location?.name ?? 'la peluquería',
      services: services ?? [],
      userName: userRow?.first_name ?? null,
      pendingSlots,
    })

    // 6. Llamar a Groq
    const groqResponse = await callGroq(
      [{ role: 'system', content: systemPrompt }, ...conversationHistory, { role: 'user', content: userMessage }],
      GROQ_API_KEY,
    )

    // 7. Ejecutar acción si la hay
    let replyText = groqResponse.reply
    let outboundContext: string | null = null

    if (groqResponse.action) {
      const result = await handleAction({
        action: groqResponse.action,
        locationId,
        userId,
        phone,
        pendingSlots,
      })
      replyText = result.reply
      outboundContext = result.context ?? null
    }

    // 8. Guardar mensaje entrante
    await supabase.from('whatsapp_messages').insert({
      phone_number: phone,
      direction: 'inbound',
      message: userMessage,
      user_id: userId,
      processed_by_ai: true,
    })

    // 9. Guardar respuesta del bot (con contexto de slots si aplica)
    await supabase.from('whatsapp_messages').insert({
      phone_number: phone,
      direction: 'outbound',
      message: replyText,
      user_id: userId,
      ai_response: outboundContext,
      processed_by_ai: true,
    })

    return twimlResponse(replyText)
  } catch (err) {
    console.error('handle-whatsapp error:', err)
    return errorResponse('Error interno')
  }
})

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function resolveLocationId(phone: string): Promise<string> {
  // Busca si el número "To" está registrado en booking_channels como WhatsApp
  // Para la demo simplemente usamos DEFAULT_LOCATION_ID
  return DEFAULT_LOCATION_ID
}

type ServiceRow = { id: string; name: string; duration_minutes: number; price: number; category: string | null }

function buildSystemPrompt(params: {
  locationName: string
  services: ServiceRow[]
  userName: string | null
  pendingSlots: PendingSlotContext | null
}): string {
  const { locationName, services, userName, pendingSlots } = params

  const servicesList = services
    .map((s) => `- ${s.name} (${s.duration_minutes} min, ${s.price}€) [ID: ${s.id}]`)
    .join('\n')

  const slotsSection = pendingSlots
    ? `\n\nSLOTS PENDIENTES DE CONFIRMAR (el cliente está eligiendo entre estos):\n` +
      pendingSlots.slots
        .map((s, i) => `${i + 1}. ${formatSlotForUser(s)} con ${s.employeeName} [start:${s.start}|end:${s.end}|emp:${s.employeeId}]`)
        .join('\n') +
      `\n\nCuando el cliente elija (por número, hora o nombre), devuelve action "book" con el slotIndex correcto (0-based).`
    : ''

  return `Eres el asistente de reservas de "${locationName}"${userName ? `, hablando con ${userName}` : ''}. Gestionas citas por WhatsApp.

SERVICIOS DISPONIBLES:
${servicesList}

INSTRUCCIONES:
- Responde SIEMPRE en español, de forma breve y amable (máx 4 frases).
- Para reservar necesitas: servicio(s), fecha y hora.
- Si el cliente pide disponibilidad para una fecha concreta, extrae los IDs de servicios y la fecha en YYYY-MM-DD.
- Hoy es ${new Date().toISOString().slice(0, 10)}.
- Interpreta fechas relativas ("mañana", "el viernes", "la próxima semana") correctamente.
- SIEMPRE devuelve JSON válido con exactamente estos campos:
  {"reply": "<mensaje para el cliente>", "action": null}

ACCIONES POSIBLES (sustituir null por el objeto correspondiente):
  Consultar disponibilidad: {"type": "check_availability", "serviceIds": ["<id>"], "date": "<YYYY-MM-DD>"}
  Confirmar reserva:        {"type": "book", "slotIndex": <número 0-based>, "serviceIds": ["<id>"]}
  Cancelar cita:            {"type": "cancel", "appointmentId": "<id>"}
  Ver mis citas:            {"type": "list_appointments"}

NUNCA inventes IDs ni slots que no estén en la lista de arriba.${slotsSection}`
}

async function handleAction(params: {
  action: NonNullable<Awaited<ReturnType<typeof callGroq>>['action']>
  locationId: string
  userId: string | null
  phone: string
  pendingSlots: PendingSlotContext | null
}): Promise<{ reply: string; context?: string }> {
  const { action, locationId, userId, phone, pendingSlots } = params

  if (action.type === 'check_availability') {
    const slots = await getAvailableSlots(supabase, locationId, action.serviceIds, action.date)

    if (slots.length === 0) {
      return {
        reply: `Lo siento, no hay disponibilidad para el ${formatDate(action.date)}. ¿Quieres que busque otro día?`,
      }
    }

    const slotList = slots
      .map((s, i) => `${i + 1}. ${formatSlotForUser(s)} – ${s.employeeName}`)
      .join('\n')

    const ctx: PendingSlotContext = {
      type: 'slot_selection',
      locationId,
      serviceIds: action.serviceIds,
      slots,
    }

    return {
      reply: `Disponibilidad para el ${formatDate(action.date)}:\n\n${slotList}\n\n¿Cuál te viene bien? Responde con el número.`,
      context: JSON.stringify(ctx),
    }
  }

  if (action.type === 'book') {
    if (!userId) {
      return {
        reply: 'Para confirmar la reserva necesito que estés registrado en la app. Descárgala y vuelve a intentarlo.',
      }
    }

    if (!pendingSlots || action.slotIndex === undefined) {
      return { reply: 'No encontré slots pendientes. ¿Puedes indicarme qué día y servicio quieres?' }
    }

    const slot: SlotOption | undefined = pendingSlots.slots[action.slotIndex]
    if (!slot) {
      return { reply: 'Ese número no corresponde a ningún slot. ¿Puedes elegir de nuevo?' }
    }

    const booking = await createBooking(supabase, {
      clientId: userId,
      locationId,
      slot,
      serviceIds: action.serviceIds ?? pendingSlots.serviceIds,
      source: 'whatsapp',
    })

    return {
      reply: `✅ ¡Cita confirmada! El ${formatSlotForUser(slot)} con ${slot.employeeName}.\nID de reserva: ${booking.id.slice(0, 8).toUpperCase()}\n\nTe esperamos. Puedes cancelar hasta 24h antes.`,
    }
  }

  if (action.type === 'cancel') {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', action.appointmentId)
      .eq('client_id', userId ?? '')

    if (error) return { reply: 'No pude cancelar esa cita. ¿El ID es correcto?' }
    return { reply: '❌ Cita cancelada correctamente.' }
  }

  if (action.type === 'list_appointments') {
    if (!userId) return { reply: 'No encontré tu cuenta. Asegúrate de estar registrado en la app.' }

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
      return { reply: 'No tienes citas próximas.' }
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

    return { reply: `Tus próximas citas:\n\n${list}` }
  }

  return { reply: 'No entendí esa acción.' }
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
