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
import { Colors } from '@/constants/theme'
import { Body, Caption, H2 } from '@/components/ui/Typography'
import {
  IconClose,
  IconSend,
  IconSparkles,
  IconLocation,
} from '@/components/ui/icons'
import { sendChatMessage, type ChatMessage, type SalonSuggestion } from '@/services/ai.service'

// ─── Tipos locales ─────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'bot'

type Message = {
  id: string
  role: MessageRole
  content: string
  salons?: SalonSuggestion[]
}

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
      className="flex-row items-center gap-1 bg-[#F5F5F5] px-4 py-3 rounded-2xl rounded-tl-sm self-start ml-5 mb-3"
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

  return (
    <Animated.View
      entering={isUser ? FadeInUp.duration(250) : FadeInDown.duration(250)}
      className={`mb-3 max-w-[82%] ${isUser ? 'self-end mr-5' : 'self-start ml-5'}`}
    >
      <View
        className={`px-4 py-3 ${
          isUser
            ? 'bg-premium-black rounded-2xl rounded-tr-sm'
            : 'bg-[#F5F5F5] rounded-2xl rounded-tl-sm'
        }`}
      >
        <Body
          className={`font-manrope-medium text-[14px] leading-[20px] ${
            isUser ? 'text-premium-white' : 'text-premium-black'
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
              className="bg-premium-white border border-[#E5E7EB] rounded-xl px-4 py-3 flex-row items-center gap-3"
            >
              <View className="w-8 h-8 rounded-full bg-[rgba(212,175,55,0.15)] items-center justify-center">
                <IconSparkles size={14} color={Colors.gold.DEFAULT} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Caption className="font-manrope-extrabold text-[12px] text-premium-black">
                  {salon.name}
                </Caption>
                {salon.city && (
                  <Caption className="font-manrope-medium text-[11px] text-premium-gray">
                    {salon.city}
                  </Caption>
                )}
              </View>
              <IconLocation size={14} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
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
      <Caption className="font-manrope-medium text-[11px] text-premium-gray mb-1">
        Puedes preguntarme sobre...
      </Caption>
      <View className="flex-row flex-wrap gap-2">
        {QUICK_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            onPress={() => onSelect(chip)}
            activeOpacity={0.7}
            className="bg-premium-white border border-[#E5E7EB] rounded-full px-4 py-2"
          >
            <Caption className="font-manrope-medium text-[12px] text-premium-black">
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
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const sendScale = useSharedValue(1)
  const sendAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }))

  /** Construye el historial en formato que espera n8n */
  const buildHistory = useCallback(
    (currentMessages: Message[]): ChatMessage[] =>
      currentMessages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    [],
  )

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
        const history = buildHistory(messages)
        const response = await sendChatMessage(trimmed, history)

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: response.reply,
          salons: response.salons,
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
    [isTyping, messages, buildHistory],
  )

  const canSend = input.trim().length > 0 && !isTyping

  return (
    <SafeAreaView className="flex-1 bg-premium-white" edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        className="flex-row items-center justify-between px-5 py-4 border-b border-[#F3F4F6]"
      >
        <View className="flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-full bg-premium-white border border-gold items-center justify-center">
            <IconSparkles size={16} color={Colors.gold.DEFAULT} strokeWidth={2} />
          </View>
          <View>
            <H2 className="font-manrope-extrabold text-[16px] text-premium-black leading-[20px]">
              Asistente Maneva
            </H2>
            <Caption className="font-manrope-medium text-[11px] text-premium-gray">
              IA · Responde en segundos
            </Caption>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-8 h-8 rounded-full bg-[#F5F5F5] items-center justify-center"
        >
          <IconClose size={16} color={Colors.premium.black} strokeWidth={2.5} />
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
                <View className="bg-[#F5F5F5] px-4 py-3 rounded-2xl rounded-tl-sm">
                  <Body className="font-manrope-medium text-[14px] leading-[20px] text-premium-black">
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
        <View className="flex-row items-end gap-3 px-5 py-3 border-t border-[#F3F4F6]">
          <TextInput
            className="flex-1 bg-[#F5F5F5] rounded-2xl px-4 py-3 font-manrope-medium text-[14px] text-premium-black max-h-[100px]"
            placeholder="Escribe tu pregunta..."
            placeholderTextColor={Colors.premium.gray.DEFAULT}
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
              canSend ? 'bg-premium-black' : 'bg-[#E5E7EB]'
            }`}
          >
            <IconSend
              size={18}
              color={canSend ? Colors.premium.white : Colors.premium.gray.DEFAULT}
              strokeWidth={2}
            />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
