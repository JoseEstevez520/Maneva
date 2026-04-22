// Groq: API compatible con OpenAI, modelo llama-3.3-70b-versatile (primario)
// OpenAI gpt-4o-mini: fallback si Groq no está disponible

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
// llama-3.3-70b-versatile tiene 128k context y es el mejor modelo gratuito de Groq
// para seguimiento de instrucciones y extracción de JSON estructurado
const GROQ_MODEL = 'llama-3.3-70b-versatile'

const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const OPENAI_MODEL = 'gpt-4o-mini'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type GroqAction =
  | { type: 'check_availability'; serviceIds: string[]; date: string }
  | { type: 'book'; slotIndex: number; serviceIds: string[] }
  | { type: 'create_guest_and_book'; firstName: string }
  | { type: 'cancel'; appointmentId: string }
  | { type: 'list_appointments' }

/**
 * bookingState: lo que el modelo extrajo de la conversación, aunque no haya acción.
 * Permite persistir qué servicios quiere el cliente incluso en mensajes de "¿para qué fecha?".
 */
export type GroqBookingState = {
  serviceIds: string[]
  serviceNames: string[]
}

export type GroqResponse = {
  reply: string
  action: GroqAction | null
  bookingState?: GroqBookingState
}

/** Extrae JSON del contenido, incluso si viene envuelto en markdown (```json...```) */
function extractJson(content: string): string {
  const trimmed = content.trim()
  // Quitar bloques markdown
  const mdMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) return mdMatch[1].trim()
  // Extraer primer objeto JSON si hay texto extra
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return trimmed
}

async function callChatAPI(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: ChatMessage[],
): Promise<GroqResponse> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.2,   // más bajo = más determinista y mejor para JSON
      max_tokens: 2048,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const rawContent: string = data.choices?.[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(extractJson(rawContent)) as GroqResponse
    // Asegurar campos obligatorios
    return {
      reply: parsed.reply ?? 'Un momento, por favor.',
      action: parsed.action ?? null,
      bookingState: parsed.bookingState,
    }
  } catch {
    return { reply: rawContent, action: null }
  }
}

export async function callGroq(messages: ChatMessage[], apiKey: string): Promise<GroqResponse> {
  return callChatAPI(GROQ_BASE_URL, GROQ_MODEL, apiKey, messages)
}

export async function callAIWithFallback(
  messages: ChatMessage[],
  groqApiKey: string,
  openaiApiKey: string | null,
): Promise<GroqResponse> {
  try {
    return await callGroq(messages, groqApiKey)
  } catch (groqErr) {
    console.error('Groq failed, trying OpenAI fallback:', groqErr)
    if (!openaiApiKey) throw groqErr
    return callChatAPI(OPENAI_BASE_URL, OPENAI_MODEL, openaiApiKey, messages)
  }
}
