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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user: newUser }, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !newUser) return json({ error: 'Unauthorized' }, 401)

  const newUserId = newUser.id

  let phone: string
  try {
    const body = await req.json()
    phone = body?.phone
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!phone) return json({ error: 'phone required' }, 400)

  const { data: oldUserRow, error: lookupErr } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .neq('id', newUserId)
    .maybeSingle()

  if (lookupErr) {
    console.error('[merge] lookup error:', lookupErr.message)
    return json({ error: 'Internal server error' }, 500)
  }

  if (!oldUserRow?.id) {
    // No hay cuenta previa — solo vincular el teléfono a la cuenta actual
    const { error: linkErr } = await supabase.from('users').update({ phone }).eq('id', newUserId)
    if (linkErr) {
      console.error('[merge] link phone error:', linkErr.message)
      return json({ error: 'Internal server error' }, 500)
    }
    return json({ merged: false, message: 'no previous account found' })
  }

  const oldUserId = oldUserRow.id

  // Transferir citas y mensajes en paralelo
  const [{ error: apptErr }, { error: msgErr }] = await Promise.all([
    supabase.from('appointments').update({ client_id: newUserId }).eq('client_id', oldUserId),
    supabase.from('whatsapp_messages').update({ user_id: newUserId }).eq('user_id', oldUserId),
  ])

  if (apptErr) {
    console.error('[merge] appointments transfer error:', apptErr.message)
    return json({ error: 'Internal server error' }, 500)
  }
  if (msgErr) {
    console.error('[merge] messages transfer error:', msgErr.message)
    return json({ error: 'Internal server error' }, 500)
  }

  // Vincular teléfono a la nueva cuenta y limpiar la antigua
  const [{ error: linkErr }, { error: clearErr }] = await Promise.all([
    supabase.from('users').update({ phone }).eq('id', newUserId),
    supabase.from('users').update({ phone: null }).eq('id', oldUserId),
  ])

  if (linkErr) {
    console.error('[merge] link phone error:', linkErr.message)
    return json({ error: 'Internal server error' }, 500)
  }
  if (clearErr) {
    // No crítico: la cuenta antigua ya no tiene citas; loguear pero no fallar
    console.warn('[merge] clear old phone error:', clearErr.message)
  }

  return json({ merged: true, transferredFrom: oldUserId })
})
