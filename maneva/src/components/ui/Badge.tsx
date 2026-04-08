/**
 * Badge.tsx
 * ───────────────────────────────────────────────────────────────��─────────
 * Componente reutilizable para mostrar badges/etiquetas.
 * Soporta múltiples variantes de color.
 * ─────────────────────────────────────────────────────────────────────────
 */
import React from 'react'
import { View, Text } from 'react-native'
import { Colors } from '@/constants/theme'

type BadgeVariant = 'gold' | 'black' | 'success' | 'warning' | 'error'

type BadgeProps = {
  text: string
  variant?: BadgeVariant
  size?: 'sm' | 'md'
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  gold: { bg: 'bg-gold', text: 'text-premium-white' },
  black: { bg: 'bg-premium-black', text: 'text-premium-white' },
  success: { bg: 'bg-[#10B981]', text: 'text-premium-white' },
  warning: { bg: 'bg-[#F59E0B]', text: 'text-premium-white' },
  error: { bg: 'bg-[#EF4444]', text: 'text-premium-white' },
}

export function Badge({ text, variant = 'black', size = 'md' }: BadgeProps) {
  const styles = variantStyles[variant]
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-[11px]'

  return (
    <View className={`${styles.bg} rounded-lg ${sizeClasses}`}>
      <Text className={`font-manrope-bold ${styles.text} tracking-[0.5px] uppercase`}>
        {text}
      </Text>
    </View>
  )
}