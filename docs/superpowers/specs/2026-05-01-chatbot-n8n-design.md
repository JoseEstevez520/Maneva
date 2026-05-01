# Chatbot IA via n8n — Diseño MVP

**Fecha:** 2026-05-01  
**Estado:** Aprobado

---

## Objetivo

Conectar el chat de la app (tab "Chat") a un agente conversacional en n8n que:
- Mantiene conversaciones naturales sobre peluquería y belleza
- Recomienda salones con tarjeta visual y botón "Reservar"
- Recomienda peluqueros individuales con tarjeta y botón "Ver perfil / Reservar"
- Recuerda el contexto de la conversación (Simple Memory)

---

## Contrato de API (App ↔ n8n)

### Request (app → n8n webhook) — POST

```json
{
  "session_id": "user-uuid",
  "message": "Busco un peluquero especialista en coloración en Madrid",
  "user_id": "user-uuid"
}
```

- `session_id` = `user_id` del authStore — identifica la memoria del usuario en n8n
- No se envía `history` desde la app; n8n lo gestiona con Simple Memory

### Response (n8n → app)

```json
{
  "reply": "He encontrado estos peluqueros especializados en coloración:",
  "salons": [
    {
      "id": "uuid",
      "name": "Salón Premium Madrid",
      "city": "Madrid",
      "rating": 4.8,
      "photo_url": "https://..."
    }
  ],
  "stylists": [
    {
      "id": "uuid",
      "name": "María García",
      "specialty": "Coloración",
      "rating": 4.9,
      "photo_url": "https://...",
      "salon_name": "Salón Premium Madrid",
      "salon_id": "uuid"
    }
  ]
}
```

- `reply` siempre presente
- `salons` es `[]` cuando no hay recomendaciones de salones
- `stylists` es `[]` cuando no hay recomendaciones de peluqueros
- El agente puede devolver solo salones, solo peluqueros, ambos, o ninguno

---

## Flujo n8n (AI Agent con herramientas)

```
[Webhook] → [AI Agent] → [Respond to Webhook]
                ↑
         [Simple Memory]
                ↑
     Tools: [buscar_salones] [buscar_peluqueros]
               ↓                    ↓
        HTTP Supabase REST    HTTP Supabase REST
```

### Nodo 1 — Webhook
- Método: POST
- Campos de entrada: `session_id`, `message`, `user_id`

### Nodo 2 — AI Agent
- Modelo: DeepSeek-V3 (API key configurada por el usuario en n8n)
- Memory: Simple Memory con key `{{ $json.session_id }}`
- System prompt: asistente especializado en peluquerías y salones de belleza; mantiene conversación natural y recomienda salones o peluqueros cuando es relevante; devuelve siempre JSON con `reply`, `salons[]` y `stylists[]`
- Herramientas: `buscar_salones`, `buscar_peluqueros`

### Tool: buscar_salones
- HTTP GET a Supabase REST API (`/rest/v1/salons`)
- Parámetros opcionales que el agente extrae del mensaje: `city`, `service`
- Headers: `apikey` y `Authorization` con el anon key de Supabase
- Campos devueltos: `id`, `name`, `city`, `rating`, `photo_url`

### Tool: buscar_peluqueros
- HTTP GET a Supabase REST API (`/rest/v1/profiles?role=eq.stylist`)
- Parámetros opcionales: `specialty`, `city` (via join con salons)
- Headers: `apikey` y `Authorization` con el anon key de Supabase
- Campos devueltos: `id`, `full_name`, `specialty`, `rating`, `avatar_url`, `salon_id`, `salon_name`

### Nodo 3 — Respond to Webhook
- Formatea la respuesta final como `{ reply, salons[], stylists[] }`
- Arrays vacíos cuando el agente no llamó a la herramienta correspondiente

---

## Cambios en la App

### `src/services/ai.service.ts`
- Añadir `session_id` (del authStore) al payload, eliminar `history`
- Añadir tipo `StylistSuggestion`: `{ id, name, specialty, rating, photo_url, salon_name, salon_id }`
- Actualizar tipo `ChatResponse`: añadir `stylists: StylistSuggestion[]`

### `src/hooks/useChat.ts` (nuevo)
- Extraer lógica de estado que actualmente vive en `app/chat.tsx`
- Gestiona: `messages`, `loading`, `error`
- Expone: `sendMessage(text: string)`, `messages`, `loading`
- Obtiene `user_id` del authStore como `session_id`

### `app/chat.tsx`
- Consumir `useChat` en lugar de gestionar estado inline
- Tarjeta de salón: botón "Reservar" navega a `/(tabs)/bookings?salonId=<id>`
- Tarjeta de peluquero (nueva): muestra nombre, especialidad, rating, foto y botón "Reservar" que navega a `/(tabs)/bookings?salonId=<salon_id>&stylistId=<id>`

---

## Datos de prueba (seed)

Se creará un script de seed con:
- 3-5 salones en ciudades distintas (Madrid, Barcelona, Sevilla)
- 2-3 peluqueros por salón con especialidades variadas (corte, coloración, barba)

Esto permite probar el chatbot sin depender de datos reales.

---

## Fuera del MVP (siguiente fase)

- Ver disponibilidad en tiempo real desde el chat
- Completar reserva completa (fecha, hora, servicio) dentro del chat
- Galería de estilos / fotos de trabajos del peluquero
- Filtros avanzados (precio, distancia, valoración mínima)
- Persistencia del historial de chat en Supabase

---

## Queries Supabase de referencia

### Buscar salones
```
GET /rest/v1/salons?select=id,name,city,rating,photo_url&city=eq.Madrid
```

### Buscar peluqueros (stylists) con su salón
```
GET /rest/v1/profiles?select=id,full_name,specialty,rating,avatar_url,salon_id,salons(name)&role=eq.stylist
```

Filtros opcionales:
- `specialty=eq.coloracion`
- `city` via join con salons
