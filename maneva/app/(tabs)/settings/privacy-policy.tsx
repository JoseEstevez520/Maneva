import React from 'react'
import { Image, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Body } from '@/components/ui/Typography'
import { BrandHeader } from '@/components/ui/BrandHeader'

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <BrandHeader />

      <View className="flex-1 items-center justify-center px-8">
        <Image
          source={require('../../../assets/images/logo.png')}
          className="w-[220px] h-[220px] rounded-[20px] mb-8"
          resizeMode="contain"
        />
        <Body className="text-[28px] font-manrope-extrabold text-foreground dark:text-foreground-dark text-center">
          shhhh es privado
        </Body>
      </View>
    </SafeAreaView>
  )
}
