import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
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
import { Body, Caption, H2 } from '@/components/ui/Typography'
import { IconAdd, IconBack, IconClose, IconStar, IconTrash } from '@/components/ui/icons'
import { BrandHeader } from '@/components/ui/BrandHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useUserStyleProfile } from '@/hooks/useUserStyleProfile'
import { useFavoriteStylists } from '@/hooks/useFavoriteStylists'
import { StylistPickerSheet } from '@/components/ui/StylistPickerSheet'

const SERVICE_OPTIONS = [
  'Corte e peiteado',
  'Barba',
  'Tinte premium',
  'Balayage',
  'Cor',
  'Mechas',
  'Alisado',
  'Recollido',
  'Tratamento capilar',
] as const

const TIME_OPTIONS = [
  { key: 'morning', label: 'Mañás', slot: '09:00 - 13:00' },
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
        className="absolute left-0 right-0 top-1/2 -mt-6 z-0 h-12 rounded-[18px] border border-gold-border dark:border-gold-dark bg-gold-bg-soft dark:bg-gold-surface-dark"
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
              className={`items-center justify-center rounded-[12px] ${isSelected ? 'bg-gold-bg-soft dark:bg-gold-surface-dark' : 'bg-transparent'}`}
              style={{
                height: AVAILABILITY_WHEEL_ITEM_HEIGHT,
                position: 'relative',
                zIndex: isSelected ? 20 : 0,
                overflow: 'visible',
              }}
            >
              <Caption
                className={`font-manrope-extrabold text-[20px] tracking-[2px] ${isSelected ? 'text-gold' : 'text-foreground-subtle dark:text-foreground-subtle-dark'}`}
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

function SectionTitle({ title }: { title: string }) {
  return (
    <Caption className="px-6 py-5 font-manrope-extrabold text-[11px] tracking-[3.2px] uppercase text-foreground-subtle dark:text-foreground-subtle-dark border-y border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
      {title}
    </Caption>
  )
}

function ItemRow({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View className="px-6 py-6 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark flex-row items-center justify-between">
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
  const themeColors = useThemeColors()
  return (
    <TouchableOpacity activeOpacity={0.85} onLongPress={onLongPress}>
      <ItemRow
        right={
          isDeleteMode ? (
            <TouchableOpacity
              onPress={onDelete}
              activeOpacity={0.75}
              className="w-10 h-10 rounded-full items-center justify-center bg-error-bg"
            >
              <IconTrash size={20} color={themeColors.error.DEFAULT} strokeWidth={2.2} />
            </TouchableOpacity>
          ) : (
            <Switch
              value={isActive}
              onValueChange={onActivate}
              trackColor={{ false: themeColors.premium.divider.switch, true: themeColors.gold.light }}
              thumbColor={isActive ? themeColors.gold.DEFAULT : themeColors.premium.white}
              ios_backgroundColor={themeColors.premium.divider.switch}
            />
          )
        }
      >
        <View className="flex-row items-center gap-3">
          <Body className="font-manrope-medium text-[16px] text-foreground dark:text-foreground-dark">Personalizada {index + 1}</Body>
          <Caption className="font-manrope text-[16px] text-foreground-muted dark:text-foreground-muted-dark-caption">{range}</Caption>
        </View>
      </ItemRow>
    </TouchableOpacity>
  )
}

export default function BookingPreferencesScreen() {
  const themeColors = useThemeColors()
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

  const {
    employees,
    favoriteIds,
    loading: stylistsLoading,
    error: stylistsError,
    toggle: toggleFavorite,
  } = useFavoriteStylists()
  const [isStylistSheetOpen, setIsStylistSheetOpen] = useState(false)
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

  const [dialog, setDialog] = useState<{
    title: string; message?: string; confirmLabel?: string
    cancelLabel?: string; destructive?: boolean; onConfirm: () => void
  } | null>(null)
  const closeDialog = () => setDialog(null)

  const handleSelectSlot = async (slot: 'morning' | 'afternoon') => {
    const preferredHour = slot === 'morning' ? 9 : 16
    try {
      setCustomDeleteModeRange('')
      await savePreferredHour(preferredHour)
      await savePreferredTimeSlot(slot)
    } catch {
      setDialog({ title: 'Erro', message: 'Non se puido gardar o horario preferido.', onConfirm: closeDialog })
    }
  }

  const handleSelectCustomSlot = async (range: string) => {
    try {
      setCustomDeleteModeRange('')
      await activateAvailabilityRange(range)
    } catch {
      setDialog({ title: 'Erro', message: 'Non se puido activar o horario personalizado.', onConfirm: closeDialog })
    }
  }

  const handleLongPressCustomSlot = (range: string) => {
    setCustomDeleteModeRange(range)
  }

  const handleDeleteCustomSlot = (range: string) => {
    setDialog({
      title: 'Eliminar horario',
      message: `Seguro que queres eliminar ${range}?`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: () => {
        closeDialog()
        void deleteAvailabilityRange(range)
        setCustomDeleteModeRange('')
      },
    })
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
        setDialog({ title: 'Intervalo non válido', message: 'A hora de fin debe ser posterior á hora de comezo.', onConfirm: closeDialog })
        return
      }

      const range = `${formatTimeFromMinutes(startMinutes)} - ${formatTimeFromMinutes(endMinutes)}`
      await saveAvailabilityRange(range)
      setCustomDeleteModeRange('')
      setIsAvailabilityModalOpen(false)
    } catch {
      setDialog({ title: 'Erro', message: 'Non se puido gardar a dispoñibilidade.', onConfirm: closeDialog })
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
      setDialog({ title: 'Gardado', message: 'Os teus servizos favoritos actualizáronse.', onConfirm: closeDialog })
    } catch {
      setDialog({ title: 'Erro', message: 'Non se puideron gardar os servizos favoritos.', onConfirm: closeDialog })
    } finally {
      setSavingServices(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <BrandHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>
        <View className="px-6 py-8 bg-surface dark:bg-surface-dark">
          <H2 className="font-manrope-bold text-[30px] leading-[36px] text-foreground dark:text-foreground-dark">Preferencias de cita</H2>
          <Caption className="mt-2 font-manrope-semibold text-[14px] tracking-[2.6px] uppercase text-foreground-subtle dark:text-foreground-subtle-dark">
            Personaliza a túa experiencia
          </Caption>
        </View>

        <SectionTitle title="Servizos favoritos" />
        {servicesDraft.map((service) => (
          <ItemRow
            key={service}
            right={(
              <TouchableOpacity onPress={() => handleRemoveService(service)} activeOpacity={0.7}>
                <IconClose size={20} color={themeColors.error.DEFAULT} strokeWidth={2.2} />
              </TouchableOpacity>
            )}
          >
            <Body className="font-manrope-medium text-[16px] text-foreground dark:text-foreground-dark">{service}</Body>
          </ItemRow>
        ))}
        {servicesDraft.length === 0 ? (
          <View className="px-6 py-6 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark">
            <Body className="text-[15px] text-foreground-muted dark:text-foreground-muted-dark">Aínda non tes servizos favoritos.</Body>
          </View>
        ) : null}

        <View className="bg-surface dark:bg-surface-dark">
          <TouchableOpacity
            onPress={() => setIsAddServiceOpen((prev) => !prev)}
            activeOpacity={0.8}
            className="flex-row items-center gap-3 px-6 py-4"
          >
            <View className="w-5 h-5 rounded-full bg-gold items-center justify-center">
              <IconAdd size={11} color={themeColors.premium.white} strokeWidth={3} />
            </View>
            <Caption className="font-manrope-extrabold text-[14px] tracking-[0.8px] text-gold">
              Engadir servizo
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
                    className="px-3 py-2 rounded-full border border-gold-border dark:border-gold-dark bg-gold-bg-soft dark:bg-gold-surface-dark"
                  >
                    <Caption className="font-manrope-extrabold text-[11px] text-gold">{option}</Caption>
                  </TouchableOpacity>
                ))}
              </View>
              {availableServiceOptions.length === 0 ? (
                <Body className="text-[14px] text-foreground-muted dark:text-foreground-muted-dark">Xa seleccionaches todas as opcións dispoñibles.</Body>
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
                <Caption className="font-manrope-extrabold text-[10px] tracking-[1.4px] uppercase text-foreground dark:text-foreground-dark">
                  {savingServices ? 'Gardando...' : 'Gardar cambios'}
                </Caption>
              </TouchableOpacity>
            </View>
          ) : null}
          <View className="h-px bg-border dark:bg-border-dark" />
        </View>

        <View className="h-5 bg-surface-raised dark:bg-surface-raised-dark" />

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
                  trackColor={{ false: themeColors.premium.divider.switch, true: themeColors.gold.light }}
                  thumbColor={active ? themeColors.gold.DEFAULT : themeColors.premium.white}
                  ios_backgroundColor={themeColors.premium.divider.switch}
                />
              }
            >
              <View className="flex-row items-center gap-3">
                <Body className="font-manrope-medium text-[16px] text-foreground dark:text-foreground-dark">{option.label}</Body>
                <Caption className="font-manrope text-[16px] text-foreground-muted dark:text-foreground-muted-dark-caption">{option.slot}</Caption>
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

        <View className="bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark">
          <TouchableOpacity
            onPress={handleOpenAvailabilityPopup}
            activeOpacity={0.8}
            className="flex-row items-center gap-3 px-6 py-4"
          >
            <View className="w-5 h-5 rounded-full bg-gold items-center justify-center">
              <IconAdd size={11} color={themeColors.premium.white} strokeWidth={3} />
            </View>
              <Caption className="font-manrope-extrabold text-[14px] tracking-[0.8px] text-gold">
                Engadir hora personalizada
            </Caption>
          </TouchableOpacity>
        </View>

        <Modal visible={isAvailabilityModalOpen} transparent animationType="fade" onRequestClose={() => setIsAvailabilityModalOpen(false)}>
          <View className="flex-1 bg-black/40 items-center justify-center px-5 py-10">
            <View className="w-full rounded-[28px] bg-surface dark:bg-surface-dark border border-border dark:border-border-dark overflow-hidden">
              <View className="px-5 pt-5 pb-4 flex-row items-center">
                <TouchableOpacity
                  onPress={() => setIsAvailabilityModalOpen(false)}
                  activeOpacity={0.75}
                  className="w-11 h-11 rounded-full border border-border dark:border-border-dark items-center justify-center bg-surface dark:bg-surface-dark"
                >
                  <IconBack size={24} color={themeColors.premium.black} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              <View className="px-5 pb-4 items-center">
                <H2 className="font-manrope-bold text-[28px] leading-[34px] text-foreground dark:text-foreground-dark text-center">
                  {availabilityPickerStep === 'start' ? 'Hora de comezo' : 'Hora de fin'}
                </H2>
              </View>

              <View className="px-5 pb-4">
                <View className="rounded-[26px] bg-surface-raised dark:bg-surface-raised-dark-pale border border-border dark:border-border-dark overflow-hidden px-2 py-3">
                  <TimeWheel
                    value={availabilityPickerStep === 'start' ? availabilityStartMinutes : availabilityEndMinutes}
                    onChange={handleAvailabilityWheelChange(availabilityPickerStep)}
                  />
                </View>
              </View>

              <View className="px-5 pb-4">
                <View className="rounded-[18px] bg-surface-overlay dark:bg-surface-overlay-dark px-4 py-4">
                  <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark">
                    Hora seleccionada:
                  </Body>
                  <Body className="mt-2 font-manrope-extrabold text-[16px] text-gold">
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
                    <Caption className="font-manrope-extrabold text-[13px] tracking-[2px] uppercase text-premium-white dark:text-premium-white">
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
                    <Caption className="font-manrope-extrabold text-[13px] tracking-[2px] uppercase text-premium-white dark:text-premium-white">
                      Gardar hora personalizada
                    </Caption>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <View className="h-5 bg-surface-raised dark:bg-surface-raised-dark" />

        <SectionTitle title="Estilistas preferidos" />
        {stylistsError ? (
          <ErrorMessage message={stylistsError} className="mx-6 mb-2" />
        ) : null}

        {/* Favoritos actuales */}
        {favoriteIds
          .map((id) => employees.find((e) => e.id === id))
          .filter(Boolean)
          .map((employee) => {
            const name = [employee!.users?.first_name, employee!.users?.last_name]
              .filter(Boolean).join(' ') || 'Estilista'
            return (
              <TouchableOpacity
                key={employee!.id}
                onPress={() => { void toggleFavorite(employee!.id) }}
                activeOpacity={0.75}
              >
                <ItemRow
                  right={
                    <IconClose size={18} color={themeColors.error.DEFAULT} strokeWidth={2.2} />
                  }
                >
                  <View>
                    <Body className="font-manrope-medium text-[16px] text-foreground dark:text-foreground-dark">{name}</Body>
                    {employee!.position ? (
                      <Caption className="mt-0.5 text-[13px] text-foreground-subtle dark:text-foreground-subtle-dark">{employee!.position}</Caption>
                    ) : null}
                  </View>
                </ItemRow>
              </TouchableOpacity>
            )
          })}

        {/* Botón añadir */}
        <View className="bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark">
          <TouchableOpacity
            onPress={() => setIsStylistSheetOpen(true)}
            disabled={stylistsLoading}
            activeOpacity={0.8}
            className="flex-row items-center gap-3 px-6 py-4"
          >
            <View className={`w-5 h-5 rounded-full items-center justify-center ${stylistsLoading ? 'bg-premium-divider-disabled' : 'bg-gold'}`}>
              <IconAdd size={11} color={themeColors.premium.white} strokeWidth={3} />
            </View>
            <Caption className={`font-manrope-extrabold text-[14px] tracking-[0.8px] ${stylistsLoading ? 'text-premium-divider-disabled' : 'text-gold'}`}>
              {stylistsLoading ? 'Cargando...' : 'Engadir estilista'}
            </Caption>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {dialog && (
        <ConfirmDialog
          visible
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel ?? 'Entendido'}
          cancelLabel={dialog.cancelLabel}
          destructive={dialog.destructive}
          onConfirm={dialog.onConfirm}
          onCancel={closeDialog}
        />
      )}

      <StylistPickerSheet
        visible={isStylistSheetOpen}
        favoriteEmployeeIds={favoriteIds}
        onToggle={(id) => { void toggleFavorite(id) }}
        onClose={() => setIsStylistSheetOpen(false)}
      />
    </SafeAreaView>
  )
}
