import React from 'react'
import { View, Text } from 'react-native'

type BadgeVariant = 'gold' | 'black' | 'success' | 'warning' | 'error'

type BadgeProps = {
  text: string
  variant?: BadgeVariant
  size?: 'sm' | 'md'
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  gold:    { bg: 'bg-gold',                                                           text: 'text-premium-white' },
  black:   { bg: 'bg-foreground dark:bg-foreground-dark',                             text: 'text-surface dark:text-surface-dark' },
  success: { bg: 'bg-success',                                                        text: 'text-premium-white' },
  warning: { bg: 'bg-warning',                                                        text: 'text-foreground dark:text-foreground-dark' },
  error:   { bg: 'bg-error',                                                          text: 'text-premium-white' },
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
