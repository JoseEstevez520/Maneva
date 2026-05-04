import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { format, parseISO, isSameMonth } from 'date-fns'
import { gl } from 'date-fns/locale'
import { CampaignWithSalon } from '@/services/campaigns.service'
import { Body, Caption, H2 } from '@/components/ui/Typography'
import { Badge } from '@/components/ui/Badge'

type OfferCardProps = {
  offer: CampaignWithSalon
  index: number
}

function getOfferTypeVariant(type: string | null): 'gold' | 'black' | 'success' | 'warning' | 'error' {
  switch (type?.toLowerCase()) {
    case 'discount':  return 'gold'
    case 'promotion': return 'success'
    case 'bundle':    return 'warning'
    case 'limited':   return 'error'
    default:          return 'black'
  }
}

function getOfferTypeLabel(type: string | null): string {
  switch (type?.toLowerCase()) {
    case 'discount':  return 'Desconto'
    case 'promotion': return 'Promoción'
    case 'bundle':    return 'Combo'
    case 'limited':   return 'Limitada'
    default:          return 'Oferta'
  }
}

function formatDateRange(startIso: string, endIso: string): string {
  const start = parseISO(startIso)
  const end = parseISO(endIso)
  const startDay = format(start, 'dd', { locale: gl })
  const startMonth = format(start, 'MMMM', { locale: gl })
  const endDay = format(end, 'dd', { locale: gl })
  const endMonth = format(end, 'MMMM', { locale: gl })

  if (isSameMonth(start, end)) {
    return `${startDay} - ${endDay} de ${startMonth}`
  } else {
    return `${startDay} de ${startMonth} - ${endDay} de ${endMonth}`
  }
}

export default function OfferCard({ offer, index }: OfferCardProps) {
  const router = useRouter()
  const isGold = index % 2 === 0
  const salonName = offer.salon_locations?.name ?? 'Salón'
  const salonCity = offer.salon_locations?.city ?? 'Madrid'
  const dateRange = formatDateRange(offer.start_date, offer.end_date)
  const offerType = getOfferTypeLabel(offer.type)
  const badgeVariant = getOfferTypeVariant(offer.type)

  return (
    <TouchableOpacity
      onPress={() => router.push(`/offer/${offer.id}`)}
      activeOpacity={0.8}
      className="bg-surface dark:bg-surface-dark rounded-[24px] border border-border dark:border-border-dark shadow-card overflow-hidden"
    >
      <View className="flex-row items-center p-[18px] gap-4">
        {/* Icon badge */}
        <View
          className={`w-12 h-12 rounded-[14px] items-center justify-center shrink-0 ${
            isGold
              ? 'bg-gold shadow-gold-badge'
              : 'bg-premium-black shadow-[0_4px_8px_rgba(0,0,0,0.2)]'
          }`}
        >
          <H2 className="font-manrope-extrabold text-[18px] text-premium-white dark:text-premium-white">
            {isGold ? '%' : '🎀'}
          </H2>
        </View>

        {/* Content */}
        <View className="flex-1 gap-2">
          <Body className="font-manrope-bold text-[13px] text-foreground dark:text-foreground-dark leading-[18px]">
            {offer.name}
          </Body>
          <Caption className="font-manrope-medium text-[11px]">
            {salonName} • {salonCity}
          </Caption>
          <Caption className="font-manrope-medium text-[10px] text-foreground-subtle dark:text-foreground-subtle-dark">
            Ata {dateRange}
          </Caption>
          <View className="flex-row gap-2">
            <Badge text={offerType} variant={badgeVariant} size="sm" />
          </View>
        </View>

        {/* Arrow */}
        <H2
          className={`font-manrope-bold text-[22px] ${
            isGold ? 'text-gold' : 'text-foreground-subtle dark:text-foreground-subtle-dark'
          }`}
        >
          ›
        </H2>
      </View>
    </TouchableOpacity>
  )
}
