/**
 * chat.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Pantalla del asistente IA. Se presenta como fullScreenModal desde el FAB.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Body, Caption, H2 } from '@/components/ui/Typography'
import {
  IconClose,
  IconSend,
  IconSparkles,
  IconLocation,
} from '@/components/ui/icons'
import { sendChatMessage, type SalonSuggestion, type StylistSuggestion } from '@/services/ai.service'

// ─── Tipos locales ─────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'bot'

type Message = {
  id: string
  role: MessageRole
  content: string
  salons?: SalonSuggestion[]
  stylists?: StylistSuggestion[]
}

// TODO: Agente conversacional rico — mensajes tipados
//
// El objetivo es que el agente no solo responda texto sino que pueda
// enviar componentes interactivos renderizados dentro del chat.
// n8n devolvería un array de mensajes tipados por respuesta:
//
//   { type: 'text',            content: 'Encontré 3 opciones cerca de ti:' }
//   { type: 'salon_card',      data: { id, name, rating, price, city, photo } }
//   { type: 'style_gallery',   data: { title, images: string[] } }
//   { type: 'slots_picker',    data: { salon_id, slots: [{ date, time }] } }
//   { type: 'booking_summary', data: { salon, service, datetime, price } }
//
// El componente MessageBubble se convertiría en un switch por tipo,
// renderizando el componente correspondiente en lugar de solo texto.
// El agente podría mezclar tipos en la misma respuesta (texto + tarjeta).
// Los slots_picker y booking_summary serían interactivos — el usuario
// reserva sin salir del chat.

// ─── Chips de acceso rápido ────────────────────────────────────────────────────

const QUICK_CHIPS = [
  'Buscar salón cerca de mí',
  '¿Qué servicios ofrecéis?',
  'Ver disponibilidad hoy',
  'Recomendadme un salón',
]

// ─── Componentes internos ──────────────────────────────────────────────────────

/** Tres puntos animados que indican que el bot está escribiendo */
function TypingIndicator() {
  const dot1 = useSharedValue(0)
  const dot2 = useSharedValue(0)
  const dot3 = useSharedValue(0)

  const bounce = (sv: Animated.SharedValue<number>, delay: number) => {
    sv.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
        false,
      ),
    )
  }

  // Las shared values tienen referencia estable — el array vacío es correcto.
  useEffect(() => {
    bounce(dot1, 0)
    bounce(dot2, 150)
    bounce(dot3, 300)
  }, [])

  const style1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }))
  const style2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }))
  const style3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }))

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      className="flex-row items-center gap-1 bg-surface-raised dark:bg-surface-raised-dark px-4 py-3 rounded-2xl rounded-tl-sm self-start ml-5 mb-3"
    >
      <Animated.View style={style1} className="w-2 h-2 rounded-full bg-premium-gray" />
      <Animated.View style={style2} className="w-2 h-2 rounded-full bg-premium-gray" />
      <Animated.View style={style3} className="w-2 h-2 rounded-full bg-premium-gray" />
    </Animated.View>
  )
}

