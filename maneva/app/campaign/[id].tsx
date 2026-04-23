import React from 'react'
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  IconBack,
  IconCalendar,
  IconTag,
  IconLocation,
  IconPhone,
} from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { H1, H2, Body, Caption } from '@/components/ui/Typography'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useCampaignDetail } from '@/hooks/useCampaignDetail'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop&q=80'

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams() as { id: string }
  const router = useRouter()
  const { data: campaign, loading, error } = useCampaignDetail(id)

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-premium-white items-center justify-center">
        <LoadingSpinner />
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-premium-white items-center justify-center px-6">
        <Body className="text-premium-gray text-center">{error}</Body>
      </SafeAreaView>
    )
  }

  if (!campaign) {
    return (
      <SafeAreaView className="flex-1 bg-premium-white items-center justify-center">
        <Body className="text-premium-gray">Campaña no encontrada</Body>
      </SafeAreaView>
    )
  }

  const salonName = campaign.salon_locations?.salons?.name ?? campaign.salon_locations?.name ?? 'Salón'
  const salonCity = campaign.salon_locations?.city ?? 'Madrid'
  const salonAddress = campaign.salon_locations?.address
  const salonPhone = campaign.salon_locations?.phone
  const startFormatted = format(parseISO(campaign.start_date), "d 'de' MMMM yyyy", { locale: es })
  const endFormatted = format(parseISO(campaign.end_date), "d 'de' MMMM yyyy", { locale: es })
  const typeLabel = campaign.type ? campaign.type.toUpperCase() : 'OFERTA'
  const isActive = new Date() <= parseISO(campaign.end_date)

  return (
    <SafeAreaView className="flex-1 bg-premium-white" edges={['top']}>
      {/* Header con botón de volver */}
      <View className="absolute top-0 left-0 z-10 pt-4 px-5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-premium-white rounded-full items-center justify-center shadow-md"
        >
          <IconBack size={20} color={Colors.premium.black} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-40">
        {/* Imagen */}
        <Image
          source={{ uri: PLACEHOLDER_IMAGE }}
          className="w-full h-56 bg-premium-surface-soft"
        />

        {/* Info Principal */}
        <View className="px-5 pt-6 pb-6 border-b border-premium-surface-soft">
          <H1 className="font-manrope-extrabold text-[28px] text-premium-black mb-3">
            {campaign.name}
          </H1>

          {/* Tipo de oferta */}
          {campaign.type && (
            <View className="mb-4 inline-flex bg-[rgba(212,175,55,0.1)] border border-gold px-3 py-1 rounded-full w-fit">
              <View className="flex-row items-center gap-1.5">
                <IconTag size={14} color={Colors.gold.DEFAULT} strokeWidth={2} />
                <Caption className="font-manrope-extrabold text-[11px] text-gold tracking-wider">
                  {typeLabel}
                </Caption>
              </View>
            </View>
          )}

          {/* Salón */}
          <Body className="font-manrope-medium text-[14px] text-premium-gray mb-4">
            {salonName} • {salonCity}
          </Body>

          {/* Estado */}
          {isActive ? (
            <View className="inline-flex bg-[rgba(76,175,80,0.1)] border border-success-campaign px-3 py-1 rounded-full w-fit">
              <Caption className="font-manrope-extrabold text-[11px] text-success-campaign">
                VÁLIDA AHORA
              </Caption>
            </View>
          ) : (
            <View className="inline-flex bg-[rgba(244,67,54,0.1)] border border-error-campaign px-3 py-1 rounded-full w-fit">
              <Caption className="font-manrope-extrabold text-[11px] text-error-campaign">
                EXPIRADA
              </Caption>
            </View>
          )}
        </View>

        {/* Fechas */}
        <View className="px-5 py-6 border-b border-premium-surface-soft">
          <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-4">
            PERÍODO DE VALIDEZ
          </Caption>
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <IconCalendar size={16} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
              <Body className="font-manrope-medium text-[13px] text-premium-black">
                Desde {startFormatted}
              </Body>
            </View>
            <View className="flex-row items-center gap-2">
              <IconCalendar size={16} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
              <Body className="font-manrope-medium text-[13px] text-premium-black">
                Hasta {endFormatted}
              </Body>
            </View>
          </View>
        </View>

        {/* Ubicación del Salón */}
        <View className="px-5 py-6 border-b border-premium-surface-soft">
          <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-4">
            UBICACIÓN
          </Caption>
          <View className="p-4 bg-premium-white-pale rounded-lg gap-3">
            <View>
              <H2 className="font-manrope-extrabold text-[14px] text-premium-black mb-2">
                {salonName}
              </H2>
            </View>

            {salonAddress && (
              <View className="flex-row items-flex-start gap-2">
                <IconLocation size={16} color={Colors.premium.gray.DEFAULT} strokeWidth={2} style={{ marginTop: 2 }} />
                <Body className="font-manrope-medium text-[13px] text-premium-gray flex-1">
                  {salonAddress}
                </Body>
              </View>
            )}

            {salonPhone && (
              <View className="flex-row items-center gap-2">
                <IconPhone size={16} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
                <Body className="font-manrope-medium text-[13px] text-gold">
                  {salonPhone}
                </Body>
              </View>
            )}

            <TouchableOpacity
              onPress={() => router.push(`/salon/${campaign.location_id}`)}
              className="mt-2 py-2 border-t border-premium-divider-strong"
            >
              <Body className="font-manrope-bold text-[13px] text-gold">
                Ver perfil del salón →
              </Body>
            </TouchableOpacity>
          </View>
        </View>

        {/* Descripción / Condiciones */}
        {campaign.condition && typeof campaign.condition === 'object' && campaign.condition.description && (
          <View className="px-5 py-6">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-4">
              DETALLES DE LA OFERTA
            </Caption>
            <Body className="font-manrope-medium text-[13px] text-premium-gray leading-5">
              {campaign.condition.description}
            </Body>
          </View>
        )}
      </ScrollView>

      {/* Botón fijo */}
      {isActive && (
        <View className="absolute bottom-0 left-0 right-0 bg-premium-white px-5 py-4 border-t border-premium-surface-soft">
          <TouchableOpacity
            className="w-full bg-gold rounded-full py-4 items-center active:opacity-80"
            onPress={() => {
              router.push(`/salon/${campaign.location_id}`)
            }}
          >
            <Body className="font-manrope-extrabold text-[15px] text-premium-black">
              Ir al salón y reservar
            </Body>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}