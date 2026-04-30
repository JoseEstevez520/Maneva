// DeepSeek API — compatible con el formato OpenAI (misma interfaz que Groq).
// Modelo: deepseek-chat (DeepSeek-V3) → excelente comprensión del español y JSON estructurado.
//
// NOTA: No usamos response_format:json_object porque DeepSeek devuelve contenido vacío (" ")
// en ciertos estados de su API con ese modo activo. En su lugar pedimos JSON explícitamente
// en el prompt y lo extraemos con regex del texto libre — más robusto.

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const MODEL = 'deepseek-chat'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AIAction =
  | { type: 'check_availability'; serviceIds: string[]; date: string; preferredTime?: string }
  | { type: 'book'; slotIndex: number }
  | { type: 'cancel'; appointmentId: string }
  | { type: 'list_appointments' }

export type AIResponse = {
  reply: string
  action: AIAction | null
}

export async function callDeepSeek(
  messages: ChatMessage[],
  apiKey: string,
  timeoutMs = 15_000,
): Promise<AIResponse> {
  const result = await callDeepSeekOnce(messages, apiKey, timeoutMs)

  // Retry una vez si reply está vacío
  if (!result.reply?.trim() && !result.action) {
    console.warn('[deepseek] reply vacío, reintentando...')
    return callDeepSeekOnce(messages, apiKey, timeoutMs)
  }

  return result
}

async function callDeepSeekOnce(
  messages: ChatMessage[],
  apiKey: string,
  timeoutMs: number,
): Promise<AIResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content ?? ''
  console.log(`[deepseek-raw] content="${content.slice(0, 200)}"`)

  if (!content.trim()) {
    return { reply: '', action: null }
  }

  return extractAIResponse(content)
}

function extractAIResponse(text: string): AIResponse {
  // Intentar extraer JSON del bloque ```json ... ``` si viene en markdown
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenceMatch ? fenceMatch[1].trim() : text.trim()

  // Extraer el primer objeto JSON completo
  const jsonMatch = candidate.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as AIResponse
      if (parsed.reply || parsed.action) return parsed
    } catch { /* sigue */ }
  }

  // Fallback: tratar el texto completo como el reply
  return { reply: text.trim(), action: null }
}
