/**
 * get-slots — Edge Function
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoint HTTP que expone la lógica de disponibilidad para que n8n
 * pueda consultar huecos sin necesidad de replicar la lógica en el workflow.
 *
 * MÉTODO:  POST
 * HEADERS: Authorization: Bearer <SUPABASE_ANON_KEY>
 *
 * BODY (JSON):
 * {
 *   locationId:      string         — UUID del local
 *   serviceIds:      string[]       — UUIDs de los servicios solicitados
 *   date:            string         — Fecha en formato "YYYY-MM-DD"
 *   preferredTime?:  string         — Hora preferida en formato "HH:MM" (opcional)
 * }
 *
 * RESPUESTA (JSON):
 * {
 *   slots: Array<{
 *     start:        string   — ISO 8601 UTC (ej: "2026-04-25T10:00:00.000Z")
 *     end:          string   — ISO 8601 UTC
 *     employeeId:   string   — UUID del empleado asignado
 *     employeeName: string   — Nombre completo del empleado
 *   }>
 * }
 *
 * EJEMPLO DE USO EN N8N (nodo HTTP Request):
 *   URL:    {{ $env.SUPABASE_URL }}/functions/v1/get-slots
 *   Method: POST
 *   Auth:   Bearer {{ $env.SUPABASE_ANON_KEY }}
 *   Body:   { "locationId": "...", "serviceIds": ["..."], "date": "2026-04-25" }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { getAvailableSlots } from '../_shared/booking.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { locationId, serviceIds, date, preferredTime } = body

    if (!locationId || !Array.isArray(serviceIds) || serviceIds.length === 0 || !date) {
      return new Response(
        JSON.stringify({ error: 'locationId, serviceIds y date son obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const slots = await getAvailableSlots(
      supabase,
      locationId,
      serviceIds,
      date,
      preferredTime ?? null,
    )

    return new Response(
      JSON.stringify({ slots }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[get-slots] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
