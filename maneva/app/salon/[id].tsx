import React from 'react'
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { IconArrowLeft, IconStar, IconPhone, IconLocationOn, IconClock } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { useSalon } from '@/hooks/useSalons'
import { H1, H2, Body, Caption } from '@/components/ui/Typography'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useMediaUrl } from '@/hooks/useMediaUrl'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function SalonDetailScreen() {
  const { id } = useLocalSearchParams() as { id: string }
  const router = useRouter()
  const { data: salon, loading } = useSalon(id)

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-premium-white items-center justify-center">
        <LoadingSpinner />
      </SafeAreaView>
    )
  }

  if (!salon) {
    return (
      <SafeAreaView className="flex-1 bg-premium-white items-center justify-center">
        <Body className="text-premium-gray">Salón no encontrado</Body>
      </SafeAreaView>
    )
  }

  const salonName = salon.salons?.name ?? salon.name ?? 'Salón'
  const headerImageUrl = 'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=500&h=300&fit=crop&q=80'

  return (
    <SafeAreaView className="flex-1 bg-premium-white" edges={['top']}>
      {/* Header con botón de volver */}
      <View className="absolute top-0 left-0 z-10 pt-4 px-5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-premium-white rounded-full items-center justify-center shadow-md"
        >
          <IconArrowLeft size={20} color={Colors.premium.black} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-40">
        {/* Imagen de Portada */}
        <Image
          source={{ uri: headerImageUrl }}
          className="w-full h-56 bg-[#F3F4F6]"
        />

        {/* Info Principal */}
        <View className="px-5 pt-6 pb-6 border-b border-[#F3F4F6]">
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <H1 className="font-manrope-extrabold text-[24px] text-premium-black mb-1">
                {salonName}
              </H1>
              {salon.avgRating !== null && (
                <View className="flex-row items-center gap-2">
                  <IconStar size={14} fill={Colors.gold.DEFAULT} color={Colors.gold.DEFAULT} />
                  <Body className="font-manrope-bold text-[13px] text-premium-black">
                    {salon.avgRating.toFixed(1)} ({salon.reviews?.length ?? 0} reseñas)
                  </Body>
                </View>
              )}
            </View>
          </View>

          {/* Ubicación y Teléfono */}
          <View className="gap-2">
            {salon.address && (
              <View className="flex-row items-center gap-2">
                <IconLocationOn size={16} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
                <Caption className="font-manrope-medium text-[12px] text-premium-gray flex-1">
                  {salon.address}
                </Caption>
              </View>
            )}
            {salon.phone && (
              <View className="flex-row items-center gap-2">
                <IconPhone size={16} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
                <Caption className="font-manrope-medium text-[12px] text-premium-gray">
                  {salon.phone}
                </Caption>
              </View>
            )}
          </View>
        </View>

        {/* Horarios */}
        {salon.open_time && (
          <View className="px-5 py-6 border-b border-[#F3F4F6]">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-3">
              HORARIOS
            </Caption>
            <View className="flex-row items-center gap-2">
              <IconClock size={14} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
              <Body className="font-manrope-medium text-[13px] text-premium-black">
                {salon.open_time} - {salon.close_time ?? '19:00'}
              </Body>
            </View>
          </View>
        )}

        {/* Descripción */}
        {salon.salons?.description && (
          <View className="px-5 py-6 border-b border-[#F3F4F6]">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-3">
              ACERCA DE
            </Caption>
            <Body className="font-manrope-medium text-[13px] text-premium-gray leading-5">
              {salon.salons.description}
            </Body>
          </View>
        )}

        {/* Servicios */}
        {salon.services && salon.services.length > 0 && (
          <View className="px-5 py-6 border-b border-[#F3F4F6]">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-4">
              SERVICIOS
            </Caption>
            {salon.services.map((service: any) => (
              <View key={service.id} className="flex-row items-center justify-between py-3 border-b border-[#F9FAFB] last:border-0">
                <View className="flex-1">
                  <Body className="font-manrope-bold text-[13px] text-premium-black mb-1">
                    {service.name}
                  </Body>
                  {service.description && (
                    <Caption className="font-manrope-medium text-[11px] text-premium-gray">
                      {service.description}
                    </Caption>
                  )}
                </View>
                <Body className="font-manrope-extrabold text-[13px] text-gold ml-4">
                  €{service.price?.toFixed(2) ?? '0.00'}
                </Body>
              </View>
            ))}
          </View>
        )}

        {/* Equipo */}
        {salon.employees && salon.employees.length > 0 && (
          <View className="px-5 py-6 border-b border-[#F3F4F6]">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-4">
              NUESTRO EQUIPO
            </Caption>
            <FlatList
              data={salon.employees}
              keyExtractor={(emp) => emp.id}
              scrollEnabled={false}
              renderItem={({ item: employee }) => (
                <EmployeeCard employee={employee} />
              )}
            />
          </View>
        )}

        {/* Reseñas */}
        {salon.reviews && salon.reviews.length > 0 && (
          <View className="px-5 py-6">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-4">
              RESEÑAS
            </Caption>
            {(salon.reviews as any[]).slice(0, 5).map((review, i) => (
              <View key={i} className="mb-4 p-3 bg-[#F9FAFB] rounded-lg">
                <View className="flex-row items-center gap-1 mb-2">
                  {[...Array(5)].map((_, j) => (
                    <IconStar
                      key={j}
                      size={12}
                      fill={j < (review.rating || 0) ? Colors.gold.DEFAULT : '#D1D5DB'}
                      color={j < (review.rating || 0) ? Colors.gold.DEFAULT : '#D1D5DB'}
                    />
                  ))}
                </View>
                {review.comment && (
                  <Caption className="font-manrope-medium text-[12px] text-premium-gray">
                    {review.comment}
                  </Caption>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botón fijo "Reservar" */}
      <View className="absolute bottom-0 left-0 right-0 bg-premium-white px-5 py-4 border-t border-[#F3F4F6]">
        <TouchableOpacity
          className="w-full bg-gold rounded-full py-4 items-center active:opacity-80"
          onPress={() => {
            // TODO: Navegar a pantalla de reserva
            console.log('Reservar en:', salonName)
          }}
        >
          <Body className="font-manrope-extrabold text-[15px] text-premium-black">
            Reservar ahora
          </Body>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function EmployeeCard({ employee }: { employee: any }) {
  const { url: photoUrl } = useMediaUrl(employee.photo_url, 'employee')

  return (
    <View className="flex-row items-center gap-3 mb-4 p-3 bg-[#F9FAFB] rounded-lg">
      <Image
        source={{ uri: photoUrl }}
        className="w-12 h-12 rounded-full bg-[#E5E7EB]"
      />
      <View className="flex-1">
        <Body className="font-manrope-bold text-[13px] text-premium-black">
          {employee.bio ?? 'Estilista'}
        </Body>
        {employee.position && (
          <Caption className="font-manrope-medium text-[11px] text-premium-gray">
            {employee.position}
          </Caption>
        )}
      </View>
    </View>
  )
}