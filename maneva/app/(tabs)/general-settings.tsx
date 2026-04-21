import React, { useMemo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'

import { Body, Caption, H1, H2 } from '@/components/ui/Typography'
import { IconBack, IconChevron } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useUserStyleProfile } from '@/hooks/useUserStyleProfile'

function BrandHeader() {
  const router = useRouter()

  return (
    <View className="bg-premium-white border-b border-[#ECECEC] px-5 py-5 flex-row items-center justify-center">
      <TouchableOpacity onPress={() => router.replace('./settings')} className="absolute left-5">
        <IconBack size={28} color={Colors.premium.black} strokeWidth={2.2} />
      </TouchableOpacity>
      <H1 className="font-manrope-extrabold text-[18px] tracking-[6px] text-premium-black">MANEVA</H1>
    </View>
  )
}

function Row({
  title,
  subtitle,
  onPress,
  showChevron = true,
}: {
  title: string
  subtitle?: string
  onPress?: () => void
  showChevron?: boolean
}) {
  const clickable = !!onPress

  return (
    <TouchableOpacity
      disabled={!clickable}
      onPress={onPress}
      activeOpacity={0.78}
      className={`px-6 py-6 bg-premium-white border-b border-[#ECECEC] ${!clickable ? 'opacity-80' : ''}`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Body className="font-manrope-medium text-[17px] text-premium-black">{title}</Body>
          {subtitle ? <Body className="mt-1 text-[14px] text-[#9CA3AF]">{subtitle}</Body> : null}
        </View>
        {showChevron ? <IconChevron size={20} color="#C7CBD1" strokeWidth={2.2} /> : null}
      </View>
    </TouchableOpacity>
  )
}

export default function GeneralSettingsScreen() {
  const router = useRouter()
  const { data: profile } = useUserProfile()
  const { languages } = useUserStyleProfile()

  const currentLanguage = useMemo(() => {
    const current = languages.find((language) => language.id === profile?.language_id)
    return current?.name ?? 'Castellano'
  }, [languages, profile?.language_id])

  const version = Constants.expoConfig?.version ?? '1.0.0'

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft" edges={['top']}>
      <BrandHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>
        <View className="px-6 py-8">
          <H2 className="font-manrope-bold text-[36px] leading-[42px] text-premium-black">Ajustes generales</H2>
        </View>

        {/* TODO: abrir selector de idioma con persistencia completa */}
        <Row title="Idioma" subtitle={currentLanguage} />
        {/* TODO: enlazar contenido legal y seguridad reales */}
        <Row title="Privacidad y Seguridad" />
        <Row title="Términos de Servicio" />
        <Row title="Política de Privacidad" onPress={() => router.push('./privacy-policy')} />
        <Row title="Versión de la app" subtitle={`v${version}`} showChevron={false} />

    
      </ScrollView>
    </SafeAreaView>
  )
}
