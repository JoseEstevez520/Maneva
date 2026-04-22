import React from 'react'
import { Image, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { Body, H1 } from '@/components/ui/Typography'
import { IconBack } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'

function BrandHeader() {
  const router = useRouter()

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
      return
    }

    router.replace('/(tabs)/settings/general-settings')
  }

  return (
    <View className="bg-premium-white border-b border-[#ECECEC] px-5 py-5 flex-row items-center justify-center">
      <TouchableOpacity onPress={handleBack} className="absolute left-5">
        <IconBack size={28} color={Colors.premium.black} strokeWidth={2.2} />
      </TouchableOpacity>
      <H1 className="font-manrope-extrabold text-[18px] tracking-[6px] text-premium-black">MANEVA</H1>
    </View>
  )
}

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft" edges={['top']}>
      <BrandHeader />

      <View className="flex-1 items-center justify-center px-8">
        <Image
          source={require('../../../assets/images/logo.png')}
          className="w-[220px] h-[220px] rounded-[20px] mb-8"
          resizeMode="contain"
        />
        <Body className="text-[28px] font-manrope-extrabold text-premium-black text-center">
          shhhh es privado
        </Body>
      </View>
    </SafeAreaView>
  )
}
