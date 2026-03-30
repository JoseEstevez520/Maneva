import React from 'react'
import { View, RefreshControl } from 'react-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { H3, Body } from '@/components/ui/Typography'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

export default function ProfileScreen() {
  const { logout, user } = useAuth()
  const { data: profile, loading, error, refresh } = useUserProfile()

  const fullName = user?.user_metadata?.full_name as string | undefined
  const initials = fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'

  if (loading && !profile) {
    return (
      <ScreenLayout header="brand" className="justify-center items-center">
        <LoadingSpinner />
      </ScreenLayout>
    )
  }

  if (error && !profile) {
    return (
      <ScreenLayout header="brand" className="justify-center px-4">
        <ErrorMessage message={error} />
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout header="brand" refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>
      <View className="bg-white rounded-2xl p-6 shadow-sm shadow-black/10 border border-gray-100 mb-8 items-center mt-2">
        <View className="w-20 h-20 bg-gold/20 rounded-full mb-4 items-center justify-center">
          <H3 className="text-gold text-3xl">{initials}</H3>
        </View>
        <H3 className="mb-1">{fullName || 'Usuario'}</H3>
        <Body>{user?.email}</Body>
      </View>

      <View className="bg-white rounded-2xl p-4 shadow-sm shadow-black/10 border border-gray-100 mb-8">
        <View className="py-3 border-b border-gray-100 flex-row justify-between">
          <Body className="font-manrope-semibold text-premium-black">Tipo de cabello</Body>
          <Body>{profile?.hair_type || 'No especificado'}</Body>
        </View>
        <View className="py-3 border-b border-gray-100 flex-row justify-between">
          <Body className="font-manrope-semibold text-premium-black">Estilos preferidos</Body>
          <Body numberOfLines={1}>{profile?.preferred_styles || 'No especificado'}</Body>
        </View>
        <View className="py-3 items-center mt-2">
          <Body className="text-gold font-manrope-semibold">Editar perfil</Body>
        </View>
      </View>

      <Button
        variant="danger"
        onPress={logout}
      >
        Cerrar Sesión
      </Button>
    </ScreenLayout>
  )
}
