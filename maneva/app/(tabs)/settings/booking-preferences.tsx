import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { Body, Caption, H1, H2 } from '@/components/ui/Typography'
import { IconAdd, IconBack, IconClose, IconStar, IconTrash } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { useUserStyleProfile } from '@/hooks/useUserStyleProfile'

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

const DEFAULT_AVAILABILITY_START = 9 * 60
const DEFAULT_AVAILABILITY_END = 20 * 60
const AVAILABILITY_STEP_MINUTES = 30
const AVAILABILITY_WHEEL_ITEM_HEIGHT = 48
const AVAILABILITY_WHEEL_VISIBLE_ITEMS = 5

const AVAILABILITY_TIME_OPTIONS = Array.from({ length: (24 * 60) / AVAILABILITY_STEP_MINUTES }, (_, index) =>
  index * AVAILABILITY_STEP_MINUTES,
)

function formatTimeFromMinutes(totalMinutes: number) {
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60)
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function parseAvailabilityRange(range: string) {
  const [start, end] = range.split(' - ').map((part) => part.trim())

  const parseTime = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
    return hours * 60 + minutes
  }

  const startMinutes = start ? parseTime(start) : null
  const endMinutes = end ? parseTime(end) : null

  return {
    startMinutes: startMinutes ?? DEFAULT_AVAILABILITY_START,
    endMinutes: endMinutes ?? DEFAULT_AVAILABILITY_END,
  }
}

function createDateFromMinutes(totalMinutes: number) {
  const date = new Date()
  date.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0)
  return date
}

function dateToMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

function nearestAvailabilityMinutes(totalMinutes: number) {
  const clamped = Math.max(0, Math.min(totalMinutes, 24 * 60 - AVAILABILITY_STEP_MINUTES))
  return Math.round(clamped / AVAILABILITY_STEP_MINUTES) * AVAILABILITY_STEP_MINUTES
}

function minutesToWheelIndex(totalMinutes: number) {
  return Math.round(totalMinutes / AVAILABILITY_STEP_MINUTES)
}

function wheelIndexToMinutes(index: number) {
  return index * AVAILABILITY_STEP_MINUTES
}

function TimeWheel({
  value,
  onChange,
}: {
  value: number
  onChange: (nextValue: number) => void
}) {
  const listRef = useRef<FlatList<number>>(null)
  const currentIndex = minutesToWheelIndex(value)

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: currentIndex, animated: false })
    })
  }, [currentIndex])

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y
    const rawIndex = Math.round(offsetY / AVAILABILITY_WHEEL_ITEM_HEIGHT)
    const nextMinutes = wheelIndexToMinutes(rawIndex)
    onChange(nextMinutes)
  }

  return (
    <View className="relative w-full">
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 top-1/2 -mt-6 z-0 h-12 rounded-[18px] border border-[#E4D39C] bg-[#F9F7F0]"
      />
      <FlatList
        ref={listRef}
        data={AVAILABILITY_TIME_OPTIONS}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        snapToInterval={AVAILABILITY_WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: AVAILABILITY_WHEEL_ITEM_HEIGHT,
          offset: AVAILABILITY_WHEEL_ITEM_HEIGHT * index,
          index,
        })}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleMomentumEnd}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: info.index, animated: false })
          }, 50)
        }}
        contentContainerStyle={{
          paddingVertical: AVAILABILITY_WHEEL_ITEM_HEIGHT * 2,
        }}
        style={{
          maxHeight: AVAILABILITY_WHEEL_ITEM_HEIGHT * AVAILABILITY_WHEEL_VISIBLE_ITEMS,
          position: 'relative',
          zIndex: 1,
        }}
        renderItem={({ item }) => {
          const isSelected = item === value
          return (
            <View
              className={`items-center justify-center rounded-[12px] ${isSelected ? 'bg-[#F9F7F0]' : 'bg-transparent'}`}
              style={{
                height: AVAILABILITY_WHEEL_ITEM_HEIGHT,
                position: 'relative',
                zIndex: isSelected ? 20 : 0,
                overflow: 'visible',
              }}
            >
              <Caption
                className={`font-manrope-extrabold text-[20px] tracking-[2px] ${isSelected ? 'text-[#D0A52B]' : 'text-[#8A94A6]'}`}
                style={{
                  position: 'relative',
                  zIndex: 30,
                }}
              >
                {formatTimeFromMinutes(item)}
              </Caption>
            </View>
          )
        }}
      />
    </View>
  )
}

