import React from 'react'
import { View, TouchableOpacity, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { H2, Body, Caption } from '@/components/ui/Typography'
import { Colors } from '@/constants/theme'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CampaignWithSalon } from '@/services/campaigns.service'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&q=80'

export function CampaignCard({ campaign }: { campaign: CampaignWithSalon }) {
  const router = useRouter()

  const salonName = campaign.salon_locations?.salons?.name ?? campaign.salon_locations?.name ?? 'Salón'
  const startDate = new Date(campaign.start_date)
  const endDate = new Date(campaign.end_date)
  const typeLabel = campaign.type ? campaign.type.toUpperCase() : 'OFERTA'

  const handlePress = () => {
    router.push(`/campaign/${campaign.id}`)
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className="mx-5 mb-4 rounded-lg overflow-hidden bg-premium-white border border-[#F3F4F6] active:bg-[#F9FAFB]"
    >
      {/* Imagen */}
      <Image
        source={{ uri: PLACEHOLDER_IMAGE }}
        className="w-full h-40 bg-[#F3F4F6]"
      />

      {/* Contenido */}
      <View className="p-4">
        {/* Nombre campaña */}
        <H2 className="font-manrope-extrabold text-[16px] text-premium-black mb-1">
          {campaign.name}
        </H2>

        {/* Salón */}
        <Body className="font-manrope-medium text-[13px] text-premium-gray mb-3">
          {salonName}
        </Body>

        {/* Tipo de oferta */}
        <View className="mb-3">
          <View className="inline-flex bg-[rgba(212,175,55,0.1)] border border-gold px-2 py-1 rounded">
            <Caption className="font-manrope-extrabold text-[10px] text-gold tracking-wider">
              {typeLabel}
            </Caption>
          </View>
        </View>

        {/* Fechas de vigencia */}
        <View className="flex-row items-center justify-between">
          <Caption className="font-manrope-medium text-[11px] text-premium-gray">
            Válido hasta {format(endDate, 'd MMM', { locale: es })}
          </Caption>
          <Caption className="font-manrope-bold text-[11px] text-gold">
            Ver detalles →
          </Caption>
        </View>
      </View>
    </TouchableOpacity>
  )
}