/**
 * handle-whatsapp — Edge Function (Twilio → n8n)
 * ─────────────────────────────────────────────────────────────────────────────
 * RESPONSABILIDAD:
 *   1. Recibe el webhook de Twilio (POST con form-urlencoded).
 *   2. Guarda el mensaje entrante en `whatsapp_messages`.
 *   3. Recopila el historial de la conversación de las últimas 24 h.
 *   4. Llama al webhook de n8n con todo el contexto.
 *   5. Devuelve TwiML vacío — n8n responde al cliente vía Twilio API.
 *
 * VARIABLES DE ENTORNO NECESARIAS:
 *   SUPABASE_URL               — Proporcionada automáticamente por Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  — Proporcionada automáticamente por Supabase
 *   N8N_WEBHOOK_URL            — URL del webhook de n8n que procesa los mensajes
 *   DEFAULT_LOCATION_ID        — UUID del local por defecto
 *
 * PAYLOAD QUE RECIBE N8N:
 *   { phone, locationId, message, userId, userName, conversationHistory }
 *
 * APIS QUE DEBE LLAMAR N8N:
 *   · POST /functions/v1/get-slots          → huecos disponibles (ver get-slots/index.ts)
 *   · POST /rest/v1/appointments            → crear cita
 *   · POST /rest/v1/appointment_services    → asociar servicios a la cita
 *   · Nodo Twilio (Send Message)            → responder al cliente por WhatsApp
 *   · POST /rest/v1/whatsapp_messages       → guardar respuesta del bot (direction: "outbound")
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseTwilioWebhook, normalizePhone, twimlResponse } from '../_shared/twilio.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL') ?? ''
const DEFAULT_LOCATION_ID = Deno.env.get('DEFAULT_LOCATION_ID')!

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const rawBody = await req.text()

  try {
    const { from, to, body: userMessage } = parseTwilioWebhook(rawBody)
    const phone = normalizePhone(from)
    const toPhone = normalizePhone(to)

    if (!phone || !userMessage.trim()) return twimlResponse('')

    // ── 1. Resolver location por número WhatsApp de destino ───────────────────
    const { data: channel } = await supabase
      .from('booking_channels')
      .select('location_id')
      .eq('channel_type', 'whatsapp')
      .eq('channel_identifier', toPhone)
      .eq('active', true)
      .maybeSingle()

    const locationId = channel?.location_id ?? DEFAULT_LOCATION_ID

    // ── 2. Identificar usuario por teléfono ───────────────────────────────────
    const { data: userRow } = await supabase
      .from('users')
      .select('id, first_name')
      .eq('phone', phone)
      .maybeSingle()

    // ── 3. Guardar mensaje entrante ───────────────────────────────────────────
    await supabase.from('whatsapp_messages').insert({
      phone_number: phone,
      location_id: locationId,
      direction: 'inbound',
      message: userMessage,
      user_id: userRow?.id ?? null,
      processed_by_ai: true,
    })

    // ── 4. Cargar historial para n8n (últimas 24 h, máx 20 mensajes) ──────────
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('direction, message, created_at')
      .eq('phone_number', phone)
      .eq('location_id', locationId)
      .gte('created_at', since24h)
      .order('created_at', { ascending: true })
      .limit(20)

    // ── 5. Llamar a n8n con todo el contexto ──────────────────────────────────
    //
    // n8n recibe este JSON en el trigger "Webhook":
    //
    // {
    //   phone:       string        — número del cliente (ej: "+34612345678")
    //   locationId:  string        — UUID del local al que va dirigido el mensaje
    //   message:     string        — texto enviado por el cliente ahora mismo
    //   userId:      string|null   — UUID en Supabase (null si no está registrado)
    //   userName:    string|null   — primer nombre del cliente
    //   conversationHistory: [     — últimos 20 mensajes (cronológico)
    //     { role: "user"|"assistant", content: string }
    //   ]
    // }
    //
    // FLUJO SUGERIDO EN N8N:
    //   1. Nodo AI (Groq llama-3.3-70b / OpenAI gpt-4o-mini / Anthropic claude-haiku)
    //      Recibe conversationHistory + message. Responde con JSON:
    //      { reply: "texto", action: null | { type, ...params } }
    //
    //   2. Si action.type === "check_availability":
    //      HTTP Request → POST {{ $env.SUPABASE_URL }}/functions/v1/get-slots
    //      Headers: Authorization: Bearer {{ $env.SUPABASE_ANON_KEY }}
    //      Body: { locationId, serviceIds, date, preferredTime? }
    //
    //   3. Si action.type === "book":
    //      HTTP Request → POST {{ $env.SUPABASE_URL }}/rest/v1/appointments
    //      Headers: Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
    //              apikey: {{ $env.SUPABASE_ANON_KEY }}
    //      Body: { client_id, location_id, scheduled_at, scheduled_end, status: "pending", source: "whatsapp" }
    //      Luego insertar en appointment_services por cada servicio.
    //
    //   4. Nodo Twilio (Send Message):
    //      From: "whatsapp:{{ número del salón }}"
    //      To:   "whatsapp:{{ phone }}"
    //      Body: reply del paso 1
    //
    //   5. HTTP Request → POST {{ $env.SUPABASE_URL }}/rest/v1/whatsapp_messages
    //      Body: { phone_number: phone, location_id: locationId,
    //              direction: "outbound", message: reply, user_id: userId,
    //              processed_by_ai: true }

    if (N8N_WEBHOOK_URL) {
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          locationId,
          message: userMessage,
          userId: userRow?.id ?? null,
          userName: userRow?.first_name ?? null,
          conversationHistory: (history ?? []).map((m) => ({
            role: m.direction === 'inbound' ? 'user' : 'assistant',
            content: m.message ?? '',
          })),
        }),
      }).catch((err) => console.error('[handle-whatsapp] Error calling n8n:', err))
    } else {
      console.warn('[handle-whatsapp] N8N_WEBHOOK_URL no configurada — mensaje guardado pero no procesado.')
    }

    // ── 6. TwiML vacío — n8n responde directamente al cliente ─────────────────
    return twimlResponse('')
  } catch (err) {
    console.error('[handle-whatsapp] Error:', err)
    return twimlResponse('Lo siento, hay un problema técnico. Por favor llámanos directamente.')
  }
})
