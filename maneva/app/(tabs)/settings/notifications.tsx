import React, { useMemo } from 'react'
import { Alert, ScrollView, Switch, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { Body, Caption, H2 } from '@/components/ui/Typography'
import { IconChevron } from '@/components/ui/icons'
import { BrandHeader } from '@/components/ui/BrandHeader'
import { Colors } from '@/constants/theme'
import { useNotificationSettings } from '@/hooks/useNotificationSettings'
import { ErrorMessage } from '@/components/ui/ErrorMessage'


export default function NotificationsScreen() {
  const router = useRouter()
  const {
    offersScope,
    homeServiceEnabled,
    error,
    saveOffersScope,
    saveHomeServiceEnabled,
  } = useNotificationSettings()

  const offersLabel = useMemo(() => {
    if (offersScope === 'all') return 'Todas'
    if (offersScope === 'none') return 'Ninguna'
    return 'Solo de peluquerías favoritas'
  }, [offersScope])

  const handleSelectOffersScope = async (scope: 'all' | 'favorites' | 'none') => {
    await saveOffersScope(scope)
  }

  const openOffersScopeSelector = () => {
    Alert.alert('Notificaciones de ofertas', 'Elige qué ofertas quieres recibir', [
      {
        text: 'Todas',
        onPress: () => {
          void handleSelectOffersScope('all')
        },
      },
      {
        text: 'Solo favoritas',
        onPress: () => {
          void handleSelectOffersScope('favorites')
        },
      },
      {
        text: 'Ninguna',
        onPress: () => {
          void handleSelectOffersScope('none')
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  const handleHomeServiceToggle = (nextValue: boolean) => {
    void saveHomeServiceEnabled(nextValue)
  }

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft" edges={['top']}>
      <BrandHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>
        <View className="px-6 py-8">
          <H2 className="font-manrope-bold text-[30px] leading-[36px] text-premium-black">Notificaciones</H2>
        </View>

        {error ? <ErrorMessage message={error} className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 p-3" /> : null}

        <Caption className="px-6 pb-3 font-manrope-extrabold text-[11px] tracking-[3.2px] uppercase text-[#9CA3AF]">
          Ofertas
        </Caption>

        <TouchableOpacity onPress={openOffersScopeSelector} activeOpacity={0.8} className="px-6 py-5 bg-premium-white border-y border-[#ECECEC]">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Body className="font-manrope-medium text-[17px] text-premium-black">Notificaciones de ofertas</Body>
              <Body className="mt-1 text-[14px] text-[#6B7280]">{offersLabel}</Body>
            </View>
            <IconChevron size={20} color="#C7CBD1" strokeWidth={2.2} />
          </View>
        </TouchableOpacity>

        <Caption className="px-6 pt-10 pb-3 font-manrope-extrabold text-[11px] tracking-[3.2px] uppercase text-[#9CA3AF]">
          A domicilio
        </Caption>

        <View className="px-6 py-5 bg-premium-white border-y border-[#ECECEC]">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Body className="font-manrope-medium text-[17px] text-premium-black">A domicilio</Body>
              <Body className="mt-1 leading-7 text-[14px] text-[#6B7280]">
                Recibir notificaciones cuando un peluquero realice cortes a domicilio en mi zona
              </Body>
            </View>
            <Switch
              value={homeServiceEnabled}
              onValueChange={handleHomeServiceToggle}
              trackColor={{ false: '#D9DDE2', true: Colors.gold.light }}
              thumbColor={homeServiceEnabled ? Colors.gold.DEFAULT : '#FFFFFF'}
              ios_backgroundColor="#D9DDE2"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
