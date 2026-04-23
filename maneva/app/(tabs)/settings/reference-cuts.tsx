import React from 'react'
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Body, Caption, H2 } from '@/components/ui/Typography'
import { IconAdd, IconClose } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { BrandHeader } from '@/components/ui/BrandHeader'
import { useReferenceCuts } from '@/hooks/useReferenceCuts'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

export default function ReferenceCutsScreen() {
  const { cuts, loading, uploading, error, pickAndUpload, remove } = useReferenceCuts()

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft" edges={['top']}>
      <BrandHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>
        <View className="px-6 py-8">
          <H2 className="font-manrope-bold text-[30px] leading-[36px] text-premium-black">Cortes de Referencia</H2>
          <Body className="mt-2 text-[15px] text-[#6B7280]">Gestiona tus estilos favoritos y añade nuevos</Body>
        </View>

        {error ? (
          <View className="px-6">
            <ErrorMessage message={error} />
          </View>
        ) : null}

        {loading ? (
          <View className="px-6 items-center py-8">
            <ActivityIndicator size="large" color={Colors.gold.DEFAULT} />
          </View>
        ) : (
          <View className="px-6 flex-row flex-wrap justify-between gap-y-4">
            {cuts.map((uri) => (
              <View key={uri} className="w-[48%] rounded-[18px] overflow-hidden bg-premium-white border border-[#E9E9E9] shadow-[0_6px_16px_rgba(0,0,0,0.07)]">
                <Image source={{ uri }} className="w-full h-[220px]" resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => { void remove(uri) }}
                  activeOpacity={0.8}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 items-center justify-center"
                >
                  <IconClose size={14} color={Colors.premium.white} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => { void pickAndUpload() }}
          disabled={uploading || loading}
          activeOpacity={0.8}
          className="mx-6 mt-8 h-[98px] rounded-[20px] border-2 border-dashed border-[#E4D39C] bg-[#F9F7F0] flex-row items-center justify-center gap-4"
          style={{ opacity: uploading || loading ? 0.6 : 1 }}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.gold.DEFAULT} />
          ) : (
            <View className="w-12 h-12 rounded-full bg-gold items-center justify-center">
              <IconAdd size={22} color={Colors.premium.white} strokeWidth={2.8} />
            </View>
          )}
          <Caption className="font-manrope-extrabold text-[16px] tracking-[3px] uppercase text-gold">
            {uploading ? 'Subiendo...' : 'Añadir imagen'}
          </Caption>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
