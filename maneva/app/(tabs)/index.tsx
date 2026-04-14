import React from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { IconSearch, IconCalendar, IconLocation, IconStar } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { useNextAppointment } from '@/hooks/useAppointments'
import { useSalons, useFavoriteSalon } from '@/hooks/useSalons'
import { useActiveCampaigns } from '@/hooks/useCampaigns'
import { useRouter } from 'expo-router'
import { H1, H2, Body, Caption } from '@/components/ui/Typography'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TutorialModal } from '@/components/ui/TutorialModal'

// ─── Imagen placeholder (fondo gris) para salones sin cover ───────────────────
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=400&h=300&fit=crop&q=80'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAppointmentDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Componentes internos ──────────────────────────────────────────────────────

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View className="flex-row justify-between items-center mb-[14px]">
      <Caption className="font-manrope-extrabold text-[11px] tracking-[2.5px] text-premium-black uppercase">
        {title}
      </Caption>
      {actionLabel && (
        <TouchableOpacity onPress={onAction}>
          <Caption className="font-manrope-bold text-[9px] tracking-[2px] text-premium-gray uppercase border-b border-premium-gray-light pb-[1px]">
            {actionLabel}
          </Caption>
        </TouchableOpacity>
      )}
    </View>
  )
}

function SearchBar() {
  const router = useRouter()
  return (
    <View className="px-5 pt-6 pb-2">
      <TouchableOpacity 
        className="flex-row items-center bg-premium-white rounded-2xl px-4 py-[14px] gap-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.1)]"
        activeOpacity={0.9}
        onPress={() => router.push('/search')}
      >
        <IconSearch color={Colors.premium.gray.DEFAULT} size={20} strokeWidth={2} />
        <View className="flex-1">
          <Body className="font-manrope-medium text-[14px] text-premium-gray">
            Busca una peluquería o servicio
          </Body>
        </View>
      </TouchableOpacity>
    </View>
  )
}

// ─── Sección B: Próxima Cita ──────────────────────────────────────────────────

function NextAppointmentSection() {
  const { data: appt, loading } = useNextAppointment()

  return (
    <View className="px-5 mt-7">
      <SectionHeader title="PRÓXIMA CITA" actionLabel="VER TODO" />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : appt ? (
        <View className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] p-5 gap-4">
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-1.5 mb-1">
                <IconCalendar color={Colors.gold.DEFAULT} size={13} strokeWidth={2.5} />
                <Caption className="font-manrope-extrabold text-[9px] tracking-[1.2px] uppercase text-gold">
                  {formatAppointmentDate(appt.scheduled_at)}
                </Caption>
              </View>
              <H2 className="font-manrope-bold text-[20px] text-premium-black leading-[26px]">
                {appt.salon_name}
              </H2>
              {appt.service_name && (
                <Body className="font-manrope-medium text-[13px] text-premium-gray mt-0.5">
                  {appt.service_name}
                </Body>
              )}
            </View>
            <Image source={{ uri: PLACEHOLDER_IMAGE }} className="w-20 h-20 rounded-2xl shrink-0" />
          </View>
          <TouchableOpacity className="border border-premium-black rounded-xl py-3 items-center" activeOpacity={0.7}>
            <Caption className="font-manrope-extrabold text-[9px] tracking-[2.5px] uppercase text-premium-black">VER DETALLES</Caption>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] p-5 items-center gap-[14px]">
          <Body className="font-manrope-medium text-[13px] text-premium-gray text-center">No tienes citas próximas</Body>
          <TouchableOpacity className="bg-gold rounded-lg py-2 px-10 items-center shadow-[0_6px_14px_rgba(212,175,55,0.4)]" activeOpacity={0.85}>
            <Caption className="font-manrope-extrabold text-[9px] tracking-[2.5px] uppercase text-premium-white">RESERVAR AHORA</Caption>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ─── Sección C: Tu Salón ─────────────────────────────────────────────────────

function MySalonSection() {
  const { data: salon, loading } = useFavoriteSalon()

  return (
    <View className="px-5 mt-7">
      <SectionHeader title="TU SALÓN DE PELUQUERÍA" />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : salon ? (
        <View className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] flex-row h-[120px] overflow-hidden">
          <Image source={{ uri: PLACEHOLDER_IMAGE }} className="w-1/3 h-full" />
          <View className="flex-1 p-[14px] justify-between">
            <View>
              <View className="flex-row items-center justify-between mb-1">
                <Body className="font-manrope-bold text-[14px] text-premium-black flex-1 mr-1.5" numberOfLines={1}>
                  {salon.salons?.name ?? salon.name}
                </Body>
                {salon.avgRating !== null && (
                  <View className="flex-row items-center gap-[3px]">
                    <IconStar color={Colors.gold.DEFAULT} size={11} fill={Colors.gold.DEFAULT} />
                    <Caption className="font-manrope-extrabold text-[11px] text-premium-black">{salon.avgRating.toFixed(1)}</Caption>
                  </View>
                )}
              </View>
              <Caption className="font-manrope-medium text-[10px] text-premium-gray leading-[14px]" numberOfLines={1}>
                {salon.salons?.description ?? 'Tu salón de confianza'}
              </Caption>
            </View>
            <TouchableOpacity className="bg-gold rounded-lg py-2 items-center shadow-[0_6px_14px_rgba(212,175,55,0.4)]" activeOpacity={0.85}>
              <Caption className="font-manrope-extrabold text-[9px] tracking-[2.5px] uppercase text-premium-white">VER SALÓN</Caption>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] p-5 items-center gap-[14px]">
          <Body className="font-manrope-medium text-[13px] text-premium-gray text-center">Aún no tienes un salón favorito</Body>
        </View>
      )}
    </View>
  )
}

