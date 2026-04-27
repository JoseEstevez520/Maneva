import React from 'react'
import { View } from 'react-native'
import { H1, H2 } from '@/components/ui/Typography'

type AppHeaderProps =
  | { variant: 'brand'; title?: never }
  | { variant: 'page'; title: string }

/**
 * AppHeader — Cabecera uniforme para todas las pantallas de las tabs.
 *
 * variant="brand" → Logo MANEVA centrado con tracking amplio
 * variant="page"  → Título de sección alineado a la izquierda
 */
export function AppHeader({ variant, title }: AppHeaderProps) {
  if (variant === 'brand') {
    return (
      <View className="flex-row items-center justify-center bg-surface dark:bg-surface-dark border-b-[0.5px] border-border dark:border-border-dark px-6 py-[18px]">
        <H1 className="font-manrope-extrabold text-[18px] tracking-[6px] text-foreground dark:text-foreground-dark text-center">
          MANEVA
        </H1>
      </View>
    )
  }

  return (
    <View className="flex-row items-center justify-center bg-surface dark:bg-surface-dark border-b-[0.5px] border-border dark:border-border-dark px-6 py-[18px]">
      <H2 className="font-manrope-bold text-[20px] tracking-[0.3px] text-foreground dark:text-foreground-dark">
        {title}
      </H2>
    </View>
  )
}
