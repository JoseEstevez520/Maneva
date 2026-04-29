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

type ServiceRow = {
  id: string
  name: string
  duration_minutes: number
  price: number
  category: string | null
}

type ApptRow = {
  scheduled_at: string
  status: string
  appointment_services: { services: { name: string } | null }[]
}

function persist(rows: object[]): void {
  const p = (async () => {
    const { error } = await supabase.from('whatsapp_messages').insert(rows)
    if (error) console.error('[persist] Supabase error:', error.code, error.message, error.details)
    else console.log('[persist] OK')
  })()
  try {
    // @ts-ignore EdgeRuntime es global en Supabase Edge Functions
    EdgeRuntime.waitUntil(p)
  } catch { /* noop fuera del runtime */ }
}

// ─── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const rawBody = await req.text()

  try {
    const { from, to, body: userMessage } = parseTwilioWebhook(rawBody)
    const phone = normalizePhone(from)
    const toPhone = normalizePhone(to)

    if (!phone || !userMessage.trim()) return twimlResponse('')

    // Resolver salón por número de WhatsApp de destino
    const { data: channel } = await supabase
      .from('booking_channels')
      .select('location_id')
      .eq('channel_type', 'whatsapp')
      .eq('channel_identifier', toPhone)
      .eq('active', true)
      .maybeSingle()

    const locationId = channel?.location_id ?? DEFAULT_LOCATION_ID

    // Identificar usuario, cargar salón e historial en paralelo
    const [
      { data: userRow },
      [{ data: location }, { data: services }],
      { data: history },
    ] = await Promise.all([
      supabase.from('users').select('id, first_name').eq('phone', phone).maybeSingle(),
      Promise.all([
        supabase.from('salon_locations').select('name').eq('id', locationId).single(),
        supabase
          .from('services')
          .select('id, name, duration_minutes, price, category')
          .eq('location_id', locationId)
          .eq('active', true),
      ]),
      supabase
        .from('whatsapp_messages')
        .select('direction, message, ai_response, created_at')
        .eq('phone_number', phone)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const userId = userRow?.id ?? null

    // .slice() antes de .reverse() para no mutar el array original
    const chronological = (history ?? []).slice().reverse()
    const lastOutbound = chronological.filter((m) => m.direction === 'outbound').pop()
    const progress = parseProgress(lastOutbound?.ai_response ?? null)
    console.log(`[progress] slots=${progress.slots.length} serviceIds=${progress.serviceIds.length} checkedDate=${progress.checkedDate}`)

    const conversationHistory: ChatMessage[] = chronological
      .filter((m) => m.message)
      .map((m) => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.message!,
      }))

    const systemPrompt = buildSystemPrompt({
      locationName: location?.name ?? 'la peluquería',
      services: services ?? [],
      userName: userRow?.first_name ?? null,
      progress,
    })

    // Short-circuit: el usuario está dando su nombre para confirmar como invitado
    if (progress.awaitingGuestName && progress.selectedSlot) {
      const guestName = userMessage.trim()
      console.log(`[guest-name] received="${guestName}"`)

      const nameParts = guestName.split(/\s+/).filter(Boolean)
      const firstName = nameParts[0] ?? guestName
      const lastName = nameParts.slice(1).join(' ') || null

      let guestReply: string
      let guestProgress: BookingProgress
      let guestId: string | null = null

      // createUser gestiona auth.users + dispara el trigger a public.users
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        phone,
        phone_confirm: true,
      })

      if (authData?.user?.id) {
        guestId = authData.user.id
        // El trigger crea public.users sin nombre — lo completamos
        const { error: updateErr } = await supabase
          .from('users')
          .update({ phone, first_name: firstName, last_name: lastName })
          .eq('id', guestId)
        if (updateErr) {
          const { error: upsertErr } = await supabase
            .from('users')
            .upsert({ id: guestId, phone, first_name: firstName, last_name: lastName }, { onConflict: 'id' })
          if (upsertErr) console.error('[guest-upsert]', upsertErr.message, upsertErr.code)
        }
      } else {
        console.warn('[guest-createUser]', authErr?.message, authErr?.status)

        const { data: existingByPhone } = await supabase
          .from('users')
          .select('id')
          .eq('phone', phone)
          .maybeSingle()

        if (existingByPhone?.id) {
          guestId = existingByPhone.id
          await supabase
            .from('users')
            .update({ first_name: firstName, last_name: lastName })
            .eq('id', guestId)
        } else {
          // El teléfono existe en auth.users pero public.users.phone es NULL
          const { data: authUserId, error: rpcErr } = await supabase
            .rpc('get_auth_user_id_by_phone', { p_phone: phone })
          if (rpcErr) console.error('[guest-rpc]', rpcErr.message)

          if (authUserId) {
            guestId = authUserId as string
            const { error: upsertErr } = await supabase
              .from('users')
              .upsert({ id: guestId, phone, first_name: firstName, last_name: lastName }, { onConflict: 'id' })
            if (upsertErr) console.error('[guest-upsert-rpc]', upsertErr.message, upsertErr.code)
          } else {
            console.error('[guest-create] No se pudo resolver usuario para teléfono:', phone)
          }
        }
      }

      if (guestId) {
        try {
          const booking = await createBooking(supabase, {
            clientId: guestId,
            locationId,
            slot: progress.selectedSlot,
            serviceIds: progress.serviceIds,
            source: 'whatsapp',
          })
          const s = progress.selectedSlot
          guestReply = `✅ ¡Cita confirmada, ${firstName}!\n\n📅 ${formatSlotShort(s)}\n💇 ${s.employeeName}\n🔖 Ref: ${booking.id.slice(0, 8).toUpperCase()}\n\nTe esperamos. Puedes cancelar hasta 24h antes respondiendo a este chat.`
          guestProgress = emptyProgress()
        } catch (e) {
          console.error('[guest-booking]', e)
          guestReply = 'Hubo un error al confirmar la reserva. ¿Puedes intentarlo de nuevo?'
          guestProgress = progress
        }
      } else {
        guestReply = 'Hubo un problema al registrar tus datos. ¿Puedes intentarlo de nuevo?'
        guestProgress = progress
      }

      const guestTwiml = twimlResponse(guestReply)
      persist([
        { phone_number: phone, direction: 'inbound', message: userMessage, user_id: guestId, processed_by_ai: true },
        { phone_number: phone, direction: 'outbound', message: guestReply, user_id: guestId, ai_response: JSON.stringify(guestProgress), processed_by_ai: true },
      ])
      return guestTwiml
    }

    // Short-circuit: número puro con slots pendientes → evitar llamada al LLM
    const numMatch = /^\s*(\d+)[.\s]*$/.exec(userMessage.trim())
    const userNum = numMatch ? parseInt(numMatch[1], 10) : null
    let aiResponse: AIResponse

    if (userNum !== null && progress.slots.length > 0 && userNum >= 1 && userNum <= progress.slots.length) {
      console.log(`[short-circuit] userNum=${userNum} slots=${progress.slots.length}`)
      aiResponse = { reply: '', action: { type: 'book', slotIndex: userNum } }
    } else {
      aiResponse = await callDeepSeek(
        [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: userMessage },
        ],
        DEEPSEEK_API_KEY,
      )
      console.log(`[deepseek] action=${aiResponse.action?.type ?? 'null'} reply="${aiResponse.reply?.slice(0, 60)}"`)
    }

    let replyText = (aiResponse.reply ?? '').trim() || '¿En qué puedo ayudarte? Puedo consultar disponibilidad, hacer o cancelar una cita.'
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

    const twiml = twimlResponse(replyText)
    persist([
      { phone_number: phone, direction: 'inbound', message: userMessage, user_id: userId, processed_by_ai: true },
      { phone_number: phone, direction: 'outbound', message: replyText, user_id: userId, ai_response: JSON.stringify(newProgress), processed_by_ai: true },
    ])
    return twiml
  } catch (err) {
    console.error('[handle-whatsapp] Error:', err)
    return errorResponse('Error interno')
  }
})

