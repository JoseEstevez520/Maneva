/**
 * useChat.ts
 * Gestiona el estado de la conversación con el asistente IA.
 * Extrae la lógica que antes vivía en app/chat.tsx.
 */
import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
  sendChatMessage,
  type SalonSuggestion,
  type StylistSuggestion,
} from '@/services/ai.service'

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

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isTyping) return

      const sessionId = user?.id ?? 'anonymous'

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: trimmed,
      }

      setMessages((prev) => [...prev, userMessage])
      setIsTyping(true)

      try {
        const response = await sendChatMessage(trimmed, sessionId)

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
