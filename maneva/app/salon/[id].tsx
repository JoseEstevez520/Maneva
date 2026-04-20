import React, { useState } from 'react'
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  IconStar,
  IconPhone,
  IconLocation,
  IconClock,
  IconClose,
  IconNorthWest,
} from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { useSalon } from '@/hooks/useSalons'
import { H1, H2, Body, Caption } from '@/components/ui/Typography'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=600&h=400&fit=crop&q=80'

export default function SalonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: salon, loading, error } = useSalon(id || '')
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null)

  if (loading)
    return (
      <SafeAreaView className="flex-1 bg-premium-white items-center justify-center">
        <LoadingSpinner />
      </SafeAreaView>
    )

  if (error || !salon)
    return (
      <SafeAreaView className="flex-1 bg-premium-white items-center justify-center">
        <ErrorMessage message={error || 'Salón no encontrado'} />
      </SafeAreaView>
    )

  const salonName = salon.salons?.name || 'Salón'
  const avgRating = salon.avgRating ?? 0
  const reviewCount = salon.reviews?.length ?? 0
  const hasEcoBadge = (salon.eco_labels?.length ?? 0) > 0
  const services = salon.services ?? []
  const employees = salon.employees ?? []
  const campaigns = salon.campaigns ?? []
  const reviews = salon.reviews ?? []

  return (
    <SafeAreaView className="flex-1 bg-premium-white" edges={['top']}>
      {/* Header Button */}
      <View className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-premium-white rounded-full items-center justify-center shadow-sm"
        >
          <IconClose size={20} color={Colors.premium.black} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
        {/* ─── Foto de Portada ─── */}
        <View className="w-full h-[240px] bg-[#F5F5F5] mt-12">
          <Image
            source={{ uri: salon.cover_image || PLACEHOLDER_IMAGE }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>

        {/* ─── Información Principal ─── */}
        <View className="px-5 mt-6 mb-6">
          {/* Nombre + Eco Badge */}
          <View className="flex-row items-start justify-between mb-3 gap-3">
            <View className="flex-1">
              <H1 className="font-manrope-bold text-[24px] text-premium-black leading-[32px]">
                {salonName}
              </H1>
            </View>
            {hasEcoBadge && (
              <View className="bg-[rgba(34,197,94,0.1)] px-2.5 py-1.5 rounded-lg">
                <Caption className="font-manrope-bold text-[10px] text-green-600">
                  ♻️ ECO
                </Caption>
              </View>
            )}
          </View>

          {/* Rating */}
          <View className="flex-row items-center gap-2 mb-4">
            <View className="flex-row items-center gap-0.5">
              {[...Array(Math.round(avgRating))].map((_, i) => (
                <IconStar
                  key={i}
                  color={Colors.gold.DEFAULT}
                  size={16}
                  fill={Colors.gold.DEFAULT}
                />
              ))}
            </View>
            <Body className="font-manrope-bold text-[14px] text-premium-black">
              {avgRating.toFixed(1)}
            </Body>
            <Caption className="font-manrope-medium text-[12px] text-premium-gray">
              ({reviewCount} reseñas)
            </Caption>
          </View>

          {/* Dirección */}
          {salon.street_address && (
            <View className="flex-row items-start gap-2 mb-3">
              <IconLocation
                color={Colors.premium.gray.DEFAULT}
                size={16}
                strokeWidth={2}
              />
              <View className="flex-1">
                <Body className="font-manrope-medium text-[13px] text-premium-gray">
                  {salon.street_address}
                </Body>
                {salon.city && (
                  <Caption className="font-manrope-medium text-[12px] text-premium-gray">
                    {salon.city}
                    {salon.postal_code && `, ${salon.postal_code}`}
                  </Caption>
                )}
              </View>
            </View>
          )}

          {/* Teléfono */}
          {salon.phone && (
            <View className="flex-row items-center gap-2 mb-3">
              <IconPhone
                color={Colors.premium.gray.DEFAULT}
                size={16}
                strokeWidth={2}
              />
              <Body className="font-manrope-medium text-[13px] text-premium-gray">
                {salon.phone}
              </Body>
            </View>
          )}

          {/* Horario */}
          {salon.opening_time && salon.closing_time && (
            <View className="flex-row items-center gap-2 mb-4">
              <IconClock
                color={Colors.premium.gray.DEFAULT}
                size={16}
                strokeWidth={2}
              />
              <Body className="font-manrope-medium text-[13px] text-premium-gray">
                {salon.opening_time} - {salon.closing_time}
              </Body>
            </View>
          )}

          {/* Descripción */}
          {salon.salons?.description && (
            <Body className="font-manrope-medium text-[13px] text-premium-gray leading-[20px]">
              {salon.salons.description}
            </Body>
          )}
        </View>

        {/* ─── Servicios ─── */}
        {services.length > 0 && (
          <View className="px-5 mb-8 border-t border-[#F3F4F6] pt-6">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-4">
              SERVICIOS
            </Caption>
            <View className="gap-3">
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  className="bg-premium-white border border-[#F5F5F5] rounded-lg p-4 active:opacity-70"
                  activeOpacity={0.7}
                  onPress={() =>
                    setExpandedServiceId(
                      expandedServiceId === service.id ? null : service.id
                    )
                  }
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Body className="font-manrope-bold text-[14px] text-premium-black mb-1">
                        {service.name}
                      </Body>
                      {expandedServiceId === service.id && service.description && (
                        <Caption className="font-manrope-medium text-[12px] text-premium-gray mt-2">
                          {service.description}
                        </Caption>
                      )}
                    </View>
                    <Body className="font-manrope-bold text-[14px] text-gold">
                      {service.price ? `${service.price}€` : '-'}
                    </Body>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ─── Equipo de Estilistas ─── */}
        {employees.length > 0 && (
          <View className="px-5 mb-8 border-t border-[#F3F4F6] pt-6">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-4">
              NUESTRO EQUIPO
            </Caption>
            <FlatList
              data={employees}
              renderItem={({ item }) => (
                <View className="mr-4 items-center gap-2 mb-2">
                  <View className="w-[100px] h-[100px] rounded-lg bg-[#F5F5F5] overflow-hidden">
                    <Image
                      source={{
                        uri: item.photo_url || PLACEHOLDER_IMAGE,
                      }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                  <Body className="font-manrope-bold text-[12px] text-premium-black text-center">
                    {item.first_name} {item.last_name}
                  </Body>
                  {item.position && (
                    <Caption className="font-manrope-medium text-[10px] text-premium-gray text-center">
                      {item.position}
                    </Caption>
                  )}
                </View>
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={true}
              contentContainerStyle={{ paddingRight: 20 }}
            />
          </View>
        )}

        {/* ─── Campañas Activas ─── */}
        {campaigns.length > 0 && (
          <View className="px-5 mb-8 border-t border-[#F3F4F6] pt-6">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-4">
              PROMOCIONES ACTIVAS
            </Caption>
            <View className="gap-3">
              {campaigns.slice(0, 3).map((campaign) => (
                <TouchableOpacity
                  key={campaign.id}
                  className="bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)] border border-gold rounded-lg p-4 active:opacity-80"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start gap-2">
                    <IconNorthWest color={Colors.gold.DEFAULT} size={16} />
                    <View className="flex-1">
                      <Body className="font-manrope-bold text-[14px] text-premium-black">
                        {campaign.name}
                      </Body>
                      {campaign.description && (
                        <Caption className="font-manrope-medium text-[12px] text-premium-gray mt-2">
                          {campaign.description}
                        </Caption>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ─── Reseñas ─── */}
        {reviews.length > 0 && (
          <View className="px-5 mb-8 border-t border-[#F3F4F6] pt-6">
            <View className="flex-row items-center justify-between mb-4">
              <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black">
                RESEÑAS ({reviews.length})
              </Caption>
            </View>
            <View className="gap-3">
              {reviews.slice(0, 5).map((review) => (
                <View
                  key={review.id}
                  className="bg-premium-white border border-[#F5F5F5] rounded-lg p-4"
                >
                  {/* Rating */}
                  <View className="flex-row items-center gap-2 mb-2">
                    <View className="flex-row items-center gap-0.5">
                      {[...Array(Math.round(review.rating))].map((_, i) => (
                        <IconStar
                          key={i}
                          color={Colors.gold.DEFAULT}
                          size={14}
                          fill={Colors.gold.DEFAULT}
                        />
                      ))}
                    </View>
                    <Caption className="font-manrope-bold text-[11px] text-premium-black">
                      {review.rating}
                    </Caption>
                  </View>

                  {/* Comentario */}
                  {review.comment && (
                    <Body className="font-manrope-medium text-[12px] text-premium-gray leading-[18px] mb-2">
                      {review.comment}
                    </Body>
                  )}

                  {/* Fecha */}
                  {review.created_at && (
                    <Caption className="font-manrope-medium text-[10px] text-premium-gray">
                      {new Date(review.created_at).toLocaleDateString('es-ES')}
                    </Caption>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── Botón Reservar (Fijo) ─── */}
      <View className="absolute bottom-0 left-0 right-0 bg-premium-white border-t border-[#F3F4F6] px-5 py-4">
        <Button
          variant="primary"
          size="lg"
          onPress={() => router.push(`/booking/${id}`)}
        >
          Reservar ahora
        </Button>
      </View>
    </SafeAreaView>
  )
}