// ─── Sección D: Disponible Hoy ────────────────────────────────────────────────

function TodayCard({ name, city }: { name: string; city: string | null }) {
  return (
    <View className="w-[240px] bg-premium-white rounded-[24px] overflow-hidden border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)]">
      <View>
        <Image source={{ uri: PLACEHOLDER_IMAGE }} className="w-full h-[140px]" />
        <View className="absolute top-2.5 left-2.5 bg-gold px-2.5 py-1 rounded-lg">
          <Caption className="font-manrope-extrabold text-[7px] tracking-[1.5px] uppercase text-premium-white">DISPONIBLE HOY</Caption>
        </View>
      </View>
      <View className="p-[14px] gap-1.5">
        <Body className="font-manrope-bold text-[14px] text-premium-black" numberOfLines={1}>{name}</Body>
        <View className="flex-row items-center gap-1">
          <IconLocation color={Colors.premium.gray.DEFAULT} size={13} strokeWidth={2} />
          <Caption className="font-manrope-medium text-[11px] text-premium-gray">{city ?? 'Madrid'}</Caption>
        </View>
      </View>
    </View>
  )
}

function AvailableTodaySection() {
  const { data: salons, loading } = useSalons()

  return (
    <View className="px-5 mt-7">
      <SectionHeader title="DISPONIBLE HOY" />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-4 pb-2"
        >
          {salons.length === 0 ? (
            <Body className="font-manrope-medium text-[13px] text-premium-gray text-center py-4">Sin salones disponibles</Body>
          ) : (
            salons.map(salon => (
              <TodayCard
                key={salon.id}
                name={salon.salons?.name ?? salon.name}
                city={salon.city}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ─── Sección E: Ofertas Especiales ────────────────────────────────────────────

function OfferCard({ offer, index }: { offer: { id: string; name: string; location_id: string }; index: number }) {
  const isGold = index % 2 === 0
  return (
    <View className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] flex-row items-center p-[18px] gap-4">
      <View
        className={`w-12 h-12 rounded-[14px] items-center justify-center shrink-0 ${isGold ? 'bg-gold shadow-[0_6px_12px_rgba(212,175,55,0.45)]' : 'bg-premium-black shadow-[0_4px_8px_rgba(0,0,0,0.3)]'}`}
      >
        <H1 className="font-manrope-extrabold text-[18px] text-premium-white">{isGold ? '%' : '🎀'}</H1>
      </View>
      <View className="flex-1">
        <Body className="font-manrope-bold text-[13px] text-premium-black leading-[18px]">{offer.name}</Body>
      </View>
      <H2 className={`font-manrope-bold text-[22px] ${isGold ? 'text-gold' : 'text-[#E5E5E5]'}`}>›</H2>
    </View>
  )
}

function SpecialOffersSection() {
  const { data: campaigns, loading } = useActiveCampaigns()

  return (
    <View className="px-5 mt-7">
      <SectionHeader title="OFERTAS ESPECIALES" />
      {loading ? (
        <LoadingSpinner className="py-6 items-center" />
      ) : campaigns.length === 0 ? (
        <View className="bg-premium-white rounded-[24px] border border-[#F5F5F5] shadow-[0_10px_25px_rgba(0,0,0,0.12)] p-5 items-center gap-[14px]">
          <Body className="font-manrope-medium text-[13px] text-premium-gray text-center">Sin ofertas activas ahora mismo</Body>
        </View>
      ) : (
        <View className="gap-[14px]">
          {campaigns.map((campaign, index) => (
            <OfferCard key={campaign.id} offer={campaign} index={index} />
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Pantalla principal ────────────────────────────────────────────────────────

export default function HomeScreen() {
  return (
    <ScreenLayout header="brand" scrollable={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-8"
      >
        {/* A: Buscador */}
        <SearchBar />

        {/* B: Próxima Cita */}
        <NextAppointmentSection />

        {/* C: Tu Salón */}
        <MySalonSection />

        {/* D: Disponible Hoy */}
        <AvailableTodaySection />

        {/* E: Ofertas Especiales */}
        <SpecialOffersSection />
      </ScrollView>
      <TutorialModal />
    </ScreenLayout>
  )
}
