/**
 * offer/[id].tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Pantalla de detalle de una oferta especial.
 * Muestra toda la información de la campaña y permite reservar o contactar.
 * ─────────────────────────────────────────────────────────────────────────
 */
import React from 'react'
import { View, ScrollView, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { format, parseISO, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { useCampaignById } from '@/hooks/useCampaigns'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { H1, H2, Body, Caption } from '@/components/ui/Typography'
import { Badge } from '@/components/ui/Badge'
import { IconLocation, IconCalendar } from '@/components/ui/icons'
import { useThemeColors } from '@/hooks/useThemeColors'

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=400&h=300&fit=crop&q=80'

/**
 * Formatea rango de fechas en español completo
 */
function formatDateRange(startIso: string, endIso: string): string {
  const start = parseISO(startIso)
  const end = parseISO(endIso)

  const startDay = format(start, 'dd', { locale: es })
  const startMonth = format(start, 'MMMM', { locale: es })
  const endDay = format(end, 'dd', { locale: es })
  const endMonth = format(end, 'MMMM', { locale: es })

  if (isSameMonth(start, end)) {
    return `${startDay} - ${endDay} de ${startMonth}`
  } else {
    return `${startDay} de ${startMonth} - ${endDay} de ${endMonth}`
  }
}

/**
 * Obtiene información legible del tipo de oferta
 */
function getOfferTypeInfo(type: string | null): { label: string; variant: 'gold' | 'black' | 'success' | 'warning' | 'error' } {
  const typeMap: Record<string, { label: string; variant: 'gold' | 'black' | 'success' | 'warning' | 'error' }> = {
    discount: { label: 'Descuento', variant: 'gold' },
    promotion: { label: 'Promoción', variant: 'success' },
    bundle: { label: 'Combo/Bundle', variant: 'warning' },
    limited: { label: 'Oferta Limitada', variant: 'error' },
  }

  if (type && type.toLowerCase() in typeMap) {
    return typeMap[type.toLowerCase()]
  }

  return { label: 'Oferta Especial', variant: 'black' }
}

export default function OfferDetailScreen() {
  const themeColors = useThemeColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: offer, loading, error } = useCampaignById(id)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />
  if (!offer) {
    return (
      <ScreenLayout header="back" onHeaderBack={() => router.back()} edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <Body className="font-manrope-medium text-[14px] text-foreground-muted dark:text-foreground-muted-dark">
            Oferta no encontrada
          </Body>
        </View>
      </ScreenLayout>
    )
  }

  const salonName = offer.salon_locations?.name ?? 'Salón'
  const salonCity = offer.salon_locations?.city ?? 'Madrid'
  const salonAddress = offer.salon_locations?.address
  const salonPhone = offer.salon_locations?.phone
  const dateRange = formatDateRange(offer.start_date, offer.end_date)
  const offerTypeInfo = getOfferTypeInfo(offer.type)

  // Parse condition JSON if it exists
  const conditionText = offer.condition
    ? typeof offer.condition === 'string'
      ? offer.condition
      : JSON.stringify(offer.condition)
    : null

  return (
    <ScreenLayout header="back" onHeaderBack={() => router.back()} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-8"
      >
        {/* Hero image */}
        <View className="w-full h-[200px] bg-premium-gray-light">
          {/* Placeholder for offer hero image */}
          <View className="w-full h-full bg-gold/20 items-center justify-center">
            <H1 className="font-manrope-extrabold text-[48px] text-premium-white">
              {offerTypeInfo.variant === 'gold' ? '%' : '🎀'}
            </H1>
          </View>
        </View>

        {/* Content */}
        <View className="px-5 pt-6 gap-6">
          {/* Offer title and type */}
          <View className="gap-3">
            <H1 className="font-manrope-extrabold text-[28px] text-foreground dark:text-foreground-dark leading-[36px]">
              {offer.name}
            </H1>
            <Badge
              text={offerTypeInfo.label}
              variant={offerTypeInfo.variant}
              size="md"
            />
          </View>

          {/* Salon info card */}
          <View className="bg-surface dark:bg-surface-dark rounded-[20px] border border-border dark:border-border-dark shadow-sm p-4 gap-3">
            <View className="flex-row items-start gap-3">
              <View className="flex-1">
                <H2 className="font-manrope-bold text-[16px] text-foreground dark:text-foreground-dark mb-1">
                  {salonName}
                </H2>

                {salonAddress && (
                  <View className="flex-row gap-2 mb-2">
                    <IconLocation
                      color={themeColors.premium.gray.DEFAULT}
                      size={14}
                      strokeWidth={2}
                    />
                    <Body className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark flex-1">
                      {salonAddress}, {salonCity}
                    </Body>
                  </View>
                )}

                {salonPhone && (
                  <Body className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark">
                    📞 {salonPhone}
                  </Body>
                )}
              </View>
            </View>
          </View>

          {/* Validity dates */}
          <View className="bg-premium-blackSoft/5 rounded-[16px] p-4 gap-2">
            <View className="flex-row items-center gap-2">
              <IconCalendar
                color={themeColors.gold.DEFAULT}
                size={16}
                strokeWidth={2.5}
              />
              <Caption className="font-manrope-bold text-[11px] text-gold uppercase tracking-[0.5px]">
                Vigencia de la oferta
              </Caption>
            </View>
            <Body className="font-manrope-medium text-[13px] text-foreground dark:text-foreground-dark">
              Desde el {dateRange}
            </Body>
          </View>

          {/* Terms and conditions */}
          {conditionText && (
            <View className="gap-2">
              <Caption className="font-manrope-bold text-[11px] text-foreground dark:text-foreground-dark uppercase tracking-[1px]">
                Términos y Condiciones
              </Caption>
              <View className="bg-surface dark:bg-surface-dark rounded-[16px] border border-border dark:border-border-dark p-4">
                <Body className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark leading-[18px]">
                  {conditionText}
                </Body>
              </View>
            </View>
          )}

          {/* CTA Buttons */}
          <View className="gap-3 pt-4">
            {/* Book now button */}
            <TouchableOpacity
              className="bg-gold rounded-lg py-3.5 items-center shadow-gold"
              activeOpacity={0.85}
            >
              <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-white uppercase">
                Reservar Ahora
              </Caption>
            </TouchableOpacity>

            {/* Contact button */}
            <TouchableOpacity
              className="border border-premium-black rounded-lg py-3.5 items-center"
              activeOpacity={0.7}
            >
              <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-foreground dark:text-foreground-dark uppercase">
                Contactar Salón
              </Caption>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  )
}