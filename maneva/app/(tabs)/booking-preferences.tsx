import React, { useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, Switch, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { Body, Caption, H1, H2 } from '@/components/ui/Typography'
import { IconBack, IconClose, IconStar } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { useUserStyleProfile } from '@/hooks/useUserStyleProfile'
import { Button } from '@/components/ui/Button'

const SERVICE_OPTIONS = [
  'Corte y peinado',
  'Barba',
  'Tinte premium',
  'Balayage',
  'Color',
  'Mechas',
  'Alisado',
  'Recogido',
  'Tratamiento capilar',
] as const

const TIME_OPTIONS = [
  { key: 'morning', label: 'Mañanas', slot: '09:00 - 13:00' },
  { key: 'afternoon', label: 'Tardes', slot: '16:00 - 20:00' },
] as const

function BrandHeader() {
  const router = useRouter()

  return (
    <View className="bg-premium-white border-b border-[#ECECEC] px-5 py-5 flex-row items-center justify-center">
      <TouchableOpacity onPress={() => router.replace('./settings')} className="absolute left-5">
        <IconBack size={28} color={Colors.premium.black} strokeWidth={2.2} />
      </TouchableOpacity>
      <H1 className="font-manrope-extrabold text-[18px] tracking-[6px] text-premium-black">MANEVA</H1>
    </View>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Caption className="px-6 py-5 font-manrope-extrabold text-[11px] tracking-[3.2px] uppercase text-[#9CA3AF] border-y border-[#ECECEC] bg-premium-white">
      {title}
    </Caption>
  )
}

function ItemRow({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View className="px-6 py-6 bg-premium-white border-b border-[#ECECEC] flex-row items-center justify-between">
      <View className="flex-1 pr-4">{children}</View>
      {right}
    </View>
  )
}

export default function BookingPreferencesScreen() {
  const { styleProfile, services, saveStyleProfile, saveServices } = useUserStyleProfile()
  const [servicesDraft, setServicesDraft] = useState<string[]>([])
  const [savingServices, setSavingServices] = useState(false)

  useEffect(() => {
    setServicesDraft(services)
  }, [services])

  const servicesDirty = useMemo(() => {
    const normalize = (items: string[]) =>
      [...items].map((item) => item.trim().toLowerCase()).filter(Boolean).sort().join('|')
    return normalize(servicesDraft) !== normalize(services)
  }, [servicesDraft, services])

  const availableServiceOptions = useMemo(() => {
    const selected = new Set(servicesDraft.map((item) => item.trim().toLowerCase()))
    return SERVICE_OPTIONS.filter((option) => !selected.has(option.toLowerCase()))
  }, [servicesDraft])

  const selectedSlot = useMemo(() => {
    const hour = styleProfile?.preferred_hour
    if (!hour) return 'morning'
    return hour >= 16 ? 'afternoon' : 'morning'
  }, [styleProfile?.preferred_hour])

  const handleSelectSlot = async (slot: 'morning' | 'afternoon') => {
    const preferredHour = slot === 'morning' ? 9 : 16
    try {
      await saveStyleProfile({ preferred_hour: preferredHour })
    } catch {
      Alert.alert('Error', 'No se pudo guardar el horario preferido.')
    }
  }

  const handleFavoriteStylist = () => {
    // TODO: conectar selección real de estilistas favoritos desde Supabase
    Alert.alert('Próximamente', 'La selección de estilistas favoritos estará disponible en una próxima iteración.')
  }

  const handleRemoveService = (service: string) => {
    setServicesDraft((prev) => prev.filter((item) => item !== service))
  }

  const handleAddServiceOption = (service: string) => {
    setServicesDraft((prev) => [...prev, service])
  }

  const handleSaveServices = async () => {
    setSavingServices(true)
    try {
      await saveServices(servicesDraft)
      Alert.alert('Guardado', 'Tus servicios favoritos se han actualizado.')
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los servicios favoritos.')
    } finally {
      setSavingServices(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft" edges={['top']}>
      <BrandHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>
        <View className="px-6 py-8 bg-premium-white">
          <H2 className="font-manrope-bold text-[36px] leading-[42px] text-premium-black">Preferencias de cita</H2>
          <Caption className="mt-2 font-manrope-semibold text-[14px] tracking-[2.6px] uppercase text-[#9CA3AF]">
            Personaliza tu experiencia
          </Caption>
        </View>

        <SectionTitle title="Servicios favoritos" />
        {servicesDraft.map((service) => (
          <ItemRow
            key={service}
            right={(
              <TouchableOpacity onPress={() => handleRemoveService(service)} activeOpacity={0.7}>
                <IconClose size={20} color="#EF4444" strokeWidth={2.2} />
              </TouchableOpacity>
            )}
          >
            <Body className="font-manrope-medium text-[16px] text-premium-black">{service}</Body>
          </ItemRow>
        ))}
        {servicesDraft.length === 0 ? (
          <View className="px-6 py-6 bg-premium-white border-b border-[#ECECEC]">
            <Body className="text-[15px] text-[#6B7280]">No tienes servicios favoritos todavía.</Body>
          </View>
        ) : null}

        <View className="px-6 py-5 bg-premium-white border-b border-[#ECECEC] gap-3">
          <Caption className="font-manrope-extrabold text-[11px] tracking-[2.2px] uppercase text-[#9CA3AF]">
            Añadir servicio desde opciones
          </Caption>
          <View className="flex-row flex-wrap gap-2">
            {availableServiceOptions.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => handleAddServiceOption(option)}
                activeOpacity={0.78}
                className="px-3 py-2 rounded-full border border-[#E4D39C] bg-[#F9F7F0]"
              >
                <Caption className="font-manrope-extrabold text-[11px] text-gold">{option}</Caption>
              </TouchableOpacity>
            ))}
          </View>
          {availableServiceOptions.length === 0 ? (
            <Body className="text-[14px] text-[#6B7280]">Ya has seleccionado todas las opciones disponibles.</Body>
          ) : null}
          {servicesDirty ? (
            <Button onPress={handleSaveServices} size="sm" loading={savingServices} disabled={savingServices} variant="secondary">
              Guardar cambios
            </Button>
          ) : null}
        </View>

        <View className="h-5 bg-[#F1F1F1]" />

        <SectionTitle title="Horarios preferidos" />
        {TIME_OPTIONS.map((option) => {
          const active = selectedSlot === option.key
          return (
            <ItemRow
              key={option.key}
              right={
                <Switch
                  value={active}
                  onValueChange={() => handleSelectSlot(option.key)}
                  trackColor={{ false: '#D9DDE2', true: Colors.gold.light }}
                  thumbColor={active ? Colors.gold.DEFAULT : '#FFFFFF'}
                  ios_backgroundColor="#D9DDE2"
                />
              }
            >
              <View className="flex-row items-center gap-3">
                <Body className="font-manrope-medium text-[16px] text-premium-black">{option.label}</Body>
                <Caption className="font-manrope text-[16px] text-[#94A3B8]">{option.slot}</Caption>
              </View>
            </ItemRow>
          )
        })}
        <TouchableOpacity disabled activeOpacity={0.8} className="px-6 py-6 bg-premium-white border-b border-[#ECECEC] opacity-60">
          <Caption className="font-manrope-extrabold text-[18px] text-gold">Añadir hora personalizada</Caption>
        </TouchableOpacity>

        <View className="h-5 bg-[#F1F1F1]" />

        <SectionTitle title="Estilistas de preferencia" />
        <TouchableOpacity onPress={handleFavoriteStylist} activeOpacity={0.75}>
          <ItemRow right={<IconStar size={22} color={Colors.gold.DEFAULT} fill={Colors.gold.DEFAULT} strokeWidth={1.6} />}>
            <Body className="font-manrope-medium text-[16px] text-premium-black">Marco Polo</Body>
          </ItemRow>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleFavoriteStylist} activeOpacity={0.75}>
          <ItemRow right={<IconStar size={22} color={Colors.gold.DEFAULT} fill={Colors.gold.DEFAULT} strokeWidth={1.6} />}>
            <Body className="font-manrope-medium text-[16px] text-premium-black">Elena Sanz</Body>
          </ItemRow>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
