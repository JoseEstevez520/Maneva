// Twilio envía los mensajes de WhatsApp como POST con body form-urlencoded.
// La respuesta debe ser TwiML — un XML específico de Twilio.

export type TwilioWebhookPayload = {
  from: string     // "whatsapp:+34612345678"
  to: string       // "whatsapp:+14155238886" (tu número de sandbox)
  body: string     // Texto del mensaje del usuario
  messageSid: string
}

export function parseTwilioWebhook(rawBody: string): TwilioWebhookPayload {
  const p = new URLSearchParams(rawBody)
  return {
    from: p.get('From') ?? '',
    to: p.get('To') ?? '',
    body: p.get('Body') ?? '',
    messageSid: p.get('MessageSid') ?? '',
  }
}

// Extrae el número limpio: "whatsapp:+34612345678" → "+34612345678"
export function normalizePhone(twilioPhone: string): string {
  return twilioPhone.replace(/^whatsapp:/, '')
}

// TwiML es el formato XML que Twilio usa para responder mensajes
export function twimlResponse(message: string): Response {
  const safeMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safeMessage}</Message></Response>`

  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

export function errorResponse(message: string): Response {
  return twimlResponse(`Lo siento, ha ocurrido un error interno. Por favor inténtalo de nuevo.`)
}
