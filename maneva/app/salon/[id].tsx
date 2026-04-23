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
  IconHeart,
  IconLocation,
  IconPhone,
  IconClock,
} from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { useSalon, useSalonFavorite } from '@/hooks/useSalons'
import { useFavoriteStylists } from '@/hooks/useFavoriteStylists'
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
  const { isFavorite, loading: favoriteLoading, toggle: toggleFavorite } = useSalonFavorite(id || '')
  const { favoriteIds: favStylistIds, toggle: toggleFavStylist } = useFavoriteStylists()
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
    { key: 'team', label: 'NUESTROS ESTILISTAS' },
    { key: 'reviews', label: 'RESEÑAS' },
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
            <View className="-mt-8 w-[68px] h-[68px] rounded-full border-4 border-premium-white overflow-hidden bg-premium-surface-alt">
              <Image source={{ uri: galleryImages[0] }} className="w-full h-full" resizeMode="cover" />
            </View>

            <View className="mt-2 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <H1 className="font-manrope-bold text-[34px] leading-[42px] pb-[2px] text-premium-black">{salonName}</H1>
                <View className="mt-2 flex-row items-center gap-2">
                  <View className="flex-row items-center gap-1 rounded-full border border-gold-border-alt bg-gold-bg px-3 py-1.5">
                    <IconStar size={14} color={Colors.gold.DEFAULT} fill={Colors.gold.DEFAULT} />
                    <Caption className="font-manrope-extrabold text-[13px] text-gold-text">{avgRating.toFixed(1)}</Caption>
                  </View>
                  <Caption className="font-manrope-semibold text-[14px] text-premium-gray-soft">
                    {reviewCount > 0 ? `${reviewCount} opiniones` : 'Sin opiniones todavía'}
                  </Caption>
                </View>
                <Caption className="mt-2 font-manrope-medium text-[14px] leading-[20px] text-premium-gray">
                  {shortDescription}
                </Caption>
              </View>

              <View className="items-end">
                <TouchableOpacity
                  className="w-10 h-10 rounded-full border border-premium-divider-fav-btn bg-premium-white items-center justify-center"
                  activeOpacity={0.85}
                  disabled={favoriteLoading}
                  onPress={() => {
                    void toggleFavorite()
                  }}
                >
                  <IconHeart
                    size={19}
                    color={isFavorite ? Colors.gold.DEFAULT : Colors.premium.black}
                    fill={isFavorite ? Colors.gold.DEFAULT : 'transparent'}
                    strokeWidth={2.3}
                  />
                </TouchableOpacity>
                {hasEcoBadge ? (
                  <Caption className="mt-2 font-manrope-bold text-[10px] tracking-[1px] uppercase text-gold-text">Eco</Caption>
                ) : null}
              </View>
            </View>

            <View className="mt-6 border-b border-premium-divider-lighter">
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
                      <Caption className={`font-manrope-extrabold text-[12px] tracking-[1.4px] uppercase ${isActive ? 'text-premium-black' : 'text-premium-gray-medium'}`}>
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
                  {services.map((service) => (
                    <View key={service.id} className="border-b border-premium-divider-subtle py-3">
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1 pr-2">
                          <H2 className="font-manrope-bold text-[18px] leading-[22px] text-premium-black">{service.name}</H2>
                          {service.description ? (
                            <Caption className="mt-1 font-manrope-medium text-[12px] text-premium-gray-secondary">
                              {service.description}
                            </Caption>
                          ) : null}
                        </View>
                        <Caption className="font-manrope-bold text-[15px] text-gold">
                          {service.price ? `${service.price}€` : '—'}
                        </Caption>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {activeTab === 'reviews' ? (
              <View className="mt-3 gap-3">
                {reviews.map((review) => (
                  <View key={review.id} className="border border-premium-divider rounded-[12px] px-3 py-3 bg-premium-white">
                    <View className="flex-row items-center gap-2">
                      <IconStar size={14} color={Colors.gold.DEFAULT} fill={Colors.gold.DEFAULT} />
                      <Caption className="font-manrope-bold text-[13px] text-premium-black">{review.rating.toFixed(1)}</Caption>
                    </View>
                    {review.comment ? (
                      <Caption className="mt-2 font-manrope-medium text-[13px] leading-[19px] text-premium-gray">{review.comment}</Caption>
                    ) : null}
                  </View>
                ))}

                {reviews.length === 0 ? (
                  <View className="bg-premium-white rounded-[20px] border border-premium-divider-subtle p-5 items-center">
                    <Caption className="font-manrope-medium text-[13px] text-premium-gray-secondary text-center">
                      Este salón todavía no tiene reseñas.
                    </Caption>
                  </View>
                ) : null}
              </View>
            ) : null}

            {activeTab === 'team' ? (
              <View className="mt-3 gap-2">
                {employees.map((employee) => {
                  const name = [employee.users?.first_name, employee.users?.last_name]
                    .filter(Boolean).join(' ') || 'Estilista'
                  const isFavStylist = favStylistIds.includes(employee.id)
                  return (
                    <View key={employee.id} className="flex-row items-center bg-premium-white rounded-[18px] border border-premium-divider-subtle px-4 py-3 gap-3">
                      <View className="w-11 h-11 rounded-full overflow-hidden bg-premium-surface">
                        <Image source={{ uri: employee.photo_url || PLACEHOLDER_IMAGE }} className="w-full h-full" resizeMode="cover" />
                      </View>
                      <View className="flex-1">
                        <Body className="font-manrope-medium text-[15px] text-premium-black">{name}</Body>
                        {employee.position ? (
                          <Caption className="mt-0.5 text-[12px] text-premium-gray-secondary">{employee.position}</Caption>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => { void toggleFavStylist(employee.id) }}
                        activeOpacity={0.7}
                        className="p-1"
                      >
                        <IconStar
                          size={20}
                          color={Colors.gold.DEFAULT}
                          fill={isFavStylist ? Colors.gold.DEFAULT : 'transparent'}
                          strokeWidth={1.8}
                        />
                      </TouchableOpacity>
                    </View>
                  )
                })}
                {employees.length === 0 ? (
                  <View className="bg-premium-white rounded-[20px] border border-premium-divider-subtle p-5 items-center">
                    <Caption className="font-manrope-medium text-[13px] text-premium-gray-secondary text-center">
                      No hay estilistas publicados todavía.
                    </Caption>
                  </View>
                ) : null}
              </View>
            ) : null}

            {activeTab === 'details' ? (
              <View className="mt-3 gap-3">
                <View className="flex-row items-start gap-2">
                  <IconLocation size={14} color={Colors.gold.DEFAULT} />
                  <Caption className="font-manrope-medium text-[13px] text-premium-gray flex-1">
                    {salon.street_address || 'Dirección no disponible'}{salon.city ? `, ${salon.city}` : ''}{salon.postal_code ? `, ${salon.postal_code}` : ''}
                  </Caption>
                </View>
                <View className="flex-row items-center gap-2">
                  <IconPhone size={14} color={Colors.gold.DEFAULT} />
                  <Caption className="font-manrope-medium text-[13px] text-premium-gray">{salon.phone || 'Teléfono no disponible'}</Caption>
                </View>
                <View className="flex-row items-center gap-2">
                  <IconClock size={14} color={Colors.gold.DEFAULT} />
                  <Caption className="font-manrope-medium text-[13px] text-premium-gray">
                    {salon.opening_time && salon.closing_time ? `${salon.opening_time} - ${salon.closing_time}` : 'Horario no disponible'}
                  </Caption>
                </View>
                {salon.salons?.description ? (
                  <Caption className="font-manrope-medium text-[13px] leading-[19px] text-premium-gray">
                    {salon.salons.description}
                  </Caption>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-premium-white border-t border-premium-divider-lighter px-4 py-4">
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