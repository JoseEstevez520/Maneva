import React, { useState } from 'react'
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ImageBackground,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  IconStar,
  IconBack,
  IconAdd,
  IconHeart,
  IconLocation,
  IconPhone,
  IconClock,
} from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { useSalon } from '@/hooks/useSalons'
import { H1, Body, Caption, H2 } from '@/components/ui/Typography'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=600&h=400&fit=crop&q=80'

type SalonTab = 'services' | 'reviews' | 'team' | 'details'

export default function SalonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: salon, loading, error } = useSalon(id || '')
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState<SalonTab>('services')

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
  const reviews = salon.reviews ?? []

  const fromEmployees = employees.map((employee) => employee.photo_url)
  const candidates = [salon.cover_image, ...fromEmployees]
  const validImages = candidates.filter((image): image is string => Boolean(image))
  const galleryImages = validImages.length > 0 ? validImages : [PLACEHOLDER_IMAGE]

  const shortDescription = salon.salons?.description
    ? salon.salons.description.length > 110
      ? `${salon.salons.description.slice(0, 110)}...`
      : salon.salons.description
    : 'Descubre un espacio premium con atención personalizada y servicios de alto nivel.'

  const tabs: { key: SalonTab; label: string }[] = [
    { key: 'services', label: 'SERVICIOS' },
    { key: 'reviews', label: 'RESEÑAS' },
    { key: 'team', label: 'NUESTROS ESTILISTAS' },
    { key: 'details', label: 'DETALLES' },
  ]

  return (
    <SafeAreaView className="flex-1 bg-premium-white" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-32">
        <View className="bg-premium-white overflow-hidden">
          <ImageBackground source={{ uri: galleryImages[0] }} className="h-[236px] w-full" resizeMode="cover">
            <View className="flex-row items-center px-3 pt-3">
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back()
                    return
                  }
                  router.replace('/(tabs)/index')
                }}
                className="w-10 h-10 rounded-full bg-black/25 items-center justify-center"
                activeOpacity={0.85}
              >
                <IconBack size={20} color={Colors.premium.white} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </ImageBackground>

          <View className="px-4 pb-5">
            <View className="-mt-8 w-[68px] h-[68px] rounded-full border-4 border-premium-white overflow-hidden bg-[#F4F4F4]">
              <Image source={{ uri: galleryImages[0] }} className="w-full h-full" resizeMode="cover" />
            </View>

            <View className="mt-2 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <H1 className="font-manrope-bold text-[34px] leading-[42px] pb-[2px] text-premium-black">{salonName}</H1>
                <View className="mt-2 flex-row items-center gap-2">
                  <View className="flex-row items-center gap-1 rounded-full border border-[#E8D49E] bg-[#FAF3DF] px-3 py-1.5">
                    <IconStar size={14} color={Colors.gold.DEFAULT} fill={Colors.gold.DEFAULT} />
                    <Caption className="font-manrope-extrabold text-[13px] text-[#8D6C1A]">{avgRating.toFixed(1)}</Caption>
                  </View>
                  <Caption className="font-manrope-semibold text-[14px] text-[#A7A7A7]">
                    {reviewCount > 0 ? `${reviewCount} opiniones` : 'Sin opiniones todavía'}
                  </Caption>
                </View>
                <Caption className="mt-2 font-manrope-medium text-[14px] leading-[20px] text-[#6B7280]">
                  {shortDescription}
                </Caption>
              </View>

              <View className="items-end">
                <TouchableOpacity
                  className="w-10 h-10 rounded-full border border-[#E6E6E6] bg-premium-white items-center justify-center"
                  activeOpacity={0.85}
                  onPress={() => setIsFavorite((prev) => !prev)}
                >
                  <IconHeart
                    size={19}
                    color={isFavorite ? Colors.gold.DEFAULT : Colors.premium.black}
                    fill={isFavorite ? Colors.gold.DEFAULT : 'transparent'}
                    strokeWidth={2.3}
                  />
                </TouchableOpacity>
                {hasEcoBadge ? (
                  <Caption className="mt-2 font-manrope-bold text-[10px] tracking-[1px] uppercase text-[#8D6C1A]">Eco</Caption>
                ) : null}
              </View>
            </View>

            <View className="mt-6 border-b border-[#EFEFEF]">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 0 }}>
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      activeOpacity={0.85}
                      onPress={() => setActiveTab(tab.key)}
                      className="mr-6 pb-3"
                    >
                      <Caption className={`font-manrope-extrabold text-[12px] tracking-[1.4px] uppercase ${isActive ? 'text-premium-black' : 'text-[#8E8E8E]'}`}>
                        {tab.label}
                      </Caption>
                      <View className={`mt-3 h-[3px] rounded-full ${isActive ? 'bg-gold' : 'bg-transparent'}`} />
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>

            {activeTab === 'services' ? (
              <View className="mt-3">
                <View className="mt-2">
                  {services.map((service) => {
                    const expanded = expandedServiceId === service.id
                    return (
                      <View key={service.id} className="border-b border-[#F0F0F0] py-3">
                        <View className="flex-row items-center justify-between gap-3">
                          <View className="flex-1 pr-2">
                            <H2 className="font-manrope-bold text-[18px] leading-[22px] text-premium-black">{service.name}</H2>
                            <Caption className="mt-1 font-manrope-medium text-[12px] text-[#9AA0A6]" numberOfLines={expanded ? 0 : 1}>
                              {service.description || 'Servicio de alto nivel adaptado a tu estilo.'}
                            </Caption>
                            <Body className="mt-1 font-manrope-bold text-[18px] text-premium-black">
                              {service.price ? `${service.price}€` : '-'}
                            </Body>
                          </View>

                          <TouchableOpacity
                            className="w-9 h-9 rounded-full border border-[#E6E6E6] items-center justify-center"
                            activeOpacity={0.85}
                            onPress={() => setExpandedServiceId(expanded ? null : service.id)}
                          >
                            <IconAdd size={16} color={Colors.premium.black} strokeWidth={2.3} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>
            ) : null}

            {activeTab === 'reviews' ? (
              <View className="mt-3 gap-3">
                {reviews.map((review) => (
                  <View key={review.id} className="border border-[#ECECEC] rounded-[12px] px-3 py-3 bg-premium-white">
                    <View className="flex-row items-center gap-2">
                      <IconStar size={14} color={Colors.gold.DEFAULT} fill={Colors.gold.DEFAULT} />
                      <Caption className="font-manrope-bold text-[13px] text-premium-black">{review.rating.toFixed(1)}</Caption>
                    </View>
                    {review.comment ? (
                      <Caption className="mt-2 font-manrope-medium text-[13px] leading-[19px] text-[#6B7280]">{review.comment}</Caption>
                    ) : null}
                  </View>
                ))}

                {reviews.length === 0 ? (
                  <Caption className="font-manrope-medium text-[13px] text-[#9AA0A6]">Este salón todavía no tiene reseñas.</Caption>
                ) : null}
              </View>
            ) : null}

            {activeTab === 'team' ? (
              <View className="mt-3">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 10, paddingRight: 10 }}>
                  {employees.map((employee) => (
                    <View key={employee.id} className="mr-4 items-center w-[60px]">
                      <View className="w-[52px] h-[52px] rounded-full border border-[#ECECEC] overflow-hidden bg-[#F5F5F5]">
                        <Image source={{ uri: employee.photo_url || PLACEHOLDER_IMAGE }} className="w-full h-full" resizeMode="cover" />
                      </View>
                      <Caption className="mt-1.5 font-manrope-semibold text-[10px] text-[#7A7A7A]" numberOfLines={1}>
                        {employee.first_name}
                      </Caption>
                    </View>
                  ))}
                </ScrollView>
                {employees.length === 0 ? (
                  <Caption className="font-manrope-medium text-[13px] text-[#9AA0A6]">No hay estilistas publicados todavía.</Caption>
                ) : null}
              </View>
            ) : null}

            {activeTab === 'details' ? (
              <View className="mt-3 gap-3">
                <View className="flex-row items-center gap-2">
                  <IconLocation size={14} color={Colors.gold.DEFAULT} />
                  <Caption className="font-manrope-medium text-[13px] text-[#6B7280]">
                    {salon.street_address || 'Dirección no disponible'}{salon.city ? `, ${salon.city}` : ''}{salon.postal_code ? `, ${salon.postal_code}` : ''}
                  </Caption>
                </View>
                <View className="flex-row items-center gap-2">
                  <IconPhone size={14} color={Colors.gold.DEFAULT} />
                  <Caption className="font-manrope-medium text-[13px] text-[#6B7280]">{salon.phone || 'Teléfono no disponible'}</Caption>
                </View>
                <View className="flex-row items-center gap-2">
                  <IconClock size={14} color={Colors.gold.DEFAULT} />
                  <Caption className="font-manrope-medium text-[13px] text-[#6B7280]">
                    {salon.opening_time && salon.closing_time ? `${salon.opening_time} - ${salon.closing_time}` : 'Horario no disponible'}
                  </Caption>
                </View>
                {salon.salons?.description ? (
                  <Caption className="font-manrope-medium text-[13px] leading-[19px] text-[#6B7280]">
                    {salon.salons.description}
                  </Caption>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-premium-white border-t border-[#EFEFEF] px-4 py-4">
        <Button
          variant="primary"
          size="xs"
          onPress={() => router.push(`/booking/${id}`)}
        >
          Pedir cita
        </Button>
      </View>
    </SafeAreaView>
  )
}