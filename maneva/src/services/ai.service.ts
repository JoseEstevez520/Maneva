/**
 * ai.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Capa de comunicación con el webhook de n8n.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Mensaje individual del historial de conversación.
 * Se envía a n8n para que el modelo tenga contexto previo.
 */
export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Sugerencia de salón que el bot puede devolver opcionalmente.
 * Si n8n detecta que el usuario busca un salón concreto, puede
 * adjuntar una lista de resultados para mostrar como tarjetas en el chat.
 */
export type SalonSuggestion = {
  id: string
  name: string
  city?: string
}

/**
 * Respuesta esperada del webhook de n8n.
 *
 * Estructura mínima requerida en n8n:
 * {
 *   "reply": "Texto de respuesta del asistente",
 *   "salons": []   ← opcional, array vacío si no hay sugerencias
 * }
 */
export type ChatResponse = {
  reply: string
  salons?: SalonSuggestion[]
}

/**
 * Payload que se envía al webhook de n8n en cada mensaje.
 * n8n recibe el mensaje actual y el historial completo para mantener contexto.
 */
type ChatPayload = {
  message: string
  history: ChatMessage[]
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Envía un mensaje al asistente IA via webhook de n8n.
 *
 * @param message  - Texto que el usuario acaba de escribir
 * @param history  - Historial previo de la conversación (sin el mensaje actual)
 * @returns        - Respuesta del asistente y sugerencias opcionales de salones
 *
 * TODO: Configurar el webhook en n8n para que:
 * 1. Reciba el payload { message, history }
 * 2. Lo pase al modelo de IA (OpenAI, Claude, etc.)
 * 3. Devuelva { reply: string, salons?: SalonSuggestion[] }
 */
export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
): Promise<ChatResponse> {
  const webhookUrl = process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL

  // Mientras n8n no esté configurado, devolver respuesta simulada
  // para poder desarrollar y probar la UI sin dependencia del backend.
  // Eliminar este bloque cuando el webhook esté listo.
  if (!webhookUrl) {
    await simulateDelay(1200)
    return MOCK_RESPONSE
  }

  const payload: ChatPayload = { message, history }

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

// ─── Helpers de desarrollo ────────────────────────────────────────────────────

const simulateDelay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/** Respuesta mock para desarrollo sin n8n configurado */
const MOCK_RESPONSE: ChatResponse = {
  reply:
    'Hola, soy el asistente de Maneva. Cuando conectes n8n podrás preguntarme sobre salones, servicios y disponibilidad. ¡Estoy listo!',
}
