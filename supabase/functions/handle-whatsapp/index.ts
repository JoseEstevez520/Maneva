/// <reference path="../types.d.ts" />
import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseTwilioWebhook, normalizePhone, twimlResponse, errorResponse } from '../_shared/twilio.ts'
import { callDeepSeek, ChatMessage, AIResponse } from '../_shared/deepseek.ts'
import {
  getAvailableSlots,
  createBooking,
  BookingProgress,
  PendingAppointment,
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
  id: string
  scheduled_at: string
  status: string
  appointment_services: { services: { name: string } | null }[]
}

type WhatsappMessageRow = {
  direction: 'inbound' | 'outbound'
  message: string | null
  ai_response: string | null
  created_at: string
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

    // Variantes de formato del teléfono: GoTrue/apps pueden guardar +34..., 34..., 0034..., 9 dígitos.
    const phoneVariants = buildPhoneVariants(phone)
    const phoneOrFilter = phoneVariants.map((v) => `phone.eq.${v}`).join(',')

    // Identificar usuario, cargar salón e historial en paralelo
    const [
      { data: userRows },
      [{ data: location }, { data: services }],
      { data: history },
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id, first_name')
        .or(phoneOrFilter)
        .limit(1),
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

    const userRow = userRows?.[0] ?? null
    const userId = userRow?.id ?? null
    console.log(`[user] phone=${phone} userId=${userId ?? 'null'}`)

    // .slice() antes de .reverse() para no mutar el array original
    const historyRows = (history ?? []) as WhatsappMessageRow[]
    const chronological = historyRows.slice().reverse()
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
      locationName: location?.name ?? 'a perruquería',
      services: services ?? [],
      userName: userRow?.first_name ?? null,
      progress,
    })

    // Short-circuit: el usuario está dando su nombre para confirmar como invitado
    if (progress.awaitingGuestName && progress.selectedSlot) {
      // Si el usuario ya está en BD (p.ej. fusionó su cuenta desde la app), confirmar directamente
      if (userId) {
        console.log(`[guest-name] userId ya conocido=${userId}, saltando creación de cuenta`)
        try {
          const booking = await createBooking(supabase, {
            clientId: userId,
            locationId,
            slot: progress.selectedSlot,
            serviceIds: progress.serviceIds,
            source: 'whatsapp',
          })
          const s = progress.selectedSlot
          const name = userRow?.first_name ?? ''
          const reply = buildConfirmationReply(s, name, booking.id, progress.serviceNames)
          persist([
            { phone_number: phone, direction: 'inbound', message: userMessage, user_id: userId, processed_by_ai: true },
            { phone_number: phone, direction: 'outbound', message: reply, user_id: userId, ai_response: JSON.stringify(emptyProgress()), processed_by_ai: true },
          ])
          return twimlResponse(reply)
        } catch (e) {
          console.error('[booking-known-user]', e)
          return twimlResponse('Hubo un error al confirmar la reserva. ¿Puedes intentarlo de nuevo?')
        }
      }

      const guestName = userMessage.trim()
      console.log(`[guest-name] received="${guestName}"`)

      const nameParts = guestName.split(/\s+/).filter(Boolean)
      const firstName = nameParts[0] ?? guestName
      const lastName = nameParts.slice(1).join(' ') || null

      let guestReply: string
      let guestProgress: BookingProgress
      let guestId: string | null = null

      // ── Paso 1: buscar en public.users por todas las variantes de teléfono ─────
      const { data: existingByPhone } = await supabase
        .from('users')
        .select('id')
        .or(phoneOrFilter)
        .limit(1)

      if (existingByPhone?.[0]?.id) {
        guestId = existingByPhone[0].id
        console.log(`[guest-name] encontrado en public.users id=${guestId}`)
        await supabase
          .from('users')
          .update({ phone, first_name: firstName, last_name: lastName })
          .eq('id', guestId)
      }

      // ── Paso 2: buscar en auth.users por teléfono (via RPC, prueba variantes) ─
      if (!guestId) {
        for (const variant of phoneVariants) {
          const { data: authUserId, error: rpcErr } = await supabase
            .rpc('get_auth_user_id_by_phone', { p_phone: variant })
          console.log(`[guest-name] rpc variant=${variant} id=${authUserId ?? 'null'} err=${rpcErr?.message ?? 'none'}`)
          if (authUserId) {
            guestId = authUserId as string
            const { error: upsertErr } = await supabase
              .from('users')
              .upsert({ id: guestId, phone, first_name: firstName, last_name: lastName }, { onConflict: 'id' })
            if (upsertErr) console.error('[guest-upsert-rpc]', upsertErr.message, upsertErr.code)
            break
          }
        }
      }

      // ── Paso 3: crear nueva cuenta (usuario realmente nuevo) ──────────────────
      if (!guestId) {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          phone,
          phone_confirm: true,
        })
        console.log(`[guest-name] createUser id=${authData?.user?.id ?? 'null'} err=${authErr?.message ?? 'none'}`)

        if (authData?.user?.id) {
          guestId = authData.user.id
          const { error: upsertErr } = await supabase
            .from('users')
            .upsert({ id: guestId, phone, first_name: firstName, last_name: lastName }, { onConflict: 'id' })
          if (upsertErr) console.error('[guest-upsert-new]', upsertErr.message, upsertErr.code)
        } else {
          console.error('[guest-name] todos los pasos fallaron para teléfono:', phone, authErr?.message)
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
          guestReply = buildConfirmationReply(s, firstName, booking.id, progress.serviceNames)
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

    // Short-circuit: número puro con slots pendientes → reservar sin llamar al LLM
    const numMatch = /^\s*(\d+)[.\s]*$/.exec(userMessage.trim())
    const userNum = numMatch ? parseInt(numMatch[1], 10) : null
    let aiResponse: AIResponse

    // Short-circuit: número puro con citas pendientes de cancelar → cancelar sin LLM
    if (userNum !== null && progress.pendingAppointments.length > 0 && userNum >= 1 && userNum <= progress.pendingAppointments.length) {
      const appt = progress.pendingAppointments[userNum - 1]
      console.log(`[short-circuit-cancel] userNum=${userNum} apptId=${appt.id} userId=${userId ?? 'null'}`)

      // Solo filtramos por id — el appt.id ya proviene del listado del propio usuario,
      // así que es seguro. Evitamos filtrar por client_id para no fallar si userId
      // cambia de formato entre turnos.
      const { data: updated, error: cancelErr } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', appt.id)
        .select('id')

      const didCancel = !cancelErr && updated && updated.length > 0
      console.log(`[short-circuit-cancel] didCancel=${didCancel} rows=${updated?.length ?? 0} err=${cancelErr?.message ?? 'none'}`)

      const cancelReply = didCancel
        ? `❌ Cancelada: ${appt.summary}\n\n¿Necesitas algo más?`
        : 'No pude cancelar esa cita. ¿Puedes intentarlo de nuevo?'

      const cancelProgress = didCancel ? emptyProgress() : progress
      const cancelTwiml = twimlResponse(cancelReply)
      persist([
        { phone_number: phone, direction: 'inbound', message: userMessage, user_id: userId, processed_by_ai: true },
        { phone_number: phone, direction: 'outbound', message: cancelReply, user_id: userId, ai_response: JSON.stringify(cancelProgress), processed_by_ai: true },
      ])
      return cancelTwiml
    }

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

  return `Eres el asistente de reservas de "${locationName}"${userName ? `, atendiendo a ${userName}` : ''}. Gestionas citas por WhatsApp con un trato cercano y profesional.

SERVICIOS DISPONIBLES:
${servicesList}

ESTADO ACTUAL DE LA RESERVA:${stateSection || '\n(sin información previa — saluda de forma natural y pregunta en qué puedes ayudar)'}

INSTRUCCIONES:
- Responde siempre en español, con un tono amable y natural. Sé conciso pero no robótico — adapta la longitud al contexto.
- Hoy es ${todayStr} (${todayWeekday}). Interpreta fechas relativas correctamente.
- Para reservar necesitas: servicio, fecha y hora. Recoge la información que falte de forma conversacional.
- Si el ESTADO ACTUAL ya tiene datos, NO los vuelvas a pedir.
- Cuando muestres slots disponibles, usa la acción check_availability — no los escribas tú directamente.
- Varía tu forma de expresarte; no uses siempre las mismas frases de saludo o confirmación.
- Tu respuesta COMPLETA debe ser SOLO un objeto JSON válido, sin texto antes ni después, con exactamente estos dos campos:
  {"reply": "<mensaje para el cliente, nunca vacío>", "action": null}

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
- Genera siempre una respuesta nueva; no copies frases literales de mensajes anteriores del asistente.
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
        reply: `Lo siento, no hay disponibilidad para el ${capitalize(formatDate(action.date))}. ¿Quieres que busque otro día?`,
        progress: newProgress,
      }
    }

    return {
      reply: formatSlotList(action.date, slots, serviceNames),
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
      if (progress.slots.length > 0 && progress.checkedDate) {
        return { reply: formatSlotList(progress.checkedDate, progress.slots, progress.serviceNames), progress }
      }
      return { reply: 'No tengo horarios guardados. ¿Para qué día quieres la cita?', progress: emptyProgress() }
    }

    if (!userId) {
      return {
        reply: `Perfecto, te reservo el ${formatSlotShort(slot)} con ${capitalize(slot.employeeName)}. Para confirmar necesito tu nombre completo.`,
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
      reply: buildConfirmationReply(slot, null, booking.id, progress.serviceNames),
      progress: emptyProgress(),
    }
  }

  if (action.type === 'cancel') {
    if (!userId) {
      return { reply: 'No encontré tu cuenta. Regístrate en la app para gestionar tus citas.', progress }
    }

    // El ref mostrado al usuario son los primeros 8 chars del UUID (mayúsculas).
    // Buscamos por prefijo con ilike para cubrir tanto refs cortos como UUIDs completos.
    const apptRef = action.appointmentId.toLowerCase()
    // Buscar por prefijo (el ref visible al usuario son los primeros 8 chars del UUID)
    const { data: found } = await supabase
      .from('appointments')
      .select('id')
      .ilike('id', `${apptRef}%`)
      .not('status', 'eq', 'cancelled')
      .limit(1)

    if (!found?.[0]?.id) {
      return { reply: 'No encontré esa cita o ya estaba cancelada. ¿Puedes revisar la referencia?', progress }
    }

    const { data: updated, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', found[0].id)
      .select('id')

    console.log(`[cancel] id=${found[0].id} rows=${updated?.length ?? 0} err=${error?.message ?? 'none'}`)

    if (error || !updated?.length) return { reply: 'No pude cancelar esa cita. Inténtalo de nuevo.', progress }
    return { reply: '❌ Cita cancelada correctamente.', progress: emptyProgress() }
  }

  if (action.type === 'list_appointments') {
    if (!userId) {
      return { reply: 'No encontré tu cuenta. Regístrate en la app para gestionar tus citas.', progress }
    }

    const { data: appts } = await supabase
      .from('appointments')
      .select('id, scheduled_at, status, appointment_services ( services ( name ) )')
      .eq('client_id', userId)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5)

    if (!appts || appts.length === 0) {
      return { reply: 'No tienes citas próximas.', progress }
    }

    const pendingAppointments: PendingAppointment[] = []
    const lines = (appts as ApptRow[]).map((a, i) => {
      const svcs = a.appointment_services.map((as) => as.services?.name).filter(Boolean).join(' + ') || 'Servicio'
      const dateStr = capitalize(formatDateTime(a.scheduled_at))
      const summary = `${svcs} — ${dateStr}`
      pendingAppointments.push({ id: a.id, summary })
      return `${i + 1}. 📅 ${dateStr} — ${svcs} (Ref: ${a.id.slice(0, 8).toUpperCase()})`
    })

    const reply = `Tus próximas citas:\n\n${lines.join('\n')}\n\n¿Quieres cancelar alguna? Responde con el número 👇`
    return { reply, progress: { ...emptyProgress(), pendingAppointments } }
  }

  return { reply: 'No entendí esa acción. ¿Puedes repetirlo de otra forma?', progress }
}

// ─── Helpers de teléfono ───────────────────────────────────────────────────────

// Genera todas las variantes de formato de un teléfono para cubrir inconsistencias
// entre cómo lo guarda GoTrue, la app o mensajes de WhatsApp/Twilio.
// Ej: "+34604815848" → ["+34604815848", "34604815848", "0034604815848", "604815848"]
function buildPhoneVariants(phone: string): string[] {
  const digits = phone.replace(/[^0-9]/g, '')           // "34604815848"
  const local = digits.startsWith('34') ? digits.slice(2) : digits  // "604815848"
  return [...new Set([
    phone,                   // +34604815848 (E.164, el formato canónico)
    digits,                  // 34604815848
    `0034${local}`,          // 0034604815848
    local,                   // 604815848
  ])]
}

// ─── Helpers de formato ────────────────────────────────────────────────────────

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatSlotShort(slot: SlotOption): string {
  try {
    return capitalize(format(parseISO(slot.start), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es }))
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
    return format(parseISO(isoStr), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
  } catch {
    return isoStr
  }
}

// Formatea la lista de slots disponibles agrupada por franja horaria
function formatSlotList(date: string, slots: SlotOption[], serviceNames: string[]): string {
  const dateHeader = capitalize(formatDate(date))
  const servicesStr = serviceNames.length > 0 ? ` · ${serviceNames.join(' + ')}` : ''

  const morning: SlotOption[] = []
  const afternoon: SlotOption[] = []

  for (const s of slots) {
    const hour = parseInt(s.start.slice(11, 13), 10)
    if (hour < 14) morning.push(s)
    else afternoon.push(s)
  }

  let idx = 1
  const lines: string[] = [`📅 ${dateHeader}${servicesStr}\n`]

  if (morning.length > 0) {
    lines.push('🌅 Mañana')
    for (const s of morning) {
      lines.push(`  ${idx}. ${s.start.slice(11, 16)} h — ${capitalize(s.employeeName)}`)
      idx++
    }
  }

  if (afternoon.length > 0) {
    if (morning.length > 0) lines.push('')
    lines.push('🌆 Tarde')
    for (const s of afternoon) {
      lines.push(`  ${idx}. ${s.start.slice(11, 16)} h — ${capitalize(s.employeeName)}`)
      idx++
    }
  }

  lines.push('\nResponde con el número que prefieras 👇')
  return lines.join('\n')
}

// Mensaje de confirmación de cita (usado en flujo normal y en flujo de invitado)
function buildConfirmationReply(
  slot: SlotOption,
  name: string | null,
  bookingId: string,
  serviceNames: string[],
): string {
  const greeting = name ? `, ${name}` : ''
  const svcs = serviceNames.length > 0 ? `\n✂️ ${serviceNames.join(' + ')}` : ''
  return `✅ ¡Cita confirmada${greeting}!\n\n📅 ${formatSlotShort(slot)}${svcs}\n💇 ${capitalize(slot.employeeName)}\n🔖 Ref: ${bookingId.slice(0, 8).toUpperCase()}\n\nTe esperamos. Puedes cancelar hasta 24h antes respondiendo aquí.`
}
