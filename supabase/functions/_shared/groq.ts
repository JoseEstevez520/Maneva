// Groq es una API compatible con OpenAI — misma interfaz, mucho más rápida y gratuita.
// Modelo: llama-3.3-70b-versatile → buena comprensión del español y de JSON estructurado.

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const MODEL = 'llama-3.3-70b-versatile'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Acciones que el modelo puede devolver para que la Edge Function las ejecute
export type GroqAction =
  | { type: 'check_availability'; serviceIds: string[]; date: string }
  | { type: 'book'; slotIndex: number; serviceIds: string[] }
  | { type: 'cancel'; appointmentId: string }
  | { type: 'list_appointments' }

export type GroqResponse = {
  reply: string
  action: GroqAction | null
}

export async function callGroq(
  messages: ChatMessage[],
  apiKey: string,
): Promise<GroqResponse> {
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      // Fuerza que el modelo devuelva JSON válido siempre
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content ?? '{}'

  try {
    return JSON.parse(content) as GroqResponse
  } catch {
    // Si el modelo no devuelve JSON válido, lo envolvemos como reply genérico
    return { reply: content, action: null }
  }
}