function BrandHeader() {
  const router = useRouter()

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
      return
    }

    router.replace('/(tabs)/settings')
  }

  return (
    <View className="bg-premium-white border-b border-[#ECECEC] px-5 py-5 flex-row items-center justify-center">
      <TouchableOpacity onPress={handleBack} className="absolute left-5">
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

function CustomAvailabilityRow({
  range,
  index,
  isActive,
  isDeleteMode,
  onActivate,
  onLongPress,
  onDelete,
}: {
  range: string
  index: number
  isActive: boolean
  isDeleteMode: boolean
  onActivate: () => void
  onLongPress: () => void
  onDelete: () => void
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onLongPress={onLongPress}>
      <ItemRow
        right={
          isDeleteMode ? (
            <TouchableOpacity
              onPress={onDelete}
              activeOpacity={0.75}
              className="w-10 h-10 rounded-full items-center justify-center bg-[#FDECEC]"
            >
              <IconTrash size={20} color="#EF4444" strokeWidth={2.2} />
            </TouchableOpacity>
          ) : (
            <Switch
              value={isActive}
              onValueChange={onActivate}
              trackColor={{ false: '#D9DDE2', true: Colors.gold.light }}
              thumbColor={isActive ? Colors.gold.DEFAULT : '#FFFFFF'}
              ios_backgroundColor="#D9DDE2"
            />
          )
        }
      >
        <View className="flex-row items-center gap-3">
          <Body className="font-manrope-medium text-[16px] text-premium-black">Personalizada {index + 1}</Body>
          <Caption className="font-manrope text-[16px] text-[#94A3B8]">{range}</Caption>
        </View>
      </ItemRow>
    </TouchableOpacity>
  )
}

export default function BookingPreferencesScreen() {
  const {
    preferredHour,
    preferredTimeSlot,
    availabilityRanges,
    activeAvailabilityRange,
    services,
    savePreferredHour,
    savePreferredTimeSlot,
    saveAvailabilityRange,
    activateAvailabilityRange,
    deleteAvailabilityRange,
    saveServices,
  } = useUserStyleProfile()
  const [servicesDraft, setServicesDraft] = useState<string[]>([])
  const [savingServices, setSavingServices] = useState(false)
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false)
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)
  const [availabilityPickerStep, setAvailabilityPickerStep] = useState<'start' | 'end'>('start')
  const [availabilityStartMinutes, setAvailabilityStartMinutes] = useState(DEFAULT_AVAILABILITY_START)
  const [availabilityEndMinutes, setAvailabilityEndMinutes] = useState(DEFAULT_AVAILABILITY_END)
  const [customDeleteModeRange, setCustomDeleteModeRange] = useState('')

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
    if (preferredTimeSlot === 'custom') return 'custom'
    if (preferredTimeSlot === 'morning' || preferredTimeSlot === 'afternoon') return preferredTimeSlot

    const hour = preferredHour
    if (!hour) return 'morning'
    return hour >= 16 ? 'afternoon' : 'morning'
  }, [preferredHour, preferredTimeSlot])

  const handleSelectSlot = async (slot: 'morning' | 'afternoon') => {
    const preferredHour = slot === 'morning' ? 9 : 16
    try {
      setCustomDeleteModeRange('')
      await savePreferredHour(preferredHour)
      await savePreferredTimeSlot(slot)
    } catch {
      Alert.alert('Error', 'No se pudo guardar el horario preferido.')
    }
  }

  const handleSelectCustomSlot = async (range: string) => {
    try {
      setCustomDeleteModeRange('')
      await activateAvailabilityRange(range)
    } catch {
      Alert.alert('Error', 'No se pudo activar el horario personalizado.')
    }
  }

  const handleLongPressCustomSlot = (range: string) => {
    setCustomDeleteModeRange(range)
  }

  const handleDeleteCustomSlot = (range: string) => {
    Alert.alert(
      'Eliminar horario personalizado',
      `¿Seguro que quieres eliminar ${range}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void deleteAvailabilityRange(range)
            setCustomDeleteModeRange('')
          },
        },
      ],
    )
  }

  const handleFavoriteStylist = () => {
    // TODO: conectar selección real de estilistas favoritos desde Supabase
    Alert.alert('Próximamente', 'La selección de estilistas favoritos estará disponible en una próxima iteración.')
  }

  const handleOpenAvailabilityPopup = () => {
    const parsed = parseAvailabilityRange(activeAvailabilityRange || availabilityRanges.at(-1) || '')
    setAvailabilityStartMinutes(parsed.startMinutes)
    setAvailabilityEndMinutes(parsed.endMinutes)
    setAvailabilityPickerStep('start')
    setIsAvailabilityModalOpen(true)
  }

  const handleSaveAvailabilityRange = async () => {
    try {
      const startMinutes = nearestAvailabilityMinutes(availabilityStartMinutes)
      const endMinutes = nearestAvailabilityMinutes(availabilityEndMinutes)

      if (endMinutes <= startMinutes) {
        Alert.alert('Rango inválido', 'La hora de fin debe ser posterior a la hora de comienzo.')
        return
      }

      const range = `${formatTimeFromMinutes(startMinutes)} - ${formatTimeFromMinutes(endMinutes)}`
      await saveAvailabilityRange(range)
      setCustomDeleteModeRange('')
      setIsAvailabilityModalOpen(false)
    } catch {
      Alert.alert('Error', 'No se pudo guardar la disponibilidad.')
    }
  }

  const handleAvailabilityConfirm = () => {
    if (availabilityPickerStep === 'start') {
      setAvailabilityPickerStep('end')
      return
    }

    void handleSaveAvailabilityRange()
  }

  const handleAvailabilityWheelChange = (step: 'start' | 'end') => (nextMinutes: number) => {
    const sanitizedMinutes = nearestAvailabilityMinutes(nextMinutes)

    if (step === 'start') {
      setAvailabilityStartMinutes(sanitizedMinutes)
      if (sanitizedMinutes >= availabilityEndMinutes) {
        const nextEnd = Math.min(sanitizedMinutes + AVAILABILITY_STEP_MINUTES, 24 * 60 - AVAILABILITY_STEP_MINUTES)
        setAvailabilityEndMinutes(nextEnd)
      }
      return
    }

    setAvailabilityEndMinutes(sanitizedMinutes)
    if (sanitizedMinutes <= availabilityStartMinutes) {
      const nextStart = Math.max(sanitizedMinutes - AVAILABILITY_STEP_MINUTES, 0)
      setAvailabilityStartMinutes(nextStart)
    }
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
      setIsAddServiceOpen(false)
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
          <H2 className="font-manrope-bold text-[30px] leading-[36px] text-premium-black">Preferencias de cita</H2>
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

        <View className="bg-premium-white border-b border-[#ECECEC]">
          <TouchableOpacity
            onPress={() => setIsAddServiceOpen((prev) => !prev)}
            activeOpacity={0.8}
            className="flex-row items-center gap-3 px-6 py-4"
          >
            <View className="w-5 h-5 rounded-full bg-gold items-center justify-center">
              <IconAdd size={11} color={Colors.premium.white} strokeWidth={3} />
            </View>
            <Caption className="font-manrope-extrabold text-[14px] tracking-[0.8px] text-[#D0A52B]">
              Añadir servicio
            </Caption>
          </TouchableOpacity>

          {isAddServiceOpen ? (
            <View className="px-6 pb-5 gap-3">
              <View className="flex-row flex-wrap gap-2">
                {availableServiceOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => handleAddServiceOption(option)}
                    activeOpacity={0.78}
                    className="px-3 py-2 rounded-full border border-[#E4D39C] bg-[#F9F7F0]"
                  >
                    <Caption className="font-manrope-extrabold text-[11px] text-[#D0A52B]">{option}</Caption>
                  </TouchableOpacity>
                ))}
              </View>
              {availableServiceOptions.length === 0 ? (
                <Body className="text-[14px] text-[#6B7280]">Ya has seleccionado todas las opciones disponibles.</Body>
              ) : null}
            </View>
          ) : null}

          {servicesDirty ? (
            <View className="px-6 pb-5">
              <TouchableOpacity
                onPress={() => {
                  void handleSaveServices()
                }}
                disabled={savingServices}
                activeOpacity={0.8}
                className={`self-start rounded-[10px] border border-premium-black px-3 py-2 ${savingServices ? 'opacity-60' : ''}`}
              >
                <Caption className="font-manrope-extrabold text-[10px] tracking-[1.4px] uppercase text-premium-black">
                  {savingServices ? 'Guardando...' : 'Guardar cambios'}
                </Caption>
              </TouchableOpacity>
            </View>
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
        {availabilityRanges.map((range, index) => {
          const isActive = selectedSlot === 'custom' && activeAvailabilityRange === range
          const isDeleteMode = customDeleteModeRange === range

          return (
            <CustomAvailabilityRow
              key={`${range}-${index}`}
              range={range}
              index={index}
              isActive={isActive}
              isDeleteMode={isDeleteMode}
              onLongPress={() => handleLongPressCustomSlot(range)}
              onActivate={() => {
                void handleSelectCustomSlot(range)
              }}
              onDelete={() => handleDeleteCustomSlot(range)}
            />
          )
        })}

        <View className="bg-premium-white border-b border-[#ECECEC]">
          <TouchableOpacity
            onPress={handleOpenAvailabilityPopup}
            activeOpacity={0.8}
            className="flex-row items-center gap-3 px-6 py-4"
          >
            <View className="w-5 h-5 rounded-full bg-gold items-center justify-center">
              <IconAdd size={11} color={Colors.premium.white} strokeWidth={3} />
            </View>
            <Caption className="font-manrope-extrabold text-[14px] tracking-[0.8px] text-[#D0A52B]">
              Añadir hora personalizada
            </Caption>
          </TouchableOpacity>
        </View>

        <Modal visible={isAvailabilityModalOpen} transparent animationType="fade" onRequestClose={() => setIsAvailabilityModalOpen(false)}>
          <View className="flex-1 bg-black/40 items-center justify-center px-5 py-10">
            <View className="w-full rounded-[28px] bg-premium-white border border-[#ECECEC] overflow-hidden">
              <View className="px-5 pt-5 pb-4 flex-row items-center">
                <TouchableOpacity
                  onPress={() => setIsAvailabilityModalOpen(false)}
                  activeOpacity={0.75}
                  className="w-11 h-11 rounded-full border border-[#ECECEC] items-center justify-center bg-premium-white"
                >
                  <IconBack size={24} color={Colors.premium.black} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              <View className="px-5 pb-4 items-center">
                <H2 className="font-manrope-bold text-[28px] leading-[34px] text-premium-black text-center">
                  {availabilityPickerStep === 'start' ? 'Hora de inicio' : 'Hora de fin'}
                </H2>
              </View>

              <View className="px-5 pb-4">
                <View className="rounded-[26px] bg-[#FBFBFB] border border-[#ECECEC] overflow-hidden px-2 py-3">
                  <TimeWheel
                    value={availabilityPickerStep === 'start' ? availabilityStartMinutes : availabilityEndMinutes}
                    onChange={handleAvailabilityWheelChange(availabilityPickerStep)}
                  />
                </View>
              </View>

              <View className="px-5 pb-4">
                <View className="rounded-[18px] bg-[#F4F4F4] px-4 py-4">
                  <Body className="font-manrope-medium text-[13px] text-[#6B7280]">
                    Hora seleccionada:
                  </Body>
                  <Body className="mt-2 font-manrope-extrabold text-[16px] text-[#D0A52B]">
                    {availabilityPickerStep === 'start'
                      ? `${formatTimeFromMinutes(availabilityStartMinutes)} - --:--`
                      : `${formatTimeFromMinutes(availabilityStartMinutes)} - ${formatTimeFromMinutes(availabilityEndMinutes)}`}
                  </Body>
                </View>
              </View>

              {availabilityPickerStep === 'start' ? (
                <View className="px-5 pb-5">
                  <TouchableOpacity
                    onPress={() => setAvailabilityPickerStep('end')}
                    activeOpacity={0.8}
                    className="h-12 rounded-full bg-gold items-center justify-center"
                  >
                    <Caption className="font-manrope-extrabold text-[13px] tracking-[2px] uppercase text-[#000000]">
                      Continuar
                    </Caption>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="px-5 pb-5 gap-3">
                  <TouchableOpacity
                    onPress={() => {
                      void handleSaveAvailabilityRange()
                    }}
                    activeOpacity={0.8}
                    className="h-12 rounded-full bg-gold items-center justify-center"
                  >
                    <Caption className="font-manrope-extrabold text-[13px] tracking-[2px] uppercase text-[#000000]">
                      Guardar hora personalizada
                    </Caption>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

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
