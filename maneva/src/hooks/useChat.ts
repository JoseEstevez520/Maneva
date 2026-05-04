/**
 * useChat.ts
 * Gestiona el estado de la conversación con el asistente IA.
 * Extrae la lógica que antes vivía en app/chat.tsx.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
  sendChatMessage,
  type SalonSuggestion,
  type StylistSuggestion,
  type UserContext,
} from '@/services/ai.service'
import {
  getUserProfile,
  getUserPreference,
  getAllUserPreferences,
  getUserStyleProfile,
} from '@/services/users.service'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ChatMessageRole = 'user' | 'bot'

export type ChatMessage = {
  id: string
  role: ChatMessageRole
  content: string
  salons?: SalonSuggestion[]
  stylists?: StylistSuggestion[]
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  // Loaded once on mount; stored in a ref to avoid re-renders
  const userContextRef = useRef<UserContext | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    const userId = user.id

    Promise.all([
      getUserProfile(userId),
      getUserPreference(userId, 'city'),
      getAllUserPreferences(userId, 'service_interest'),
      getUserStyleProfile(userId),
    ])
      .then(([profile, cityPref, serviceInterests, styleProfile]) => {
        userContextRef.current = {
          first_name: profile?.first_name ?? undefined,
          city: cityPref?.preference_value ?? undefined,
          service_interests: serviceInterests.length > 0 ? serviceInterests : undefined,
          hair_type: styleProfile?.hair_type ?? undefined,
        }
      })
      .catch(() => {
        // Context is best-effort: if it fails, n8n still works without it
      })
  }, [user])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isTyping) return

      const userId = user?.id ?? 'anonymous'
      const sessionId = userId

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: trimmed,
      }

      setMessages((prev) => [...prev, userMessage])
      setIsTyping(true)

      try {
        const response = await sendChatMessage(trimmed, sessionId, userId, userContextRef.current)

        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: response.reply,
          salons: response.salons,
          stylists: response.stylists,
        }

        setMessages((prev) => [...prev, botMessage])
      } catch {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: 'Sentímolo, produciuse un erro. Téntao de novo.',
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsTyping(false)
      }
    },
    [isTyping, user?.id],
  )

  return { messages, isTyping, sendMessage }
}
