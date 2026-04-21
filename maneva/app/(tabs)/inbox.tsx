import React from 'react'
import { View } from 'react-native'
import { Body, H2 } from '@/components/ui/Typography'
import { Button } from '@/components/ui/Button'
import { IconChat } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { ScreenLayout } from '@/components/ui/ScreenLayout'

export default function InboxScreen() {
  return (
    <ScreenLayout header="brand">
      <View className="flex-1 items-center justify-center px-2 py-10">
        <View className="w-20 h-20 rounded-full bg-[rgba(212,175,55,0.12)] items-center justify-center mb-5">
          <IconChat size={34} color={Colors.gold.DEFAULT} strokeWidth={2.2} />
        </View>

        <H2 className="text-center text-[28px] mb-2">Tu inbox está vacío</H2>
        <Body className="text-center text-[15px] leading-6 max-w-[310px] mb-8">
          Aquí verás mensajes, recordatorios de citas y novedades de tus salones favoritos.
        </Body>

      </View>
    </ScreenLayout>
  )
}
