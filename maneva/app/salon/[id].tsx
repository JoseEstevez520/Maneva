import React, { useState } from 'react'
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ImageBackground,
  Linking,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import {
  IconStar,
  IconBack,
  IconHeart,
  IconLocation,
  IconPhone,
  IconClock,
  IconChevron,
  IconLeaf,
  IconRecycle,
  IconWind,
} from '@/components/ui/icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useSalon, useSalonFavorite } from '@/hooks/useSalons'
import { useFavoriteStylists } from '@/hooks/useFavoriteStylists'
import { H1, Body, Caption } from '@/components/ui/Typography'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=600&h=400&fit=crop&q=80'

type SalonTab = 'services' | 'reviews' | 'team' | 'details'

export default function SalonDetailScreen() {
  const themeColors = useThemeColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: salon, loading, error } = useSalon(id || '')
  const { isFavorite, loading: favoriteLoading, toggle: toggleFavorite } = useSalonFavorite(id || '')
  const { favoriteIds: favStylistIds, toggle: toggleFavStylist } = useFavoriteStylists()
  const [activeTab, setActiveTab] = useState<SalonTab>('services')
  const [hoursExpanded, setHoursExpanded] = useState(false)

  if (loading)
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark items-center justify-center">
        <LoadingSpinner />
      </SafeAreaView>
    )

  if (error || !salon)
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark items-center justify-center">
        <ErrorMessage message={error || 'Salón non atopado'} />
      </SafeAreaView>
    )

  const salonName = salon.salons?.name || 'Salón'
  const avgRating = salon.avgRating ?? 0
  const reviewCount = salon.reviews?.length ?? 0
  const hasEcoBadge = (salon.eco_labels?.length ?? 0) > 0
  const services = salon.services ?? []
  const employees = salon.employees ?? []
  const reviews = salon.reviews ?? []

  const fromEmployees = employees.map((e) => e.photo_url)
  const candidates = [salon.Image, ...fromEmployees]
  const validImages = candidates.filter((img): img is string => Boolean(img))
  const galleryImages = validImages.length > 0 ? validImages : [PLACEHOLDER_IMAGE]
  const logoImage = salon.salons?.logo || galleryImages[0]

  const tabs: { key: SalonTab; label: string }[] = [
    { key: 'services', label: 'SERVIZOS' },
    { key: 'team', label: 'ESTILISTAS' },
    { key: 'reviews', label: 'OPINIÓNS' },
    { key: 'details', label: 'DETALLES' },
  ]

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-32">

        {/* ── Hero ── */}
        <ImageBackground
          source={{ uri: galleryImages[0] }}
          className="h-[200px] w-full"
          resizeMode="cover"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.45)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 }}
          />
          <View className="flex-row items-center px-3 pt-3">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) { router.back(); return }
                router.replace('/(tabs)')
              }}
              className="w-10 h-10 rounded-full bg-black/25 items-center justify-center"
              activeOpacity={0.85}
            >
              <IconBack size={20} color={themeColors.premium.white} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* ── Info ── */}
        <View className="px-5">

          {/* Avatar superpuesto */}
          <View className="-mt-9 mb-4">
            <View className="w-[76px] h-[76px] rounded-full border-4 border-surface dark:border-surface-dark overflow-hidden bg-surface-overlay dark:bg-surface-overlay-dark">
              <Image source={{ uri: logoImage }} className="w-full h-full" resizeMode="cover" />
            </View>
          </View>

          <Animated.View entering={FadeInDown.delay(50).duration(400).springify()} className="gap-4">

            {/* Nombre + corazón */}
            <View className="flex-row items-center justify-between gap-3">
              <H1 className="flex-1 font-manrope-extrabold text-[26px] leading-[32px] text-foreground dark:text-foreground-dark">
                {salonName}
              </H1>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={favoriteLoading}
                onPress={() => { void toggleFavorite() }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconHeart
                  size={22}
                  color={isFavorite ? themeColors.gold.DEFAULT : themeColors.premium.gray.DEFAULT}
                  fill={isFavorite ? themeColors.gold.DEFAULT : 'transparent'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>

            {/* Descripción — 2 líneas máx */}
            {salon.salons?.description ? (
              <Caption
                numberOfLines={2}
                className="font-manrope-medium text-[13px] leading-[20px] text-foreground-muted dark:text-foreground-muted-dark"
              >
                {salon.salons.description}
              </Caption>
            ) : null}

            {/* Stats */}
            <View className="flex-row items-center py-4 border-b border-border dark:border-border-dark">
              <View className="flex-1 items-center gap-1">
                <Caption className="font-manrope-extrabold text-[17px] text-foreground dark:text-foreground-dark">
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                </Caption>
                <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
                  Valoración
                </Caption>
              </View>
              <View className="w-px h-8 bg-border dark:bg-border-dark" />
              <View className="flex-1 items-center gap-1">
                <Caption className="font-manrope-extrabold text-[17px] text-foreground dark:text-foreground-dark">
                  {reviewCount > 0 ? String(reviewCount) : '—'}
                </Caption>
                <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
                  Opinións
                </Caption>
              </View>
              {salon.city && (
                <>
                  <View className="w-px h-8 bg-border dark:bg-border-dark" />
                  <View className="flex-1 items-center gap-1">
                    <Caption numberOfLines={1} className="font-manrope-extrabold text-[17px] text-foreground dark:text-foreground-dark">
                      {salon.city}
                    </Caption>
                    <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
                      Cidade
                    </Caption>
                  </View>
                </>
              )}
            </View>

          </Animated.View>

          {/* ── Tabs ── */}
          <Animated.View
            entering={FadeInDown.delay(120).duration(400).springify()}
            className="mt-6 border-b border-border dark:border-border-dark"
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key
                return (
                  <TouchableOpacity
                    key={tab.key}
                    activeOpacity={0.85}
                    onPress={() => setActiveTab(tab.key)}
                    className="mr-6 pb-3"
                  >
                    <Caption
                      className={`font-manrope-extrabold text-[11px] tracking-[1.4px] uppercase ${
                        isActive
                          ? 'text-foreground dark:text-foreground-dark'
                          : 'text-foreground-muted dark:text-foreground-muted-dark'
                      }`}
                    >
                      {tab.label}
                    </Caption>
                    <View
                      className={`mt-3 h-[2.5px] rounded-full ${
                        isActive ? 'bg-gold' : 'bg-transparent'
                      }`}
                    />
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </Animated.View>

          {/* ── Contenido de tabs ── */}
          <Animated.View
            entering={FadeInDown.delay(180).duration(400).springify()}
            className="mt-4"
          >

            {/* SERVIZOS */}
            {activeTab === 'services' && (
              <View>
                {services.length === 0 ? (
                  <EmptyState text="Non hai servizos publicados aínda." />
                ) : (
                  services.map((service, index) => (
                    <View
                      key={service.id}
                      className={`py-4 flex-row items-start gap-3 ${
                        index < services.length - 1
                          ? 'border-b border-border dark:border-border-dark'
                          : ''
                      }`}
                    >
                      <View className="flex-1 pr-2">
                        <Body className="font-manrope-bold text-[15px] text-foreground dark:text-foreground-dark">
                          {service.name}
                        </Body>
                        {service.description ? (
                          <Caption className="mt-1 font-manrope-medium text-[12px] leading-[17px] text-foreground-muted dark:text-foreground-muted-dark">
                            {service.description}
                          </Caption>
                        ) : null}
                        <View className="mt-1.5 flex-row items-center gap-1">
                          <IconClock size={11} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
                          <Caption className="font-manrope-medium text-[11px] text-foreground-subtle dark:text-foreground-subtle-dark">
                            {service.duration_minutes} min
                          </Caption>
                        </View>
                      </View>
                      <Caption className="font-manrope-bold text-[15px] text-foreground dark:text-foreground-dark mt-0.5">
                        {service.price}€
                      </Caption>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ESTILISTAS */}
            {activeTab === 'team' && (
              <View className="gap-0">
                {employees.length === 0 ? (
                  <EmptyState text="Aínda non hai estilistas publicados." />
                ) : (
                  employees.map((employee, index) => {
                    const name = [employee.users?.first_name, employee.users?.last_name]
                      .filter(Boolean).join(' ') || 'Estilista'
                    const isFavStylist = favStylistIds.includes(employee.id)
                    return (
                      <View
                        key={employee.id}
                        className={`flex-row items-center gap-3 py-4 ${
                          index < employees.length - 1
                            ? 'border-b border-border dark:border-border-dark'
                            : ''
                        }`}
                      >
                        <View className="w-11 h-11 rounded-full overflow-hidden bg-surface-raised dark:bg-surface-raised-dark">
                          <Image
                            source={{ uri: employee.photo_url || PLACEHOLDER_IMAGE }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        </View>
                        <View className="flex-1">
                          <Body className="font-manrope-bold text-[15px] text-foreground dark:text-foreground-dark">
                            {name}
                          </Body>
                          {employee.position ? (
                            <Caption className="mt-0.5 font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark">
                              {employee.position}
                            </Caption>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          onPress={() => { void toggleFavStylist(employee.id) }}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <IconStar
                            size={20}
                            color={themeColors.gold.DEFAULT}
                            fill={isFavStylist ? themeColors.gold.DEFAULT : 'transparent'}
                            strokeWidth={1.8}
                          />
                        </TouchableOpacity>
                      </View>
                    )
                  })
                )}
              </View>
            )}

            {/* OPINIÓNS */}
            {activeTab === 'reviews' && (
              <View>
                {reviews.length === 0 ? (
                  <EmptyState text="Este salón aínda non ten opinións." />
                ) : (
                  reviews.map((review, index) => {
                    const reviewerName = [review.users?.first_name, review.users?.last_name]
                      .filter(Boolean).join(' ') || 'Anónimo'
                    const initials = reviewerName
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()

                    return (
                      <View
                        key={review.id}
                        className={`py-4 ${
                          index < reviews.length - 1
                            ? 'border-b border-border dark:border-border-dark'
                            : ''
                        }`}
                      >
                        {/* Cabecera: avatar inicial + nombre + estrellas */}
                        <View className="flex-row items-center gap-3 mb-2">
                          <View className="w-8 h-8 rounded-full bg-surface-raised dark:bg-surface-raised-dark items-center justify-center">
                            <Caption className="font-manrope-bold text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
                              {initials}
                            </Caption>
                          </View>
                          <View className="flex-1">
                            <Caption className="font-manrope-bold text-[13px] text-foreground dark:text-foreground-dark">
                              {reviewerName}
                            </Caption>
                            <View className="flex-row items-center gap-0.5 mt-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <IconStar
                                  key={star}
                                  size={11}
                                  color={themeColors.gold.DEFAULT}
                                  fill={
                                    star <= Math.round(review.rating)
                                      ? themeColors.gold.DEFAULT
                                      : 'transparent'
                                  }
                                  strokeWidth={1.5}
                                />
                              ))}
                            </View>
                          </View>
                        </View>
                        {review.comment ? (
                          <Caption className="font-manrope-medium text-[13px] leading-[19px] text-foreground-muted dark:text-foreground-muted-dark">
                            {review.comment}
                          </Caption>
                        ) : null}
                      </View>
                    )
                  })
                )}
              </View>
            )}

            {/* DETALLES */}
            {activeTab === 'details' && (() => {
              const hours = [...(salon.location_hours ?? [])].sort((a, b) => a.day_of_week - b.day_of_week)
              const dayNames = ['', 'Luns', 'Martes', 'Mércores', 'Xoves', 'Venres', 'Sábado', 'Domingo']
              const jsDay = new Date().getDay()
              const todayDow = jsDay === 0 ? 7 : jsDay
              const todayHours = hours.find((h) => h.day_of_week === todayDow)
              const ecoLabels = salon.eco_labels ?? []
              const ecoIcons = [IconLeaf, IconRecycle, IconWind]

              const rows: React.ReactNode[] = []

              if (salon.address) {
                rows.push(
                  <TouchableOpacity
                    key="address"
                    activeOpacity={0.7}
                    onPress={() => {
                      const query = encodeURIComponent(
                        [salon.address, salon.city, salon.postal_code].filter(Boolean).join(', ')
                      )
                      void Linking.openURL(`https://maps.apple.com/?q=${query}`)
                    }}
                    className="flex-row items-start gap-4 py-4"
                  >
                    <IconLocation size={15} color={themeColors.gold.DEFAULT} strokeWidth={2} />
                    <Caption className="flex-1 font-manrope-medium text-[13px] leading-[19px] text-foreground dark:text-foreground-dark">
                      {[salon.address, salon.city, salon.postal_code].filter(Boolean).join(', ')}
                    </Caption>
                  </TouchableOpacity>
                )
              }

              if (salon.phone) {
                rows.push(
                  <TouchableOpacity
                    key="phone"
                    activeOpacity={0.7}
                    onPress={() => void Linking.openURL(`tel:${salon.phone}`)}
                    className="flex-row items-center gap-4 py-4"
                  >
                    <IconPhone size={15} color={themeColors.gold.DEFAULT} strokeWidth={2} />
                    <Caption className="font-manrope-medium text-[13px] text-foreground dark:text-foreground-dark">
                      {salon.phone}
                    </Caption>
                  </TouchableOpacity>
                )
              }

              if (hours.length > 0) {
                rows.push(
                  <View key="hours">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setHoursExpanded((v) => !v)}
                      className="flex-row items-center gap-4 py-4"
                    >
                      <IconClock size={15} color={themeColors.gold.DEFAULT} strokeWidth={2} />
                      <Caption className="flex-1 font-manrope-medium text-[13px] text-foreground dark:text-foreground-dark">
                        {todayHours
                          ? `Hoxe: ${todayHours.open_time?.slice(0, 5)} – ${todayHours.close_time?.slice(0, 5)}`
                          : 'Pechado hoxe'}
                      </Caption>
                      <IconChevron
                        size={14}
                        color={themeColors.premium.gray.DEFAULT}
                        strokeWidth={2}
                        style={{ transform: [{ rotate: hoursExpanded ? '90deg' : '0deg' }] }}
                      />
                    </TouchableOpacity>
                    {hoursExpanded && (
                      <View className="ml-[31px] mb-2 gap-0">
                        {hours.map((h, i, arr) => (
                          <View
                            key={h.id}
                            className={`flex-row justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-border dark:border-border-dark' : ''}`}
                          >
                            <Caption className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark">
                              {dayNames[h.day_of_week] ?? `Día ${h.day_of_week}`}
                            </Caption>
                            <Caption className={`font-manrope-bold text-[12px] ${h.day_of_week === todayDow ? 'text-foreground dark:text-foreground-dark' : 'text-foreground-muted dark:text-foreground-muted-dark'}`}>
                              {h.open_time?.slice(0, 5)} – {h.close_time?.slice(0, 5)}
                            </Caption>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )
              }

              ecoLabels.forEach((label, i) => {
                const EcoIcon = ecoIcons[i % ecoIcons.length]
                rows.push(
                  <View key={label.id} className="flex-row items-center gap-4 py-4">
                    <EcoIcon size={15} color="#16A34A" strokeWidth={2} />
                    <Caption className="flex-1 font-manrope-medium text-[13px] text-foreground dark:text-foreground-dark">
                      {label.label_type}
                    </Caption>
                  </View>
                )
              })

              return (
                <View className="py-1">
                  {rows.map((row, i) => (
                    <View key={i} className={i < rows.length - 1 ? 'border-b border-border dark:border-border-dark' : ''}>
                      {row}
                    </View>
                  ))}
                </View>
              )
            })()}

          </Animated.View>
        </View>
      </ScrollView>

      {/* ── CTA ── */}
      <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark px-5 py-4">
        <TouchableOpacity
          onPress={() => router.push(`/booking/${id}`)}
          activeOpacity={0.88}
          className="bg-foreground dark:bg-foreground-dark rounded-2xl py-4 items-center"
        >
          <Caption className="font-manrope-extrabold text-[12px] tracking-[2.5px] uppercase text-premium-white dark:text-surface-dark">
            Reservar cita
          </Caption>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <View className="py-6 items-center">
      <Caption className="font-manrope-medium text-[13px] text-foreground-subtle dark:text-foreground-subtle-dark text-center">
        {text}
      </Caption>
    </View>
  )
}

function DetailRow({ icon, children }: { icon: React.ReactNode; children: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="mt-0.5">{icon}</View>
      <Caption className="flex-1 font-manrope-medium text-[13px] leading-[19px] text-foreground-muted dark:text-foreground-muted-dark">
        {children}
      </Caption>
    </View>
  )
}
