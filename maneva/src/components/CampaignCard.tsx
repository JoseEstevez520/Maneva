import React from 'react'
import { View, TouchableOpacity, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { H2, Body, Caption } from '@/components/ui/Typography'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CampaignWithSalon } from '@/services/campaigns.service'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&q=80'

export function CampaignCard({ campaign }: { campaign: CampaignWithSalon }) {
  const router = useRouter()

  const salonName = campaign.salon_locations?.salons?.name ?? campaign.salon_locations?.name ?? 'Salón'
  const endDate = new Date(campaign.end_date)
  const typeLabel = campaign.type ? campaign.type.toUpperCase() : 'OFERTA'

  return (
    <TouchableOpacity
      onPress={() => router.push(`/campaign/${campaign.id}`)}
      activeOpacity={0.7}
      className="mx-5 mb-4 rounded-lg overflow-hidden bg-surface dark:bg-surface-dark border border-border dark:border-border-dark active:opacity-80"
    >
      <Image
        source={{ uri: PLACEHOLDER_IMAGE }}
        className="w-full h-40 bg-surface-overlay dark:bg-surface-overlay-dark"
      />

      <View className="p-4">
        <H2 className="font-manrope-extrabold text-[16px] mb-1">
          {campaign.name}
        </H2>
        <Body className="font-manrope-medium text-[13px] mb-3">
          {salonName}
        </Body>

        <View className="mb-3">
          <View className="inline-flex bg-gold-surface dark:bg-gold-surface-dark border border-gold px-2 py-1 rounded">
            <Caption className="font-manrope-extrabold text-[10px] text-gold tracking-wider">
              {typeLabel}
            </Caption>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <Caption className="font-manrope-medium text-[11px]">
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
