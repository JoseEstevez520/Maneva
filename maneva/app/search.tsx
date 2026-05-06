import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Circle, Marker } from 'react-native-maps'
import {
  IconSearch,
  IconClose,
  IconExpandMore,
  IconArrowUpRight,
  IconStar,
  IconNearMe,
} from '@/components/ui/icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useSalonsWithRating } from '@/hooks/useSalons'
import { useLocation } from '@/hooks/useLocation'
import { H2, Body, Caption } from '@/components/ui/Typography'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { UnifiedSalon } from '@/services/salons.service'
import { getSalonIdsAvailableToday } from '@/services/salons.service'

type SearchSalon = UnifiedSalon & { avgRating: number | null; avgPrice: number | null; distance: number }

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=400&h=300&fit=crop&q=80'

const SERVICES = [
  { id: 'corte', name: 'Corte de cabelo' },
  { id: 'barba', name: 'Barba' },
  { id: 'manicura', name: 'Manicura' },
  { id: 'peinado', name: 'Peiteado' },
  { id: 'tinte', name: 'Tinte' },
  { id: 'tratamiento', name: 'Tratamento' },
]

const PRICE_MIN = 0
const PRICE_MAX = 150
const DISTANCE_MAX = 50

interface Filters {
  minRating: number
  selectedServices: string[]
  priceMin: number
  priceMax: number
  maxDistance: number
  availableToday: boolean
  distanceCenter: { latitude: number; longitude: number } | null
}

