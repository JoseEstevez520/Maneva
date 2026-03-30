import React from 'react'
import { View, RefreshControl } from 'react-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { H3, Body } from '@/components/ui/Typography'
import { SalonCard } from '@/components/salon/SalonCard'
import { useSalons } from '@/hooks/useSalons'
import { useAuthStore } from '@/store/authStore'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

export default function HomeScreen() {
  const { data: salons, loading, error, refresh } = useSalons()
  const { user } = useAuthStore()

  if (loading && salons.length === 0) {
    return (
      <ScreenLayout header="brand" className="justify-center items-center">
        <LoadingSpinner />
      </ScreenLayout>
    )
  }

  if (error && salons.length === 0) {
    return (
      <ScreenLayout header="brand" className="justify-center px-4">
        <ErrorMessage message={error} />
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout header="brand" scrollable refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>
      <View className="mt-2 mb-6">
        <Body>Hola de nuevo,</Body>
        <Body className="font-manrope-extrabold text-2xl text-premium-black">
          {user?.email?.split('@')[0] || 'Invitado'} 👋
        </Body>
      </View>

      <View className="mb-4">
        <H3 className="mb-4">Salones cerca de ti</H3>
        {salons.map(salon => (
          <SalonCard
            key={salon.id}
            salon={salon}
            onPress={() => console.log('Ir al salón', salon.id)}
          />
        ))}
        {salons.length === 0 && !loading && (
          <Body className="text-center mt-10">No hay salones disponibles en este momento.</Body>
        )}
      </View>
    </ScreenLayout>
  )
}
