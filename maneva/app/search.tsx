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
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  IconSearch,
  IconClose,
  IconExpandMore,
  IconNorthWest,
  IconStar,
} from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
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
  const hasActiveFilters = filters.minRating > 0 || filters.priceRange > 0 || query.length > 0

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
    <SafeAreaView className="flex-1 bg-premium-white" edges={['top']}>
      {/* ── Header ── */}
      <View className="bg-premium-white pt-[10px]">
        <View className="flex-row items-center px-5 mb-4 gap-4">
          <View className="flex-1 flex-row items-center bg-[#F5F5F5] rounded-2xl px-3 h-12">
            <IconSearch color={Colors.premium.black} size={20} strokeWidth={2} style={{ marginRight: 8 }} />
            <TextInput
              className="flex-1 font-manrope-medium text-[14px] text-premium-black py-0 h-full"
              value={query}
              onChangeText={setQuery}
              autoFocus
              placeholder="Busca una peluquería"
              placeholderTextColor={Colors.premium.gray.DEFAULT}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} className="p-1">
                <IconClose color={Colors.premium.gray.DEFAULT} size={18} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Body className="font-manrope-bold text-[14px] text-premium-black">Cancelar</Body>
          </TouchableOpacity>
        </View>

        {/* ── Filtros Rápidos ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-5 gap-[10px] pb-4"
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
              active={true}
              onPress={clearAllFilters}
            />
          )}
        </ScrollView>
        <View className="h-[1px] bg-[#F3F4F6] w-full" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
        {/* ── Buscar por Servicio ── */}
        <View className="mt-8">
          <Caption className="px-5 font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-5">
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
                    : 'border-[#F3F4F6] bg-premium-white'
                }`}
                activeOpacity={0.7}
                onPress={() => toggleService(service.id)}
              >
                <Body className="font-manrope-bold text-[13px] text-premium-black">
                  {service.name}
                </Body>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Modo de búsqueda activo ── */}
        {filters.selectedServices.length > 0 && (
          <View className="mx-5 mb-4 p-3 bg-[rgba(212,175,55,0.1)] border border-gold rounded-lg">
            <Caption className="font-manrope-medium text-[12px] text-premium-black">
              Buscando salones con: {filters.selectedServices
                .map((id) => SERVICES.find((s) => s.id === id)?.name)
                .join(', ')}
            </Caption>
          </View>
        )}

        {/* ── Salones ── */}
        <View className="mt-4">
          <View className="px-5 flex-row items-center justify-between mb-5">
            <Caption className="font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black">
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
              <Body className="font-manrope-medium text-[13px] text-premium-gray mb-2">
                No se encontraron resultados
              </Body>
              <Caption className="font-manrope-medium text-[12px] text-premium-gray">
                {filters.selectedServices.length > 0
                  ? 'Intenta con otros servicios'
                  : query.length > 0
                  ? 'Intenta cambiar el nombre de búsqueda'
                  : 'Intenta cambiar los filtros'}
              </Caption>
            </View>
          ) : (
            <View className="border-t border-[#F9FAFB]">
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

function FilterChip({
  label,
  iconTail,
  active,
  disabled,
  onPress,
}: {
  label: string
  iconTail?: 'expand_more'
  active?: boolean
  disabled?: boolean
  onPress?: () => void
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center px-4 py-2 rounded-full border gap-1.5 ${
        active ? 'bg-gold border-gold' : 'bg-premium-white border-[#E5E7EB]'
      }${disabled ? ' opacity-40' : ''}`}
    >
      <Caption
        className={`font-manrope-bold text-[12px] ${
          active ? 'text-premium-black' : 'text-premium-black'
        }`}
      >
        {label}
      </Caption>
      {iconTail === 'expand_more' && (
        <IconExpandMore size={16} color={Colors.premium.black} strokeWidth={2} />
      )}
    </TouchableOpacity>
  )
}

// ─── SalonResultRow ─────────────────────────────────────────────────

