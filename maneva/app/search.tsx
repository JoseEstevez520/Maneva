import React, { useState, useMemo } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Pressable,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  IconSearch,
  IconClose,
  IconExpandMore,
  IconArrowUpRight,
  IconStar,
} from '@/components/ui/icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useSalonsWithRating } from '@/hooks/useSalons'
import { useLocation } from '@/hooks/useLocation'
import { H1, H2, Body, Caption } from '@/components/ui/Typography'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { UnifiedSalon } from '@/services/salons.service'

type SearchSalon = UnifiedSalon & { avgRating: number | null; avgPrice: number | null; distance: number }

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=400&h=300&fit=crop&q=80'

const SERVICES = [
  { id: 'corte', name: 'Corte de pelo' },
  { id: 'barba', name: 'Barba' },
  { id: 'manicura', name: 'Manicura' },
  { id: 'peinado', name: 'Peinado' },
  { id: 'tinte', name: 'Tinte' },
  { id: 'tratamiento', name: 'Tratamiento' },
]

const PRICE_RANGES = [
  { id: 0, label: 'Todas', min: 0, max: Infinity },
  { id: 1, label: '€ (0-20€)', min: 0, max: 20 },
  { id: 2, label: '€€ (20-50€)', min: 20, max: 50 },
  { id: 3, label: '€€€ (50€+)', min: 50, max: Infinity },
]

const GENDERS = [
  { id: 'unisex', label: 'Unisex' },
  { id: 'mujer', label: 'Mujer' },
  { id: 'hombre', label: 'Hombre' },
]

interface Filters {
  minRating: number
  selectedServices: string[]
  priceRange: number
  gender: string | null
  maxDistance: number
}

