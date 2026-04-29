import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let phone: string
  try {
    const body = await req.json()
    phone = body?.phone
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!phone) return json({ error: 'phone required' }, 400)

  const normalized = String(phone).replace(/[\s\-().]/g, '').trim()

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('phone', normalized)
    .maybeSingle()

  if (error) {
    console.error('[check-phone] DB error:', error.message)
    return json({ error: 'Internal server error' }, 500)
  }

  return json({ exists: !!data })
})
