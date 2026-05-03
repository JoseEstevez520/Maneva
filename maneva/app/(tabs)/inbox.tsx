import React from 'react'
import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { Body, Caption } from '@/components/ui/Typography'
import { IconMail } from '@/components/ui/icons'
import { useThemeColors } from '@/hooks/useThemeColors'

export default function InboxScreen() {
  const themeColors = useThemeColors()
  return (
    <ScreenLayout header="brand" scrollable={false}>
      <Animated.View
        entering={FadeInDown.duration(400).springify()}
        className="flex-1 items-center justify-center px-8 mb-16"
      >
        <View
          className="w-20 h-20 rounded-full bg-[rgba(212,175,55,0.12)] items-center justify-center mb-5"
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          <IconMail size={34} color={themeColors.gold.DEFAULT} strokeWidth={2.2} />
        </View>
        <Body className="font-manrope-extrabold text-[17px] text-foreground dark:text-foreground-dark text-center mb-2">
          A túa caixa de entrada está baleira
        </Body>
        <Caption className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark text-center leading-relaxed">
          Aquí aparecerán as túas conversas e notificacións
        </Caption>
      </Animated.View>
    </ScreenLayout>
  )
}