export default function SearchScreen() {
  const themeColors = useThemeColors()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const { coords } = useLocation()
  const [filters, setFilters] = useState<Filters>({
    minRating: 0,
    selectedServices: [],
    priceRange: 0,
    gender: null,
    maxDistance: 50,
  })
  const [visibleModal, setVisibleModal] = useState<'rating' | 'price' | 'gender' | null>(null)

  const { data: salons, loading } = useSalonsWithRating()

  // Un filtro se considera activo cuando tiene un valor distinto al estado inicial.
  // El género no se incluye aún porque requiere la columna `gender_focus` en salon_locations.
  // selectedServices se incluye para que el chip "Limpiar" aparezca cuando hay servicios seleccionados.
  const hasActiveFilters =
    filters.minRating > 0 ||
    filters.priceRange > 0 ||
    filters.selectedServices.length > 0 ||
    query.length > 0

  // Calcular distancia en km
  const calculateDistance = (lat: number | null, lon: number | null) => {
    if (!coords || !lat || !lon) return 0
    const R = 6371
    const dLat = ((lat - coords.latitude) * Math.PI) / 180
    const dLon = ((lon - coords.longitude) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coords.latitude * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c * 10) / 10
  }

  // Búsqueda y filtrado de salones
  const filteredSalons = useMemo(() => {
    let result = salons.map((salon) => ({
      ...salon,
      distance: calculateDistance(salon.latitude ?? null, salon.longitude ?? null),
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

    // Filtro por rango de precio.
    // `avgPrice` se calcula en el servicio como la media de los precios de los servicios
    // de cada sede. Los salones sin servicios registrados (avgPrice === null) se excluyen
    // cuando hay un filtro de precio activo, ya que no hay forma de clasificarlos.
    if (filters.priceRange > 0) {
      const { min, max } = PRICE_RANGES[filters.priceRange]
      result = result.filter((salon) => {
        if (salon.avgPrice === null) return false
        return salon.avgPrice >= min && salon.avgPrice <= max
      })
    }

    // TODO: Filtro por género — requiere la columna `gender_focus` (text) en la tabla
    // `salon_locations` con los valores posibles: 'unisex' | 'mujer' | 'hombre'.
    // Cuando exista, añadir: result = result.filter((s) => s.gender_focus === filters.gender)

    // TODO: Filtro por servicios — requiere ampliar la query para comparar los nombres
    // de los servicios del salón contra los IDs seleccionados en `filters.selectedServices`.

    return result.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
  }, [salons, query, filters, hasActiveFilters, coords])

  const toggleService = (serviceId: string) => {
    setFilters((prev) => {
      const newServices = prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter((s) => s !== serviceId)
        : [...prev.selectedServices, serviceId]

      return {
        ...prev,
        selectedServices: newServices,
      }
    })
  }

  const clearServiceFilter = () => {
    setFilters((prev) => ({
      ...prev,
      selectedServices: [],
    }))
  }

  const clearAllFilters = () => {
    setQuery('')
    setFilters({
      minRating: 0,
      selectedServices: [],
      priceRange: 0,
      gender: null,
      maxDistance: 50,
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      {/* ── Header ── */}
      <View className="bg-surface dark:bg-surface-dark pt-2.5">
        <View className="flex-row items-center px-5 mb-4 gap-4">
          <View className="flex-1 flex-row items-center bg-surface-raised dark:bg-surface-raised-dark rounded-2xl px-3 h-12">
            <IconSearch color={themeColors.premium.black} size={20} strokeWidth={2} style={{ marginRight: 8 }} />
            <TextInput
              className="flex-1 font-manrope-medium text-[14px] text-foreground dark:text-foreground-dark py-0 h-full"
              value={query}
              onChangeText={setQuery}
              autoFocus
              placeholder="Busca una peluquería"
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
            label="Valoración"
            iconTail="expand_more"
            active={filters.minRating > 0}
            onPress={() => setVisibleModal('rating')}
          />
          <FilterChip
            label="Precio"
            iconTail="expand_more"
            active={filters.priceRange > 0}
            onPress={() => setVisibleModal('price')}
          />
          {/* TODO: Habilitar cuando exista la columna `gender_focus` en salon_locations.
              El modal está implementado pero no es accesible hasta entonces. */}
          <FilterChip
            label="Género"
            iconTail="expand_more"
            active={filters.gender !== null}
            disabled
            onPress={() => setVisibleModal('gender')}
          />
          {filters.selectedServices.length > 0 && (
            <FilterChip
              label={`${filters.selectedServices.length} servicio${filters.selectedServices.length > 1 ? 's' : ''}`}
              active={true}
              disabled
              onPress={clearServiceFilter}
            />
          )}
          {hasActiveFilters && (
            <FilterChip
              label="Limpiar"
              variant="clear"
              onPress={clearAllFilters}
            />
          )}
        </ScrollView>
        <View className="h-[1px] bg-surface-overlay dark:bg-surface-overlay-dark w-full" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
        {/* ── Buscar por Servicio ── */}
        <View className="mt-8">
          <Caption className="px-5 font-manrope-extrabold text-[11px] tracking-[2px] text-foreground dark:text-foreground-dark mb-5">
            FILTRAR POR SERVICIO
          </Caption>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="px-5 gap-3 pb-4"
          >
            {SERVICES.map((service) => (
              <TouchableOpacity
                key={service.id}
                className={`px-5 py-3 rounded-full border ${
                  filters.selectedServices.includes(service.id)
                    ? 'border-gold bg-[rgba(212,175,55,0.1)]'
                    : 'border-border dark:border-border-dark bg-surface dark:bg-surface-dark'
                }`}
                activeOpacity={0.7}
                onPress={() => toggleService(service.id)}
              >
                <Body className="font-manrope-bold text-[13px] text-foreground dark:text-foreground-dark">
                  {service.name}
                </Body>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Modo de búsqueda activo ── */}
        {filters.selectedServices.length > 0 && (
          <View className="mx-5 mb-4 p-3 bg-[rgba(212,175,55,0.1)] border border-gold rounded-lg">
            <Caption className="font-manrope-medium text-[12px] text-foreground dark:text-foreground-dark">
              Buscando salones con: {filters.selectedServices
                .map((id) => SERVICES.find((s) => s.id === id)?.name)
                .join(', ')}
            </Caption>
          </View>
        )}

        {/* ── Salones ── */}
        <View className="mt-4">
          <View className="px-5 flex-row items-center justify-between mb-5">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-foreground dark:text-foreground-dark">
              {!hasActiveFilters
                ? `TODOS LOS SALONES (${filteredSalons.length})`
                : filters.selectedServices.length > 0
                ? `SALONES CON ESTOS SERVICIOS (${filteredSalons.length})`
                : `SALONES QUE COINCIDEN (${filteredSalons.length})`}
            </Caption>
          </View>

          {loading ? (
            <LoadingSpinner className="pt-10 items-center" />
          ) : filteredSalons.length === 0 ? (
            <View className="px-5">
              <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark mb-2">
                No se encontraron resultados
              </Body>
              <Caption className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark">
                {filters.selectedServices.length > 0
                  ? 'Intenta con otros servicios'
                  : query.length > 0
                  ? 'Intenta cambiar el nombre de búsqueda'
                  : 'Intenta cambiar los filtros'}
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
        priceRange={filters.priceRange}
        onClose={() => setVisibleModal(null)}
        onApply={(priceRange) => {
          setFilters((prev) => ({ ...prev, priceRange }))
          setVisibleModal(null)
        }}
      />

      {/* ── Modal de Género ── */}
      <GenderFilterModal
        visible={visibleModal === 'gender'}
        gender={filters.gender}
        onClose={() => setVisibleModal(null)}
        onApply={(gender) => {
          setFilters((prev) => ({ ...prev, gender }))
          setVisibleModal(null)
        }}
      />
    </SafeAreaView>
  )
}

// ─── FilterChip ─────────────────────────────────────────────────────

const AnimatedFilterChip = Animated.createAnimatedComponent(Pressable)

function FilterChip({
  label,
  iconTail,
  active,
  disabled,
  variant = 'default',
  onPress,
}: {
  label: string
  iconTail?: 'expand_more'
  active?: boolean
  disabled?: boolean
  /** default: chip de filtro (dorado si activo). clear: acción de borrar (negro). */
  variant?: 'default' | 'clear'
  onPress?: () => void
}) {
  const themeColors = useThemeColors()
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const containerStyle =
    variant === 'clear'
      ? 'bg-premium-black border-premium-black'
      : active
        ? 'bg-gold border-gold'
        : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark-strong'

  const textColor =
    variant === 'clear'
      ? 'text-premium-white'
      : active
        ? 'text-premium-white'
        : 'text-foreground dark:text-foreground-dark'

  return (
    <AnimatedFilterChip
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.93, { damping: 15, stiffness: 300 }) }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }) }}
      style={[animatedStyle, disabled ? { opacity: 0.4 } : undefined]}
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
          color={active ? themeColors.premium.white : themeColors.premium.black}
          strokeWidth={2}
        />
      )}
    </AnimatedFilterChip>
  )
}

// ─── SalonResultRow ─────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function SalonResultRow({ salon }: { salon: SearchSalon }) {
  const themeColors = useThemeColors()
  const router = useRouter()
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <AnimatedPressable
      onPress={() => router.push(`/salon/${salon.id}`)}
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 300 }) }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }) }}
      style={animatedStyle}
      className="flex-row items-center py-6 px-5 border-b border-premium-white-pale gap-5"
    >
      <Image
        source={{ uri: salon.salons?.logo ?? salon.Image ?? PLACEHOLDER_IMAGE }}
        className="w-14 h-14 rounded-full border border-border dark:border-border-dark"
      />
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <H2 className="font-manrope-extrabold text-[15px] text-foreground dark:text-foreground-dark flex-1">
            {salon.salons?.name ?? salon.name}
          </H2>
          <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
            {salon.distance}km
          </Caption>
        </View>
        <View className="flex-row items-center gap-1.5">
          {salon.avgRating !== null && (
            <View className="flex-row items-center gap-1">
              <IconStar size={12} fill={themeColors.gold.DEFAULT} color={themeColors.gold.DEFAULT} />
              <Caption className="font-manrope-bold text-[12px] text-foreground dark:text-foreground-dark">
                {salon.avgRating.toFixed(1)}
              </Caption>
            </View>
          )}
          <Caption className="flex-1 font-manrope-medium text-[12px] text-foreground-subtle dark:text-foreground-subtle-dark" numberOfLines={1}>
            {salon.address ?? salon.city ?? 'Madrid'}
          </Caption>
        </View>
      </View>
    </AnimatedPressable>
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
  const [tempRating, setTempRating] = React.useState(minRating)

  // Sincronizar el estado temporal con el valor confirmado cada vez que el modal se abre
  React.useEffect(() => { if (visible) setTempRating(minRating) }, [visible, minRating])

  const RATING_OPTIONS = [
    { value: 0, label: 'Todas las valoraciones', stars: 0 },
    { value: 3, label: '3 estrellas en adelante', stars: 3 },
    { value: 4, label: '4 estrellas en adelante', stars: 4 },
    { value: 4.5, label: '4.5 estrellas en adelante', stars: 4.5 },
  ]

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-[rgba(0,0,0,0.5)]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-surface dark:bg-surface-dark rounded-t-3xl pt-6 px-5 pb-10">
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
                className={`p-4 rounded-lg border flex-row items-center gap-2 ${
                  tempRating === option.value
                    ? 'bg-gold border-gold'
                    : 'bg-background dark:bg-background-dark border-border dark:border-border-dark-strong'
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
  priceRange,
  onClose,
  onApply,
}: {
  visible: boolean
  priceRange: number
  onClose: () => void
  onApply: (priceRange: number) => void
}) {
  const themeColors = useThemeColors()
  const [tempPrice, setTempPrice] = React.useState(priceRange)

  React.useEffect(() => { if (visible) setTempPrice(priceRange) }, [visible, priceRange])

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-[rgba(0,0,0,0.5)]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-surface dark:bg-surface-dark rounded-t-3xl pt-6 px-5 pb-10">
          <View className="flex-row justify-between items-center mb-6">
            <H2 className="font-manrope-extrabold text-[18px] text-foreground dark:text-foreground-dark">
              Rango de precio
            </H2>
            <TouchableOpacity onPress={onClose}>
              <IconClose size={20} color={themeColors.premium.black} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View className="gap-3 mb-6">
            {PRICE_RANGES.map((option) => (
              <TouchableOpacity
                key={option.id}
                className={`p-4 rounded-lg border ${
                  tempPrice === option.id
                    ? 'bg-gold border-gold'
                    : 'bg-background dark:bg-background-dark border-border dark:border-border-dark-strong'
                }`}
                onPress={() => setTempPrice(option.id)}
              >
                <Body
                  className={`font-manrope-medium text-[13px] ${
                    tempPrice === option.id
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
              onApply(tempPrice)
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

// ─── GenderFilterModal ──────────────────────────────────────────────

function GenderFilterModal({
  visible,
  gender,
  onClose,
  onApply,
}: {
  visible: boolean
  gender: string | null
  onClose: () => void
  onApply: (gender: string | null) => void
}) {
  const themeColors = useThemeColors()
  const [tempGender, setTempGender] = React.useState(gender)

  React.useEffect(() => { if (visible) setTempGender(gender) }, [visible, gender])

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-[rgba(0,0,0,0.5)]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-surface dark:bg-surface-dark rounded-t-3xl pt-6 px-5 pb-10">
          <View className="flex-row justify-between items-center mb-6">
            <H2 className="font-manrope-extrabold text-[18px] text-foreground dark:text-foreground-dark">
              Tipo de salón
            </H2>
            <TouchableOpacity onPress={onClose}>
              <IconClose size={20} color={themeColors.premium.black} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View className="gap-3 mb-6">
            {GENDERS.map((option) => (
              <TouchableOpacity
                key={option.id}
                className={`p-4 rounded-lg border ${
                  tempGender === option.id
                    ? 'bg-gold border-gold'
                    : 'bg-background dark:bg-background-dark border-border dark:border-border-dark-strong'
                }`}
                onPress={() => setTempGender(option.id)}
              >
                <Body
                  className={`font-manrope-medium text-[13px] ${
                    tempGender === option.id
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
              onApply(tempGender)
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