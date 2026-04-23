import React from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { H1 } from '@/components/ui/Typography'
import { IconBack } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'

type BrandHeaderProps = {
  onBack?: () => void
}

export function BrandHeader({ onBack }: BrandHeaderProps) {
  const router = useRouter()

  const handleBack = onBack ?? (() => {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace('/(tabs)/settings')
  })

  return (
    <View className="bg-premium-white border-b border-premium-divider px-5 py-5 flex-row items-center justify-center">
      <TouchableOpacity onPress={handleBack} className="absolute left-5">
        <IconBack size={28} color={Colors.premium.black} strokeWidth={2.2} />
      </TouchableOpacity>
      <H1 className="font-manrope-extrabold text-[18px] tracking-[6px] text-premium-black">MANEVA</H1>
    </View>
  )
}