/** Burbuja de mensaje — usuario (derecha, negro) o bot (izquierda, gris claro) */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const router = useRouter()
  const themeColors = useThemeColors()

  return (
    <Animated.View
      entering={isUser ? FadeInUp.duration(250) : FadeInDown.duration(250)}
      className={`mb-3 max-w-[82%] ${isUser ? 'self-end mr-5' : 'self-start ml-5'}`}
    >
      <View
        className={`px-4 py-3 ${
          isUser
            ? 'bg-premium-black rounded-2xl rounded-tr-sm'
            : 'bg-surface-raised dark:bg-surface-raised-dark rounded-2xl rounded-tl-sm'
        }`}
      >
        <Body
          className={`font-manrope-medium text-[14px] leading-[20px] ${
            isUser ? 'text-premium-white' : 'text-foreground dark:text-foreground-dark'
          }`}
        >
          {message.content}
        </Body>
      </View>

      {/* Tarjetas de salones sugeridos por el bot */}
      {message.salons && message.salons.length > 0 && (
        <View className="mt-2 gap-2">
          {message.salons.map((salon) => (
            <TouchableOpacity
              key={salon.id}
              onPress={() => router.push(`/salon/${salon.id}`)}
              activeOpacity={0.8}
              className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark-strong rounded-xl px-4 py-3 flex-row items-center gap-3"
            >
              <View className="w-8 h-8 rounded-full bg-[rgba(212,175,55,0.15)] items-center justify-center">
                <IconSparkles size={14} color={themeColors.gold.DEFAULT} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Caption className="font-manrope-extrabold text-[12px] text-foreground dark:text-foreground-dark">
                  {salon.name}
                </Caption>
                {salon.city && (
                  <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
                    {salon.city}
                  </Caption>
                )}
              </View>
              <IconLocation size={14} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  )
}

/** Chips de acceso rápido que aparecen en la conversación vacía */
function QuickChips({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(400).springify()}
      className="px-5 mt-4 gap-2"
    >
      <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark mb-1">
        Puedes preguntarme sobre...
      </Caption>
      <View className="flex-row flex-wrap gap-2">
        {QUICK_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            onPress={() => onSelect(chip)}
            activeOpacity={0.7}
            className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark-strong rounded-full px-4 py-2"
          >
            <Caption className="font-manrope-medium text-[12px] text-foreground dark:text-foreground-dark">
              {chip}
            </Caption>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  )
}

// Declarado a nivel de módulo para evitar que Reanimated remonte
// la vista nativa en cada re-render del componente padre.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// ─── Pantalla principal ────────────────────────────────────────────────────────

export default function ChatScreen() {
  const themeColors = useThemeColors()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const sendScale = useSharedValue(1)
  const sendAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }))

  /** Construye el historial en formato que espera n8n */
  // Generar un sessionId único para esta conversación
  const sessionIdRef = useRef(Date.now().toString())

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isTyping) return

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: trimmed,
      }

      setMessages((prev) => {
        const updated = [...prev, userMessage]
        return updated
      })
      setInput('')
      setIsTyping(true)

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true })
      }, 50)

      try {
        const response = await sendChatMessage(trimmed, sessionIdRef.current)

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: response.reply,
          salons: response.salons,
          stylists: response.stylists,
        }

        setMessages((prev) => [...prev, botMessage])
      } catch {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: 'Lo siento, ha ocurrido un error. Inténtalo de nuevo.',
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsTyping(false)
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true })
        }, 100)
      }
    },
    [isTyping],
  )

  const canSend = input.trim().length > 0 && !isTyping

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        className="flex-row items-center justify-between px-5 py-4 border-b border-border dark:border-border-dark"
      >
        <View className="flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-full bg-surface dark:bg-surface-dark border border-gold items-center justify-center">
            <IconSparkles size={16} color={themeColors.gold.DEFAULT} strokeWidth={2} />
          </View>
          <View>
            <H2 className="font-manrope-extrabold text-[16px] text-foreground dark:text-foreground-dark leading-[20px]">
              Asistente Maneva
            </H2>
            <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
              IA · Responde en segundos
            </Caption>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-8 h-8 rounded-full bg-surface-raised dark:bg-surface-raised-dark items-center justify-center"
        >
          <IconClose size={16} color={themeColors.premium.black} strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Mensajes ── */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="pt-6 pb-4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Mensaje de bienvenida del bot */}
          {messages.length === 0 && (
            <Animated.View entering={FadeInDown.duration(400).springify()}>
              <View className="self-start ml-5 mb-3 max-w-[82%]">
                <View className="bg-surface-raised dark:bg-surface-raised-dark px-4 py-3 rounded-2xl rounded-tl-sm">
                  <Body className="font-manrope-medium text-[14px] leading-[20px] text-foreground dark:text-foreground-dark">
                    ¡Hola! Soy el asistente de Maneva. Puedo ayudarte a encontrar salones,
                    consultar servicios o resolver cualquier duda. ¿En qué te ayudo?
                  </Body>
                </View>
              </View>
              <QuickChips onSelect={(chip) => handleSend(chip)} />
            </Animated.View>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isTyping && <TypingIndicator />}
        </ScrollView>

        {/* ── Input ── */}
        <View className="flex-row items-end gap-3 px-5 py-3 border-t border-border dark:border-border-dark">
          <TextInput
            className="flex-1 bg-surface-raised dark:bg-surface-raised-dark rounded-2xl px-4 py-3 font-manrope-medium text-[14px] text-foreground dark:text-foreground-dark max-h-[100px]"
            placeholder="Escribe tu pregunta..."
            placeholderTextColor={themeColors.premium.gray.DEFAULT}
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={() => handleSend(input)}
            blurOnSubmit={false}
          />

          <AnimatedPressable
            onPress={() => handleSend(input)}
            onPressIn={() => {
              if (canSend) sendScale.value = withSpring(0.88, { damping: 15, stiffness: 300 })
            }}
            onPressOut={() => {
              sendScale.value = withSpring(1, { damping: 15, stiffness: 300 })
            }}
            disabled={!canSend}
            style={sendAnimatedStyle}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              canSend ? 'bg-foreground dark:bg-foreground-dark' : 'bg-border dark:bg-border-dark'
            }`}
          >
            <IconSend
              size={18}
              color={canSend ? themeColors.premium.white : themeColors.premium.gray.DEFAULT}
              strokeWidth={2}
            />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
