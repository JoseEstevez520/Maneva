import React, { useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  IconSearch,
  IconClose,
  IconNearMe,
  IconExpandMore,
  IconNorthWest,
  IconStar,
} from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { useSalonsWithRating } from '@/hooks/useSalons'
import { UnifiedSalon } from '@/services/salons.service'
import { H1, H2, Body, Caption } from '@/components/ui/Typography'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=400&h=300&fit=crop&q=80'

const SERVICES = ['Corte de pelo', 'Barba', 'Manicura', 'Peiteado', 'Tinte', 'Tratamiento']

export default function SearchScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const { data: salons, loading } = useSalonsWithRating()

  // Filtramos la lista en memoria según la búsqueda
  const filteredSalons = salons.filter((s) => {
    const term = query.toLowerCase()
    const name = (s.salons?.name ?? s.name).toLowerCase()
    return name.includes(term) || query === ''
  })

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
              placeholder="Busca una peluquería o servicio"
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-5 gap-[10px] pb-4">
          <FilterChip icon="near_me" label="Cerca de mí" active />
          <FilterChip label="Precio" iconTail="expand_more" />
          <FilterChip label="Valoración" iconTail="expand_more" />
          <FilterChip label="Género" iconTail="expand_more" />
        </ScrollView>
        <View className="h-[1px] bg-[#F3F4F6] w-full" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
        {/* ── Buscar por Servicio ── */}
        <View className="mt-8">
          <Caption className="px-5 font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-5">
            BUSCAR POR SERVIZO
          </Caption>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-5 gap-3">
            {SERVICES.map((serv, i) => (
              <TouchableOpacity
                key={serv}
                className={`px-5 py-3 rounded-full border bg-premium-white ${i === 0 ? 'border-gold' : 'border-[#F3F4F6]'}`}
                activeOpacity={0.7}
              >
                <Body className="font-manrope-bold text-[13px] text-premium-black">{serv}</Body>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Buscar por Peluquería ── */}
        <View className="mt-8">
          <Caption className="px-5 font-manrope-extrabold text-[11px] tracking-[2px] text-premium-black mb-5">
            BUSCAR POR PERRUQUERÍA
          </Caption>

          {loading ? (
            <LoadingSpinner className="pt-10 items-center" />
          ) : filteredSalons.length === 0 ? (
            <Body className="px-5 font-manrope-medium text-[13px] text-premium-gray">
              No se encontraron resultados para &quot;{query}&quot;
            </Body>
          ) : (
            <View className="border-t border-[#F9FAFB]">
              {filteredSalons.map((salon) => (
                <SalonResultRow key={salon.id} salon={salon} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Componentes Hijos ────────────────────────────────────────────────────────

function FilterChip({
  label,
  icon,
  iconTail,
  active,
}: {
  label: string
  icon?: 'near_me'
  iconTail?: 'expand_more'
  active?: boolean
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={`flex-row items-center px-4 py-2 rounded-full border gap-1.5 ${
        active ? 'bg-premium-black border-premium-black' : 'bg-premium-white border-[#E5E7EB]'
      }`}
    >
      {icon === 'near_me' && <IconNearMe size={16} color={active ? Colors.premium.white : Colors.premium.black} strokeWidth={2} />}
      <Caption className={`font-manrope-bold text-[12px] ${active ? 'text-premium-white' : 'text-premium-black'}`}>
        {label}
      </Caption>
      {iconTail === 'expand_more' && <IconExpandMore size={16} color={Colors.premium.black} strokeWidth={2} />}
    </TouchableOpacity>
  )
}

function SalonResultRow({ salon }: { salon: UnifiedSalon & { avgRating: number | null } }) {
  const isEco = salon.salons?.name?.toLowerCase().includes('noir') // Simulamos propiedad ECO
  const distance = (Math.random() * 5).toFixed(1) // Placeholder para distancia

  return (
    <TouchableOpacity className="flex-row items-center py-6 px-5 border-b border-[#F9FAFB] gap-5" activeOpacity={0.7}>
      <Image source={{ uri: PLACEHOLDER_IMAGE }} className="w-14 h-14 rounded-full border border-[#F3F4F6]" />
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <View className="flex-row items-center gap-2">
            <H2 className="font-manrope-extrabold text-[15px] text-premium-black">
              {salon.salons?.name ?? salon.name}
            </H2>
            {isEco && (
              <View className="bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] px-1.5 py-0.5 rounded">
                <Caption className="font-manrope-extrabold text-[9px] tracking-widest text-gold text-center">
                  ECO
                </Caption>
              </View>
            )}
          </View>
          <IconNorthWest size={16} color={Colors.premium.gray.light} />
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
          {salon.avgRating !== null && <Caption className="text-[12px] text-[#D1D5DB]">•</Caption>}
          <Caption className="font-manrope-medium text-[12px] text-[#6B7280]">{distance} km</Caption>
          <Caption className="text-[12px] text-[#D1D5DB]">•</Caption>
          <Caption className="flex-1 font-manrope-medium text-[12px] text-[#9CA3AF]" numberOfLines={1}>
            {salon.address ?? salon.city ?? 'Madrid'}
          </Caption>
        </View>
      </View>
    </TouchableOpacity>
  )
}
