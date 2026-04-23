/**
 * OfferCard.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Tarjeta mejorada para mostrar ofertas especiales.
 * Incluye: nombre de oferta, salón, ubicación, fechas, tipo.
 * ─────────────────────────────────────────────────────────────────────────
 */
import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { format, parseISO, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { CampaignWithSalon } from '@/services/campaigns.service'
import { Body, Caption, H2 } from '@/components/ui/Typography'
import { Badge } from '@/components/ui/Badge'
import { Colors } from '@/constants/theme'

type OfferCardProps = {
  offer: CampaignWithSalon
  index: number
}

/**
 * Mapea tipos de oferta a variantes de badge
 */
function getOfferTypeVariant(
  type: string | null
): 'gold' | 'black' | 'success' | 'warning' | 'error' {
  switch (type?.toLowerCase()) {
    case 'discount':
      return 'gold'
    case 'promotion':
      return 'success'
    case 'bundle':
      return 'warning'
    case 'limited':
      return 'error'
    default:
      return 'black'
  }
}

/**
 * Obtiene etiqueta legible para el tipo de oferta
 */
function getOfferTypeLabel(type: string | null): string {
  switch (type?.toLowerCase()) {
    case 'discount':
      return 'Descuento'
    case 'promotion':
      return 'Promoción'
    case 'bundle':
      return 'Combo'
    case 'limited':
      return 'Limitado'
    default:
      return 'Oferta'
  }
}

/**
 * Formatea rango de fechas en español
 * "15 de abril" o "15 - 20 de abril" o "15 de abril - 3 de mayo"
 */
function formatDateRange(startIso: string, endIso: string): string {
  const start = parseISO(startIso)
  const end = parseISO(endIso)

  const startDay = format(start, 'dd', { locale: es })
  const startMonth = format(start, 'MMMM', { locale: es })
  const endDay = format(end, 'dd', { locale: es })
  const endMonth = format(end, 'MMMM', { locale: es })

  if (isSameMonth(start, end)) {
    // Same month: "15 - 20 de abril"
    return `${startDay} - ${endDay} de ${startMonth}`
  } else {
    // Different months: "15 de abril - 3 de mayo"
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

  const handlePress = () => {
    router.push(`/offer/${offer.id}`)
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      className="bg-premium-white rounded-[24px] border border-premium-surface shadow-[0_10px_25px_rgba(0,0,0,0.12)] overflow-hidden"
    >
      <View className="flex-row items-center p-[18px] gap-4">
        {/* Icon badge */}
        <View
          className={`w-12 h-12 rounded-[14px] items-center justify-center shrink-0 ${
            isGold
              ? 'bg-gold shadow-[0_6px_12px_rgba(212,175,55,0.45)]'
              : 'bg-premium-black shadow-[0_4px_8px_rgba(0,0,0,0.2)]'
          }`}
        >
          <H2 className="font-manrope-extrabold text-[18px] text-premium-white">
            {isGold ? '%' : '🎀'}
          </H2>
        </View>

        {/* Content */}
        <View className="flex-1 gap-2">
          {/* Offer name */}
          <Body className="font-manrope-bold text-[13px] text-premium-black leading-[18px]">
            {offer.name}
          </Body>

          {/* Salon and location */}
          <Caption className="font-manrope-medium text-[11px] text-premium-gray">
            {salonName} • {salonCity}
          </Caption>

          {/* Date range */}
          <Caption className="font-manrope-medium text-[10px] text-premium-gray-light">
            Hasta {dateRange}
          </Caption>

          {/* Offer type badge */}
          <View className="flex-row gap-2">
            <Badge text={offerType} variant={badgeVariant} size="sm" />
          </View>
        </View>

        {/* Arrow indicator */}
        <H2
          className={`font-manrope-bold text-[22px] ${
            isGold ? 'text-gold' : 'text-premium-gray-light'
          }`}
        >
          ›
        </H2>
      </View>
    </TouchableOpacity>
  )
}