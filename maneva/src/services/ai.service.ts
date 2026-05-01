/**
 * ai.service.ts
 * Capa de comunicación con el webhook de n8n.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SalonSuggestion = {
  id: string
  name: string
  city?: string
  photo_url?: string | null
}

export type StylistSuggestion = {
  id: string
  display_name: string
  specialty: string | null
  photo_url: string | null
  salon_name: string
  salon_id: string
  location_id: string
}

export type ChatResponse = {
  reply: string
  salons: SalonSuggestion[]
  stylists: StylistSuggestion[]
}

type ChatPayload = {
  session_id: string
  message: string
  user_id: string
}

// ─── Función principal ─────────────────────────────────────────────────────────

export async function sendChatMessage(
  message: string,
  sessionId: string,
): Promise<ChatResponse> {
  const webhookUrl = process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL

  if (!webhookUrl) {
    await new Promise<void>((resolve) => setTimeout(resolve, 1200))
    return MOCK_RESPONSE
  }

  const payload: ChatPayload = {
    session_id: sessionId,
    message,
    user_id: sessionId,
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Error del asistente (${response.status})`)
  }

  return response.json() as Promise<ChatResponse>
}

// ─── Mock para desarrollo ─────────────────────────────────────────────────────

const MOCK_RESPONSE: ChatResponse = {
  reply:
    'Hola, soy el asistente de Maneva. Configura el webhook de n8n en .env para activarme. ¡Estoy listo!',
  salons: [],
  stylists: [],
}
