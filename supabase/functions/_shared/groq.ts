const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const GROQ_MODEL_PRIMARY = 'llama-3.3-70b-versatile'
const GROQ_MODEL_FALLBACK = 'meta-llama/llama-4-scout-17b-16e-instruct'

const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const OPENAI_MODEL = 'gpt-4o-mini'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type GroqAction =
  | { type: 'check_availability'; serviceIds: string[]; date: string; preferredTime?: string }
  | { type: 'book'; slotIndex: number; serviceIds: string[] }
  | { type: 'create_guest_and_book'; firstName: string }
  | { type: 'cancel'; appointmentId: string }
  | { type: 'list_appointments' }

export type GroqBookingState = {
  serviceIds: string[]
  serviceNames: string[]
}

export type GroqResponse = {
  reply: string
  action: GroqAction | null
  bookingState?: GroqBookingState
}

function extractJson(content: string): string {
  const trimmed = content.trim()
  const mdMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) return mdMatch[1].trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return trimmed
}

function parseAIContent(rawContent: string): GroqResponse {
  try {
    const parsed = JSON.parse(extractJson(rawContent)) as GroqResponse
    return {
      reply: parsed.reply ?? 'Un momento, por favor.',
      action: parsed.action ?? null,
      bookingState: parsed.bookingState,
    }
  } catch {
    return { reply: rawContent, action: null }
  }
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
      temperature: 0.2,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const rawContent: string = data.choices?.[0]?.message?.content ?? '{}'
  return parseAIContent(rawContent)
}

export async function callAIWithFallback(
  messages: ChatMessage[],
  groqApiKey: string,
  openaiApiKey: string | null,
): Promise<GroqResponse> {
  try {
    return await callChatAPI(GROQ_BASE_URL, GROQ_MODEL_PRIMARY, groqApiKey, messages)
  } catch (primaryErr) {
    console.error('Groq primary failed, trying fallback:', primaryErr)
  }
  try {
    return await callChatAPI(GROQ_BASE_URL, GROQ_MODEL_FALLBACK, groqApiKey, messages)
  } catch (fallbackErr) {
    console.error('Groq fallback failed:', fallbackErr)
    if (!openaiApiKey) throw fallbackErr
    return callChatAPI(OPENAI_BASE_URL, OPENAI_MODEL, openaiApiKey, messages)
  }
}