// ─── System prompt ─────────────────────────────────────────────────────────────

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
    stateSection += '\n→ El cliente debe elegir uno. Si dice "el 1" o "el primero", slotIndex=1; "el 2" o "el segundo", slotIndex=2; etc. slotIndex es 1-based (el mismo número que ve el cliente).'
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
  Confirmar reserva:        {"type":"book","slotIndex":<número 1-based, igual al que eligió el cliente>}
  Cancelar cita:            {"type":"cancel","appointmentId":"<id>"}
  Ver mis citas:            {"type":"list_appointments"}

REGLAS CRÍTICAS:
- NUNCA inventes IDs de servicios. Usa solo los de la lista de arriba.
- NUNCA inventes slots. Solo usa los del ESTADO ACTUAL → SLOTS DISPONIBLES.
- Si el cliente da el número de una opción (ej: "el 2"), slotIndex = 2 (el mismo número, NO restar 1).
- Si aún no hay slots mostrados, usa check_availability antes de book.
- NUNCA repitas frases de mensajes anteriores del asistente. Genera siempre una respuesta nueva.
- Si hay SLOTS DISPONIBLES en el estado y el cliente da un número, USA SIEMPRE la acción book.`
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

  if (action.type === 'book') {
    if (progress.serviceIds.length === 0) {
      return {
        reply: '¿Para qué servicio quieres la cita? (corte, coloración, etc.)',
        progress,
      }
    }

    // Intentar 1-based; fallback a 0-based por si el LLM se equivoca
    const rawIndex = action.slotIndex ?? 1
    const slot: SlotOption | undefined = progress.slots[rawIndex - 1] ?? progress.slots[rawIndex]
    console.log(`[book] slotIndex=${rawIndex} slots.length=${progress.slots.length} slot=${slot ? 'found' : 'NOT FOUND'}`)

    if (!slot) {
      if (progress.slots.length > 0) {
        const slotList = progress.slots
          .map((s, i) => `${i + 1}. ${formatSlotShort(s)} — ${s.employeeName}`)
          .join('\n')
        return { reply: `Elige un número del 1 al ${progress.slots.length}:\n\n${slotList}`, progress }
      }
      return { reply: 'No tengo horarios guardados. ¿Para qué día quieres la cita?', progress: emptyProgress() }
    }

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

  if (action.type === 'cancel') {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', action.appointmentId)
      .eq('client_id', userId ?? '')

    if (error) return { reply: 'No pude cancelar esa cita. ¿Es correcto el identificador?', progress }
    return { reply: '❌ Cita cancelada correctamente.', progress: emptyProgress() }
  }

  if (action.type === 'list_appointments') {
    if (!userId) {
      return { reply: 'No encontré tu cuenta. Regístrate en la app para gestionar tus citas.', progress }
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

    const list = (appts as ApptRow[])
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
