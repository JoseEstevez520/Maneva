import React from 'react'
import { Image, ScrollView, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { Body, Caption, H1, H2 } from '@/components/ui/Typography'
import { IconAdd, IconBack } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'

const REFERENCE_IMAGES = [
  'https://images.unsplash.com/photo-1562004760-aceed7bb0fe3?w=800&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1611048267451-e6ed903d4a38?w=800&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&h=1000&fit=crop',
]

function BrandHeader() {
  const router = useRouter()

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
      return
    }

    router.replace('/(tabs)/settings')
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

export default function ReferenceCutsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft" edges={['top']}>
      <BrandHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>
        <View className="px-6 py-8">
          <H2 className="font-manrope-bold text-[30px] leading-[36px] text-premium-black">Cortes de Referencia</H2>
          <Body className="mt-2 text-[15px] text-[#6B7280]">Gestiona tus estilos favoritos y añade nuevos</Body>
        </View>

        <View className="px-6 flex-row flex-wrap justify-between gap-y-4">
          {REFERENCE_IMAGES.map((uri) => (
            <View key={uri} className="w-[48%] rounded-[18px] overflow-hidden bg-premium-white border border-[#E9E9E9] shadow-[0_6px_16px_rgba(0,0,0,0.07)]">
              <Image source={{ uri }} className="w-full h-[220px]" resizeMode="cover" />
            </View>
          ))}
        </View>

        {/* TODO: conectar picker y subida real de imágenes de referencia a storage */}
        <TouchableOpacity
          disabled
          activeOpacity={0.8}
          className="mx-6 mt-8 h-[98px] rounded-[20px] border-2 border-dashed border-[#E4D39C] bg-[#F9F7F0] opacity-70 flex-row items-center justify-center gap-4"
        >
          <View className="w-12 h-12 rounded-full bg-gold items-center justify-center">
            <IconAdd size={22} color={Colors.premium.white} strokeWidth={2.8} />
          </View>
          <Caption className="font-manrope-extrabold text-[16px] tracking-[3px] uppercase text-[#D0A52B]">Añadir imagen</Caption>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
