// DeepSeek API — compatible con el formato OpenAI (misma interfaz que Groq).
// Modelo: deepseek-chat (DeepSeek-V3) → excelente comprensión del español y JSON estructurado.

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
  timeoutMs = 10_000,
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
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 512,
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
  const content: string = data.choices?.[0]?.message?.content ?? '{}'

  try {
    return JSON.parse(content) as AIResponse
  } catch {
    return { reply: content, action: null }
  }
}