function SalonResultRow({ salon }: { salon: SearchSalon }) {
  const router = useRouter()

  return (
    <TouchableOpacity
      onPress={() => router.push(`/salon/${salon.id}`)}
      className="flex-row items-center py-6 px-5 border-b border-[#F9FAFB] gap-5 active:bg-[#F9FAFB]"
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: PLACEHOLDER_IMAGE }}
        className="w-14 h-14 rounded-full border border-[#F3F4F6]"
      />
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <H2 className="font-manrope-extrabold text-[15px] text-premium-black flex-1">
            {salon.salons?.name ?? salon.name}
          </H2>
          <Caption className="font-manrope-medium text-[11px] text-premium-gray">
            {salon.distance}km
          </Caption>
        </View>
        <View className="flex-row items-center gap-1.5">
          {salon.avgRating !== null && (
            <View className="flex-row items-center gap-1">
              <IconStar size={12} fill={Colors.gold.DEFAULT} color={Colors.gold.DEFAULT} />
              <Caption className="font-manrope-bold text-[12px] text-premium-black">
                {salon.avgRating.toFixed(1)}
              </Caption>
            </View>
          )}
          <Caption className="flex-1 font-manrope-medium text-[12px] text-[#9CA3AF]" numberOfLines={1}>
            {salon.address ?? salon.city ?? 'Madrid'}
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
  const [tempRating, setTempRating] = React.useState(minRating)

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
        <View className="bg-premium-white rounded-t-3xl pt-6 px-5 pb-10">
          <View className="flex-row justify-between items-center mb-6">
            <H2 className="font-manrope-extrabold text-[18px] text-premium-black">
              Filtrar por valoración
            </H2>
            <TouchableOpacity onPress={onClose}>
              <IconClose size={20} color={Colors.premium.black} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View className="gap-3 mb-6">
            {RATING_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                className={`p-4 rounded-lg border flex-row items-center gap-2 ${
                  tempRating === option.value
                    ? 'bg-gold border-gold'
                    : 'bg-[#F9FAFB] border-[#E5E7EB]'
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
                          ? Colors.gold.DEFAULT
                          : '#D1D5DB'
                      }
                      color={
                        i < Math.floor(option.stars)
                          ? Colors.gold.DEFAULT
                          : '#D1D5DB'
                      }
                    />
                  ))}
                </View>
                <Body
                  className={`font-manrope-medium text-[13px] ${
                    tempRating === option.value
                      ? 'text-premium-black'
                      : 'text-premium-gray'
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
            <Body className="font-manrope-extrabold text-[15px] text-premium-white">
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
  const [tempPrice, setTempPrice] = React.useState(priceRange)

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-[rgba(0,0,0,0.5)]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-premium-white rounded-t-3xl pt-6 px-5 pb-10">
          <View className="flex-row justify-between items-center mb-6">
            <H2 className="font-manrope-extrabold text-[18px] text-premium-black">
              Rango de precio
            </H2>
            <TouchableOpacity onPress={onClose}>
              <IconClose size={20} color={Colors.premium.black} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View className="gap-3 mb-6">
            {PRICE_RANGES.map((option) => (
              <TouchableOpacity
                key={option.id}
                className={`p-4 rounded-lg border ${
                  tempPrice === option.id
                    ? 'bg-gold border-gold'
                    : 'bg-[#F9FAFB] border-[#E5E7EB]'
                }`}
                onPress={() => setTempPrice(option.id)}
              >
                <Body
                  className={`font-manrope-medium text-[13px] ${
                    tempPrice === option.id
                      ? 'text-premium-black'
                      : 'text-premium-gray'
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
            <Body className="font-manrope-extrabold text-[15px] text-premium-white">
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
  const [tempGender, setTempGender] = React.useState(gender)

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-[rgba(0,0,0,0.5)]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-premium-white rounded-t-3xl pt-6 px-5 pb-10">
          <View className="flex-row justify-between items-center mb-6">
            <H2 className="font-manrope-extrabold text-[18px] text-premium-black">
              Tipo de salón
            </H2>
            <TouchableOpacity onPress={onClose}>
              <IconClose size={20} color={Colors.premium.black} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View className="gap-3 mb-6">
            {GENDERS.map((option) => (
              <TouchableOpacity
                key={option.id}
                className={`p-4 rounded-lg border ${
                  tempGender === option.id
                    ? 'bg-gold border-gold'
                    : 'bg-[#F9FAFB] border-[#E5E7EB]'
                }`}
                onPress={() => setTempGender(option.id)}
              >
                <Body
                  className={`font-manrope-medium text-[13px] ${
                    tempGender === option.id
                      ? 'text-premium-black'
                      : 'text-premium-gray'
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
            <Body className="font-manrope-extrabold text-[15px] text-premium-white">
              Aplicar filtro
            </Body>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}