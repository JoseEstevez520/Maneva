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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const { locationId, serviceIds, date, preferredTime } = await req.json()

    if (!locationId || !Array.isArray(serviceIds) || serviceIds.length === 0 || !date) {
      return json({ error: 'locationId, serviceIds y date son obligatorios' }, 400)
    }

    const slots = await getAvailableSlots(supabase, locationId, serviceIds, date, preferredTime ?? null)
    return json({ slots })
  } catch (err) {
    console.error('[get-slots] Error:', err)
    return json({ error: 'Error interno del servidor' }, 500)
  }
})