export default function SearchScreen() {
  const themeColors = useThemeColors()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const { coords } = useLocation()
  const [filters, setFilters] = useState<Filters>({
    minRating: 0,
    selectedServices: [],
    priceMin: PRICE_MIN,
    priceMax: PRICE_MAX,
    maxDistance: DISTANCE_MAX,
    availableToday: false,
    distanceCenter: null,
  })
  const [visibleModal, setVisibleModal] = useState<'service' | 'rating' | 'price' | 'distance' | null>(null)
  const [availableTodayIds, setAvailableTodayIds] = useState<string[] | null>(null)

  const { data: salons, loading } = useSalonsWithRating()

  useEffect(() => {
    if (!filters.availableToday) return
    getSalonIdsAvailableToday()
      .then(setAvailableTodayIds)
      .catch(() => setAvailableTodayIds([]))
  }, [filters.availableToday])

  const hasPriceFilter = filters.priceMin > PRICE_MIN || filters.priceMax < PRICE_MAX
  const hasDistanceFilter = filters.maxDistance < DISTANCE_MAX || filters.distanceCenter !== null

  const hasActiveFilters =
    filters.minRating > 0 ||
    hasPriceFilter ||
    hasDistanceFilter ||
    filters.availableToday ||
    filters.selectedServices.length > 0 ||
    query.length > 0

  // Calcular distancia en km desde un punto de referencia
  const calculateDistance = (
    lat: number | null,
    lon: number | null,
    ref: { latitude: number; longitude: number } | null
  ) => {
    if (!ref || !lat || !lon) return 0
    const R = 6371
    const dLat = ((lat - ref.latitude) * Math.PI) / 180
    const dLon = ((lon - ref.longitude) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((ref.latitude * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c * 10) / 10
  }

  // Búsqueda y filtrado de salones
  const filteredSalons = useMemo(() => {
    const refCoords = filters.distanceCenter ?? coords
    let result = salons.map((salon) => ({
      ...salon,
      distance: calculateDistance(salon.latitude ?? null, salon.longitude ?? null, refCoords),
    }))

    // Si no hay filtros, mostrar todos los salones ordenados por rating
    if (!hasActiveFilters) {
      return result.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    }

    // Filtro de búsqueda por nombre
    if (query.length > 0) {
      const term = query.toLowerCase()
      result = result.filter((salon) => {
        const salonName = (salon.salons?.name ?? salon.name ?? '').toLowerCase()
        return salonName.includes(term)
      })
    }

    // Filtro de rating mínimo
    if (filters.minRating > 0) {
      result = result.filter((salon) => (salon.avgRating ?? 0) >= filters.minRating)
    }

    if (hasPriceFilter) {
      result = result.filter((salon) => {
        if (salon.avgPrice === null) return false
        return salon.avgPrice >= filters.priceMin && salon.avgPrice <= filters.priceMax
      })
    }

    if (hasDistanceFilter && refCoords) {
      result = result.filter((salon) => salon.distance <= filters.maxDistance)
    }

    if (filters.availableToday && availableTodayIds !== null) {
      result = result.filter((salon) => availableTodayIds.includes(salon.id))
    }

    return result.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
  }, [salons, query, filters, hasActiveFilters, hasDistanceFilter, hasPriceFilter, coords, availableTodayIds])

  const clearAllFilters = () => {
    setQuery('')
    setAvailableTodayIds(null)
    setFilters({
      minRating: 0,
      selectedServices: [],
      priceMin: PRICE_MIN,
      priceMax: PRICE_MAX,
      maxDistance: DISTANCE_MAX,
      availableToday: false,
      distanceCenter: null,
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      {/* ── Header ── */}
      <View className="bg-surface dark:bg-surface-dark pt-2.5">
        <View className="flex-row items-center px-5 mb-4 gap-4">
          <View className="flex-1 flex-row items-center bg-surface-raised dark:bg-surface-raised-dark rounded-full px-3 h-12">
            <IconSearch color={themeColors.premium.black} size={20} strokeWidth={2} style={{ marginRight: 8 }} />
            <TextInput
              className="flex-1 font-manrope-medium text-[14px] text-foreground dark:text-foreground-dark py-0 h-full"
              value={query}
              onChangeText={setQuery}
              autoFocus
              placeholder="Busca unha perruquería"
              placeholderTextColor={themeColors.premium.gray.DEFAULT}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} className="p-1">
                <IconClose color={themeColors.premium.gray.DEFAULT} size={18} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Body className="font-manrope-bold text-[14px] text-foreground dark:text-foreground-dark">Cancelar</Body>
          </TouchableOpacity>
        </View>

        {/* ── Filtros Rápidos ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-5 gap-2.5 pb-4"
        >
          <FilterChip
            label="Hoxe"
            active={filters.availableToday}
            onPress={() => setFilters((prev) => ({
              ...prev,
              availableToday: !prev.availableToday,
            }))}
          />
          <FilterChip
            label={hasDistanceFilter ? `< ${filters.maxDistance} km` : 'Distancia'}
            iconTail="expand_more"
            active={hasDistanceFilter}
            onPress={() => setVisibleModal('distance')}
          />
          <FilterChip
            label={filters.selectedServices.length > 1 ? `Servizo (${filters.selectedServices.length})` : 'Servizo'}
            iconTail="expand_more"
            active={filters.selectedServices.length > 0}
            onPress={() => setVisibleModal('service')}
          />
          <FilterChip
            label="Valoración"
            iconTail="expand_more"
            active={filters.minRating > 0}
            onPress={() => setVisibleModal('rating')}
          />
          <FilterChip
            label={hasPriceFilter ? `${filters.priceMin}€ – ${filters.priceMax}€` : 'Prezo'}
            iconTail="expand_more"
            active={hasPriceFilter}
            onPress={() => setVisibleModal('price')}
          />
          {hasActiveFilters && (
            <FilterChip
              label="Limpar"
              variant="clear"
              onPress={clearAllFilters}
            />
          )}
        </ScrollView>
        <View className="h-[1px] bg-surface-overlay dark:bg-surface-overlay-dark w-full" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
        {/* ── Salones ── */}
        <View className="mt-4">
          <View className="px-5 flex-row items-center justify-between mb-3">
            <Caption className="font-manrope-semibold text-[12px] text-foreground-muted dark:text-foreground-muted-dark">
              {filteredSalons.length === 0
                ? 'Sen resultados'
                : `${filteredSalons.length} ${filteredSalons.length === 1 ? 'salón' : 'salóns'}`}
            </Caption>
            {hasActiveFilters && (
              <Caption className="font-manrope-semibold text-[12px] text-foreground-muted dark:text-foreground-muted-dark">
                Filtros activos
              </Caption>
            )}
          </View>

          {loading ? (
            <LoadingSpinner className="pt-10 items-center" />
          ) : filteredSalons.length === 0 ? (
            <View className="items-center px-8 pt-16 pb-10">
              <View className="w-16 h-16 rounded-full bg-surface-raised dark:bg-surface-raised-dark items-center justify-center mb-5">
                <IconSearch size={28} color={themeColors.premium.gray.pale} strokeWidth={1.8} />
              </View>
              <Body className="font-manrope-bold text-[15px] text-foreground dark:text-foreground-dark mb-2 text-center">
                Non se atoparon salóns
              </Body>
              <Caption className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark text-center leading-5">
                {filters.selectedServices.length > 0
                  ? 'Proba con outros servizos ou amplía os filtros'
                  : query.length > 0
                  ? 'Proba con outro nome ou amplía a busca'
                  : 'Proba a axustar os filtros activos'}
              </Caption>
            </View>
          ) : (
            <View className="border-t border-premium-white-pale">
              {filteredSalons.map((salon) => (
                <SalonResultRow key={salon.id} salon={salon} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Modal de Servizo ── */}
      <ServiceFilterModal
        visible={visibleModal === 'service'}
        selectedServices={filters.selectedServices}
        onClose={() => setVisibleModal(null)}
        onApply={(selectedServices) => {
          setFilters((prev) => ({ ...prev, selectedServices }))
          setVisibleModal(null)
        }}
      />

      {/* ── Modal de Valoración ── */}
      <RatingFilterModal
        visible={visibleModal === 'rating'}
        minRating={filters.minRating}
        onClose={() => setVisibleModal(null)}
        onApply={(rating) => {
          setFilters((prev) => ({ ...prev, minRating: rating }))
          setVisibleModal(null)
        }}
      />

      {/* ── Modal de Precio ── */}
      <PriceFilterModal
        visible={visibleModal === 'price'}
        priceMin={filters.priceMin}
        priceMax={filters.priceMax}
        onClose={() => setVisibleModal(null)}
        onApply={(min, max) => {
          setFilters((prev) => ({ ...prev, priceMin: min, priceMax: max }))
          setVisibleModal(null)
        }}
      />

      {/* ── Modal de Distancia ── */}
      <DistanceFilterModal
        visible={visibleModal === 'distance'}
        maxDistance={filters.maxDistance}
        center={filters.distanceCenter}
        userCoords={coords}
        onClose={() => setVisibleModal(null)}
        onApply={(max, center) => {
          setFilters((prev) => ({ ...prev, maxDistance: max, distanceCenter: center }))
          setVisibleModal(null)
        }}
      />
    </SafeAreaView>
  )
}

// ─── FilterChip ─────────────────────────────────────────────────────

function FilterChip({
  label,
  iconTail,
  active,
  variant = 'default',
  onPress,
}: {
  label: string
  iconTail?: 'expand_more'
  active?: boolean
  variant?: 'default' | 'clear'
  onPress?: () => void
}) {
  const themeColors = useThemeColors()

  const containerStyle =
    variant === 'clear'
      ? 'bg-foreground dark:bg-foreground-dark border-foreground dark:border-foreground-dark'
      : active
        ? 'bg-gold border-gold'
        : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'

  const textColor =
    variant === 'clear' || active ? 'text-premium-white' : 'text-foreground dark:text-foreground-dark'

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`flex-row items-center px-4 py-2 rounded-full border gap-1.5 ${containerStyle}`}
    >
      {variant === 'clear' && (
        <IconClose size={12} color={themeColors.premium.white} strokeWidth={2.5} />
      )}
      <Caption className={`font-manrope-bold text-[12px] ${textColor}`}>
        {label}
      </Caption>
      {iconTail === 'expand_more' && (
        <IconExpandMore
          size={16}
          color={active || variant === 'clear' ? themeColors.premium.white : themeColors.premium.black}
          strokeWidth={2}
        />
      )}
    </TouchableOpacity>
  )
}

// ─── SalonResultRow ─────────────────────────────────────────────────

function SalonResultRow({ salon }: { salon: SearchSalon }) {
  const themeColors = useThemeColors()
  const router = useRouter()

  return (
    <TouchableOpacity
      onPress={() => router.push(`/salon/${salon.id}`)}
      activeOpacity={0.85}
      className="flex-row items-center py-4 px-5 border-b border-border/40 dark:border-border-dark/40 gap-4"
    >
      <Image
        source={{ uri: salon.salons?.logo ?? PLACEHOLDER_IMAGE }}
        className="w-16 h-16 rounded-2xl"
      />
      <View className="flex-1">
        <View className="flex-row justify-between items-start mb-1">
          <H2 className="font-manrope-bold text-[15px] text-foreground dark:text-foreground-dark flex-1 pr-2" numberOfLines={1}>
            {salon.salons?.name ?? salon.name}
          </H2>
          {salon.distance > 0 && (
            <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
              {salon.distance} km
            </Caption>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          {salon.avgRating !== null && (
            <View className="flex-row items-center gap-1">
              <IconStar size={11} fill={themeColors.gold.DEFAULT} color={themeColors.gold.DEFAULT} />
              <Caption className="font-manrope-bold text-[12px] text-foreground dark:text-foreground-dark">
                {salon.avgRating.toFixed(1)}
              </Caption>
            </View>
          )}
          {salon.avgRating !== null && (salon.address ?? salon.city) && (
            <View className="w-[3px] h-[3px] rounded-full bg-foreground-muted dark:bg-foreground-muted-dark" />
          )}
          <Caption className="flex-1 font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark" numberOfLines={1}>
            {salon.address ?? salon.city ?? ''}
          </Caption>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── RatingFilterModal ──────────────────────────────────────────────

function RatingFilterModal({
  visible,
  minRating,
  onClose,
  onApply,
}: {
  visible: boolean
  minRating: number
  onClose: () => void
  onApply: (rating: number) => void
}) {
  const themeColors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [tempRating, setTempRating] = React.useState(minRating)

  // Sincronizar el estado temporal con el valor confirmado cada vez que el modal se abre
  React.useEffect(() => { if (visible) setTempRating(minRating) }, [visible, minRating])

  const RATING_OPTIONS = [
    { value: 0, label: 'Todas as valoracións', stars: 0 },
    { value: 3, label: '3 estrelas en adiante', stars: 3 },
    { value: 4, label: '4 estrelas en adiante', stars: 4 },
    { value: 4.5, label: '4,5 estrelas en adiante', stars: 4.5 },
  ]

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-[rgba(0,0,0,0.5)]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-surface dark:bg-surface-dark rounded-t-3xl pt-6 px-5" style={{ paddingBottom: insets.bottom + 24 }}>
          <View className="flex-row justify-between items-center mb-6">
            <H2 className="font-manrope-extrabold text-[18px] text-foreground dark:text-foreground-dark">
              Filtrar por valoración
            </H2>
            <TouchableOpacity onPress={onClose}>
              <IconClose size={20} color={themeColors.premium.black} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View className="gap-3 mb-6">
            {RATING_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                className={`p-4 rounded-2xl border flex-row items-center gap-2 ${
                  tempRating === option.value
                    ? 'bg-gold border-gold'
                    : 'bg-background dark:bg-background-dark border-border dark:border-border-dark'
                }`}
                onPress={() => setTempRating(option.value)}
              >
                <View className="flex-row gap-1">
                  {[...Array(5)].map((_, i) => (
                    <IconStar
                      key={i}
                      size={16}
                      fill={
                        i < Math.floor(option.stars)
                          ? themeColors.gold.DEFAULT
                          : themeColors.premium.gray.pale
                      }
                      color={
                        i < Math.floor(option.stars)
                          ? themeColors.gold.DEFAULT
                          : themeColors.premium.gray.pale
                      }
                    />
                  ))}
                </View>
                <Body
                  className={`font-manrope-medium text-[13px] ${
                    tempRating === option.value
                      ? 'text-premium-white'
                      : 'text-foreground-muted dark:text-foreground-muted-dark'
                  }`}
                >
                  {option.label}
                </Body>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            className="w-full bg-premium-black rounded-full py-3 items-center"
            onPress={() => {
              onApply(tempRating)
            }}
          >
            <Body className="font-manrope-extrabold text-[15px] text-premium-white dark:text-premium-white">
              Aplicar filtro
            </Body>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── PriceFilterModal ──────────────────────────────────────────────

function PriceFilterModal({
  visible,
  priceMin,
  priceMax,
  onClose,
  onApply,
}: {
  visible: boolean
  priceMin: number
  priceMax: number
  onClose: () => void
  onApply: (min: number, max: number) => void
}) {
  const themeColors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [values, setValues] = React.useState([priceMin, priceMax])

  React.useEffect(() => {
    if (visible) setValues([priceMin, priceMax])
  }, [visible, priceMin, priceMax])

  // Import dinámico para evitar problemas de SSR
  const MultiSlider = require('@ptomasroos/react-native-multi-slider').default

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-[rgba(0,0,0,0.5)]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-surface dark:bg-surface-dark rounded-t-3xl pt-6 px-5" style={{ paddingBottom: insets.bottom + 24 }}>
          <View className="flex-row justify-between items-center mb-8">
            <H2 className="font-manrope-extrabold text-[18px] text-foreground dark:text-foreground-dark">
              Intervalo de prezo
            </H2>
            <TouchableOpacity onPress={onClose}>
              <IconClose size={20} color={themeColors.premium.black} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Rango actual */}
          <View className="items-center mb-8">
            <Body className="font-manrope-bold text-[22px] text-foreground dark:text-foreground-dark">
              {values[0]}€ — {values[1] >= PRICE_MAX ? `${PRICE_MAX}€+` : `${values[1]}€`}
            </Body>
          </View>

          {/* Slider */}
          <View className="items-center mb-2">
            <MultiSlider
              values={values}
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={5}
              onValuesChange={setValues}
              sliderLength={300}
              selectedStyle={{ backgroundColor: themeColors.premium.black }}
              unselectedStyle={{ backgroundColor: themeColors.premium.gray.pale ?? '#E5E7EB' }}
              markerStyle={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: themeColors.premium.white,
                borderWidth: 0,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 4,
              }}
              containerStyle={{ height: 44 }}
              trackStyle={{ height: 2, borderRadius: 1 }}
              enableLabel={false}
            />
          </View>

          {/* Etiquetas extremos */}
          <View className="flex-row justify-between px-1 mb-10">
            <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">{PRICE_MIN}€</Caption>
            <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">{PRICE_MAX}€+</Caption>
          </View>

          <TouchableOpacity
            className="w-full bg-foreground dark:bg-foreground-dark rounded-full py-3 items-center"
            activeOpacity={0.88}
            onPress={() => onApply(values[0], values[1])}
          >
            <Body className="font-manrope-extrabold text-[15px] text-premium-white dark:text-surface-dark">
              Aplicar filtro
            </Body>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── DistanceFilterModal ─────────────────────────────────────────────

const DEFAULT_COORDS = { latitude: 40.4168, longitude: -3.7038 }

function DistanceFilterModal({
  visible,
  maxDistance,
  center,
  userCoords,
  onClose,
  onApply,
}: {
  visible: boolean
  maxDistance: number
  center: { latitude: number; longitude: number } | null
  userCoords: { latitude: number; longitude: number } | null
  onClose: () => void
  onApply: (max: number, center: { latitude: number; longitude: number } | null) => void
}) {
  const themeColors = useThemeColors()
  const insets = useSafeAreaInsets()
  const mapRef = React.useRef<MapView>(null)

  const resolvedUserCoords = userCoords ?? DEFAULT_COORDS

  const [tempMax, setTempMax] = React.useState(maxDistance)
  const [tempCenter, setTempCenter] = React.useState(center ?? resolvedUserCoords)
  const [usingCustomCenter, setUsingCustomCenter] = React.useState(center !== null)

  const [locationQuery, setLocationQuery] = React.useState('')
  const [isGeocoding, setIsGeocoding] = React.useState(false)
  const [geocodeError, setGeocodeError] = React.useState<string | null>(null)

  // On open: restore saved state
  React.useEffect(() => {
    if (!visible) return
    const initialCenter = center ?? userCoords ?? DEFAULT_COORDS
    setTempMax(maxDistance)
    setTempCenter(initialCenter)
    setUsingCustomCenter(center !== null)
    setLocationQuery('')
    setGeocodeError(null)
    setTimeout(() => animateToRegion(initialCenter, maxDistance), 350)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // If userCoords arrives after the modal opens and no custom center is set, fly there
  React.useEffect(() => {
    if (!visible || usingCustomCenter || !userCoords) return
    setTempCenter(userCoords)
    animateToRegion(userCoords, tempMax)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCoords, visible])

  const animateToRegion = (c: { latitude: number; longitude: number }, radius: number) => {
    const delta = (radius * 2.6) / 111
    mapRef.current?.animateToRegion(
      { latitude: c.latitude, longitude: c.longitude, latitudeDelta: delta, longitudeDelta: delta },
      350
    )
  }

  const handleSliderChange = (value: number) => {
    const rounded = Math.round(value)
    setTempMax(rounded)
    animateToRegion(tempCenter, rounded)
  }

  const handleMapPress = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const coord = e.nativeEvent.coordinate
    setTempCenter(coord)
    setUsingCustomCenter(true)
    animateToRegion(coord, tempMax)
  }

  const handleMarkerDragEnd = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const coord = e.nativeEvent.coordinate
    setTempCenter(coord)
    setUsingCustomCenter(true)
  }

  const resetToUserLocation = () => {
    setTempCenter(resolvedUserCoords)
    setUsingCustomCenter(false)
    setLocationQuery('')
    setGeocodeError(null)
    animateToRegion(resolvedUserCoords, tempMax)
  }

  const handleLocationSearch = async () => {
    const q = locationQuery.trim()
    if (!q) return
    setIsGeocoding(true)
    setGeocodeError(null)
    try {
      const results = await Location.geocodeAsync(q)
      if (results.length > 0) {
        const coord = { latitude: results[0].latitude, longitude: results[0].longitude }
        setTempCenter(coord)
        setUsingCustomCenter(true)
        setLocationQuery('')
        animateToRegion(coord, tempMax)
      } else {
        setGeocodeError('Ubicación non atopada')
      }
    } catch {
      setGeocodeError('Erro ao buscar')
    } finally {
      setIsGeocoding(false)
    }
  }

  const Slider = require('@react-native-community/slider').default

  const initialRegion = {
    latitude: tempCenter.latitude,
    longitude: tempCenter.longitude,
    latitudeDelta: (tempMax * 2.6) / 111,
    longitudeDelta: (tempMax * 2.6) / 111,
  }

  const panelBg = themeColors.premium.white       // #FFF in light, #1A1A1A in dark
  const dividerColor = themeColors.premium.divider.medium
  const trackFg = themeColors.premium.black       // #000 in light, #F0F0F0 in dark
  const trackBg = themeColors.premium.gray.pale   // #D1D5DB in light, #3A3A3A in dark

  return (
    <Modal visible={visible} transparent={false} animationType="slide" statusBarTranslucent>
      {/* Outer container — no background so map fills everything */}
      <View style={{ flex: 1 }}>

        {/* ── Full-screen map ── */}
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
        >
          <Circle
            center={tempCenter}
            radius={tempMax * 1000}
            fillColor="rgba(212,175,55,0.12)"
            strokeColor={themeColors.gold.DEFAULT}
            strokeWidth={2.5}
          />
          <Marker
            coordinate={tempCenter}
            draggable
            onDragEnd={handleMarkerDragEnd}
            pinColor={themeColors.gold.DEFAULT}
          />
        </MapView>

        {/* ── Top bar: close + search (floats over map) ── */}
        <View
          style={{
            position: 'absolute',
            top: insets.top + 12,
            left: 16,
            right: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {/* Close */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: 'rgba(255,255,255,0.97)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 6,
              elevation: 6,
              flexShrink: 0,
            }}
          >
            <IconClose size={18} color="#000" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Location search */}
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.97)',
              borderRadius: 21,
              paddingHorizontal: 14,
              height: 42,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 6,
              elevation: 6,
              gap: 8,
            }}
          >
            <IconSearch size={16} color="#666" strokeWidth={2} />
            <TextInput
              style={{ flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 13, color: '#000', padding: 0 }}
              placeholder="Busca un lugar..."
              placeholderTextColor="#999"
              value={locationQuery}
              onChangeText={(t) => { setLocationQuery(t); setGeocodeError(null) }}
              onSubmitEditing={handleLocationSearch}
              returnKeyType="search"
            />
            {isGeocoding ? (
              <ActivityIndicator size="small" color="#666" />
            ) : locationQuery.length > 0 ? (
              <TouchableOpacity onPress={handleLocationSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <IconArrowUpRight size={16} color="#000" strokeWidth={2.5} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── Geocode error pill ── */}
        {geocodeError && (
          <View
            style={{
              position: 'absolute',
              top: insets.top + 66,
              left: 16,
              right: 16,
              backgroundColor: 'rgba(239,68,68,0.92)',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 8,
              alignItems: 'center',
            }}
          >
            <Caption style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#fff' }}>
              {geocodeError}
            </Caption>
          </View>
        )}

        {/* ── Tap hint (bottom-right of map visible area) ── */}
        <View
          style={{
            position: 'absolute',
            top: insets.top + 66,
            right: 16,
            backgroundColor: 'rgba(255,255,255,0.88)',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Caption style={{ fontFamily: 'Manrope_500Medium', fontSize: 10, color: '#555' }}>
            Toca o mapa para mover
          </Caption>
        </View>

        {/* ── Bottom panel (floats over map, no gap/corner bleed) ── */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: panelBg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 12,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 20,
          }}
        >
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: dividerColor, alignSelf: 'center', marginBottom: 18 }} />

          {/* Radius value + context */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Body style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 30, color: trackFg, lineHeight: 36 }}>
              {tempMax >= DISTANCE_MAX ? `${DISTANCE_MAX} km+` : `${tempMax} km`}
            </Body>
            <Caption style={{ fontFamily: 'Manrope_500Medium', fontSize: 12, color: themeColors.premium.gray.DEFAULT, marginTop: 4 }}>
              {usingCustomCenter ? 'Dende o punto seleccionado' : 'Dende a túa ubicación'}
            </Caption>
          </View>

          {/* Slider */}
          <Slider
            style={{ width: '100%', height: 44 }}
            minimumValue={1}
            maximumValue={DISTANCE_MAX}
            step={1}
            value={tempMax}
            onValueChange={handleSliderChange}
            minimumTrackTintColor={trackFg}
            maximumTrackTintColor={trackBg}
            thumbTintColor={trackFg}
          />

          {/* Range labels */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 18 }}>
            <Caption style={{ fontFamily: 'Manrope_500Medium', fontSize: 11, color: themeColors.premium.gray.DEFAULT }}>1 km</Caption>
            <Caption style={{ fontFamily: 'Manrope_500Medium', fontSize: 11, color: themeColors.premium.gray.DEFAULT }}>{DISTANCE_MAX} km+</Caption>
          </View>

          {/* Reset to my location */}
          {usingCustomCenter && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                marginBottom: 10,
                borderRadius: 50,
                borderWidth: 1,
                borderColor: dividerColor,
              }}
              activeOpacity={0.8}
              onPress={resetToUserLocation}
            >
              <IconNearMe size={16} color={trackFg} strokeWidth={2} />
              <Body style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: trackFg }}>
                Usar miña ubicación
              </Body>
            </TouchableOpacity>
          )}

          {/* Apply */}
          <TouchableOpacity
            style={{ backgroundColor: trackFg, borderRadius: 50, paddingVertical: 14, alignItems: 'center' }}
            activeOpacity={0.88}
            onPress={() => onApply(tempMax, usingCustomCenter ? tempCenter : null)}
          >
            <Body style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 15, color: panelBg }}>
              Aplicar filtro
            </Body>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── ServiceFilterModal ──────────────────────────────────────────────

function ServiceFilterModal({
  visible,
  selectedServices,
  onClose,
  onApply,
}: {
  visible: boolean
  selectedServices: string[]
  onClose: () => void
  onApply: (selectedServices: string[]) => void
}) {
  const themeColors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [tempServices, setTempServices] = React.useState(selectedServices)

  React.useEffect(() => { if (visible) setTempServices(selectedServices) }, [visible, selectedServices])

  const toggle = (id: string) => {
    setTempServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-[rgba(0,0,0,0.5)]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-surface dark:bg-surface-dark rounded-t-3xl pt-6 px-5" style={{ paddingBottom: insets.bottom + 24 }}>
          <View className="flex-row justify-between items-center mb-6">
            <H2 className="font-manrope-extrabold text-[18px] text-foreground dark:text-foreground-dark">
              Servizos
            </H2>
            <TouchableOpacity onPress={onClose}>
              <IconClose size={20} color={themeColors.premium.black} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View className="gap-3 mb-6">
            {SERVICES.map((service) => {
              const selected = tempServices.includes(service.id)
              return (
                <TouchableOpacity
                  key={service.id}
                  activeOpacity={0.8}
                  className={`p-4 rounded-2xl border ${
                    selected
                      ? 'bg-gold border-gold'
                      : 'bg-background dark:bg-background-dark border-border dark:border-border-dark'
                  }`}
                  onPress={() => toggle(service.id)}
                >
                  <Body className={`font-manrope-medium text-[13px] ${selected ? 'text-premium-white' : 'text-foreground dark:text-foreground-dark'}`}>
                    {service.name}
                  </Body>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity
            className="w-full bg-foreground dark:bg-foreground-dark rounded-full py-3 items-center"
            activeOpacity={0.88}
            onPress={() => onApply(tempServices)}
          >
            <Body className="font-manrope-extrabold text-[15px] text-premium-white dark:text-surface-dark">
              Aplicar filtro
            </Body>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}