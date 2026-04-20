import React, { useRef } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Body, Caption, H1, H2 } from '@/components/ui/Typography'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import {
  IconBack,
  IconCheck,
  IconCheckCircle,
  IconClock,
  IconUser,
  IconCalendar,
} from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { useBookingFlow, BookingStep } from '@/hooks/useAppointments'
import { AvailableSlot, Service } from '@/services/appointments.service'

// ─── Constantes ────────────────────────────────────────────────────────────────

const STEP_TITLES: Record<BookingStep, string> = {
  services: 'Elige tus servicios',
  date: 'Elige una fecha',
  slot: 'Elige tu horario',
  confirm: 'Confirma tu reserva',
  done: '¡Cita confirmada!',
}

const STEP_ORDER: BookingStep[] = ['services', 'date', 'slot', 'confirm', 'done']

// Días disponibles para reservar (hoy + 60 días)
function buildDateRange(): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 60 }, (_, i) => addDays(today, i))
}

const DATE_RANGE = buildDateRange()

// ─── Header ────────────────────────────────────────────────────────────────────

function BookingHeader({
  step,
  onBack,
}: {
  step: BookingStep
  onBack: () => void
}) {
  const stepIndex = STEP_ORDER.indexOf(step)
  const totalSteps = STEP_ORDER.length - 1 // 'done' no cuenta como paso

  return (
    <View className="px-5 pt-4 pb-3 border-b border-[#F3F4F6]">
      <View className="flex-row items-center gap-4 mb-3">
        {step !== 'done' && (
          <TouchableOpacity
            onPress={onBack}
            className="w-9 h-9 rounded-full bg-[#F5F5F5] items-center justify-center"
            activeOpacity={0.7}
          >
            <IconBack size={18} color={Colors.premium.black} strokeWidth={2} />
          </TouchableOpacity>
        )}
        <H2 className="font-manrope-bold text-[18px] text-premium-black flex-1">
          {STEP_TITLES[step]}
        </H2>
      </View>

      {step !== 'done' && (
        <View className="flex-row gap-1.5">
          {STEP_ORDER.slice(0, totalSteps).map((s, i) => (
            <View
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= stepIndex ? 'bg-gold' : 'bg-[#F0F0F0]'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Paso 1: Servicios ─────────────────────────────────────────────────────────

function ServicesStep({
  services,
  loading,
  selectedIds,
  onToggle,
  onNext,
}: {
  services: Service[]
  loading: boolean
  selectedIds: string[]
  onToggle: (id: string) => void
  onNext: () => void
}) {
  if (loading) return <LoadingSpinner />

  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    const cat = s.category ?? 'Otros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const totalPrice = services
    .filter((s) => selectedIds.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0)

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="px-5 pt-5 pb-32" showsVerticalScrollIndicator={false}>
        {Object.entries(grouped).map(([category, items]) => (
          <View key={category} className="mb-6">
            <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] text-premium-gray uppercase mb-3">
              {category}
            </Caption>
            <View className="gap-2">
              {items.map((service) => {
                const selected = selectedIds.includes(service.id)
                return (
                  <TouchableOpacity
                    key={service.id}
                    onPress={() => onToggle(service.id)}
                    activeOpacity={0.7}
                    className={`flex-row items-center p-4 rounded-2xl border ${
                      selected
                        ? 'bg-[rgba(212,175,55,0.08)] border-gold'
                        : 'bg-premium-white border-[#F0F0F0]'
                    }`}
                  >
                    <View className="flex-1 gap-1">
                      <Body className="font-manrope-bold text-[14px] text-premium-black">
                        {service.name}
                      </Body>
                      <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <IconClock size={12} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
                          <Caption className="font-manrope-medium text-[11px] text-premium-gray">
                            {service.duration_minutes} min
                          </Caption>
                        </View>
                        <Caption className="font-manrope-bold text-[13px] text-gold">
                          {service.price}€
                        </Caption>
                      </View>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        selected ? 'bg-gold border-gold' : 'border-[#D0D0D0]'
                      }`}
                    >
                      {selected && <IconCheck size={13} color="#000" strokeWidth={2.5} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-premium-white border-t border-[#F3F4F6] px-5 py-4 gap-2">
        {selectedIds.length > 0 && (
          <View className="flex-row justify-between items-center mb-1">
            <Caption className="font-manrope-medium text-[12px] text-premium-gray">
              {selectedIds.length} servicio{selectedIds.length > 1 ? 's' : ''} seleccionado{selectedIds.length > 1 ? 's' : ''}
            </Caption>
            <Caption className="font-manrope-bold text-[14px] text-premium-black">
              Total: {totalPrice}€
            </Caption>
          </View>
        )}
        <Button
          variant="primary"
          size="sm"
          disabled={selectedIds.length === 0}
          onPress={onNext}
        >
          Continuar
        </Button>
      </View>
    </View>
  )
}

// ─── Paso 2: Fecha ─────────────────────────────────────────────────────────────

function DateStep({
  selectedDate,
  onSelect,
}: {
  selectedDate: string | null
  onSelect: (date: string) => void
}) {
  const flatRef = useRef<FlatList>(null)

  return (
    <View className="flex-1 px-5 pt-6">
      <Body className="font-manrope-medium text-[13px] text-premium-gray mb-5">
        Selecciona el día que mejor te venga
      </Body>
      <FlatList
        ref={flatRef}
        data={DATE_RANGE}
        keyExtractor={(d) => d.toISOString()}
        showsVerticalScrollIndicator={false}
        numColumns={4}
        contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item: date }) => {
          const iso = format(date, 'yyyy-MM-dd')
          const selected = selectedDate === iso
          const isToday = iso === format(new Date(), 'yyyy-MM-dd')

          return (
            <TouchableOpacity
              onPress={() => onSelect(iso)}
              activeOpacity={0.7}
              className={`flex-1 items-center py-3 rounded-2xl border ${
                selected
                  ? 'bg-gold border-gold'
                  : 'bg-premium-white border-[#F0F0F0]'
              }`}
            >
              <Caption
                className={`font-manrope-extrabold text-[9px] tracking-[1px] uppercase mb-1 ${
                  selected ? 'text-premium-black' : 'text-premium-gray'
                }`}
              >
                {format(date, 'EEE', { locale: es })}
              </Caption>
              <Body
                className={`font-manrope-bold text-[18px] ${
                  selected ? 'text-premium-black' : 'text-premium-black'
                }`}
              >
                {format(date, 'd')}
              </Body>
              <Caption
                className={`font-manrope-medium text-[9px] mt-0.5 ${
                  selected ? 'text-premium-black' : 'text-premium-gray'
                }`}
              >
                {format(date, 'MMM', { locale: es })}
              </Caption>
              {isToday && (
                <View className={`w-1.5 h-1.5 rounded-full mt-1 ${selected ? 'bg-premium-black' : 'bg-gold'}`} />
              )}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

// ─── Paso 3: Slots ─────────────────────────────────────────────────────────────

function SlotStep({
  slots,
  loading,
  selectedDate,
  onSelect,
}: {
  slots: AvailableSlot[]
  loading: boolean
  selectedDate: string | null
  onSelect: (slot: AvailableSlot) => void
}) {
  if (loading) return <LoadingSpinner />

  const dateLabel = selectedDate
    ? format(parseISO(selectedDate + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })
    : ''

  return (
    <View className="flex-1 px-5 pt-5">
      <View className="flex-row items-center gap-2 mb-5">
        <IconCalendar size={14} color={Colors.gold.DEFAULT} strokeWidth={2} />
        <Caption className="font-manrope-bold text-[12px] text-premium-gray capitalize">
          {dateLabel}
        </Caption>
      </View>

      {slots.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3">
          <Caption className="font-manrope-medium text-[13px] text-premium-gray text-center">
            No hay disponibilidad para este día.{'\n'}Prueba con otra fecha.
          </Caption>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8 gap-3">
          {slots.map((slot, i) => {
            const timeLabel = format(parseISO(slot.start), 'HH:mm')
            const endLabel = format(parseISO(slot.end), 'HH:mm')

            return (
              <TouchableOpacity
                key={`${slot.start}-${slot.employee.id}`}
                onPress={() => onSelect(slot)}
                activeOpacity={0.7}
                className="flex-row items-center p-4 rounded-2xl border border-[#F0F0F0] bg-premium-white"
              >
                <View className="bg-[rgba(212,175,55,0.1)] rounded-xl px-3 py-2 mr-4">
                  <Body className="font-manrope-bold text-[16px] text-premium-black">
                    {timeLabel}
                  </Body>
                  <Caption className="font-manrope-medium text-[10px] text-premium-gray text-center">
                    {endLabel}
                  </Caption>
                </View>
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-1.5">
                    <IconUser size={12} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
                    <Body className="font-manrope-bold text-[13px] text-premium-black">
                      {slot.employee.firstName} {slot.employee.lastName}
                    </Body>
                  </View>
                  {slot.employee.position && (
                    <Caption className="font-manrope-medium text-[11px] text-premium-gray">
                      {slot.employee.position}
                    </Caption>
                  )}
                </View>
                <IconBack
                  size={16}
                  color={Colors.premium.gray.DEFAULT}
                  strokeWidth={2}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

// ─── Paso 4: Confirmación ──────────────────────────────────────────────────────

function ConfirmStep({
  selectedServices,
  selectedSlot,
  clientNotes,
  onNotesChange,
  onConfirm,
  loading,
  error,
}: {
  selectedServices: Service[]
  selectedSlot: AvailableSlot
  clientNotes: string
  onNotesChange: (text: string) => void
  onConfirm: () => void
  loading: boolean
  error: string | null
}) {
  const startLabel = format(parseISO(selectedSlot.start), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="px-5 pt-5 pb-32" showsVerticalScrollIndicator={false}>
        {/* Fecha y empleado */}
        <View className="bg-premium-white border border-[#F0F0F0] rounded-2xl p-4 mb-4 gap-3">
          <View className="flex-row items-center gap-2">
            <IconCalendar size={14} color={Colors.gold.DEFAULT} strokeWidth={2} />
            <Body className="font-manrope-bold text-[13px] text-premium-black capitalize flex-1">
              {startLabel}
            </Body>
          </View>
          <View className="flex-row items-center gap-2">
            <IconUser size={14} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
            <Body className="font-manrope-medium text-[13px] text-premium-black">
              {selectedSlot.employee.firstName} {selectedSlot.employee.lastName}
              {selectedSlot.employee.position ? ` · ${selectedSlot.employee.position}` : ''}
            </Body>
          </View>
        </View>

        {/* Servicios */}
        <View className="bg-premium-white border border-[#F0F0F0] rounded-2xl p-4 mb-4 gap-3">
          <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] text-premium-gray uppercase">
            Servicios
          </Caption>
          {selectedServices.map((s) => (
            <View key={s.id} className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2 flex-1">
                <IconCheck size={12} color={Colors.gold.DEFAULT} strokeWidth={2.5} />
                <Body className="font-manrope-medium text-[13px] text-premium-black flex-1">
                  {s.name}
                </Body>
              </View>
              <Body className="font-manrope-bold text-[13px] text-premium-black">
                {s.price}€
              </Body>
            </View>
          ))}
          <View className="border-t border-[#F3F4F6] pt-3 flex-row justify-between items-center">
            <View className="flex-row items-center gap-1.5">
              <IconClock size={12} color={Colors.premium.gray.DEFAULT} strokeWidth={2} />
              <Caption className="font-manrope-medium text-[11px] text-premium-gray">
                {totalDuration} min en total
              </Caption>
            </View>
            <Body className="font-manrope-bold text-[15px] text-premium-black">
              {totalPrice}€
            </Body>
          </View>
        </View>

        {/* Notas */}
        <View className="bg-premium-white border border-[#F0F0F0] rounded-2xl p-4 mb-4">
          <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] text-premium-gray uppercase mb-3">
            Notas para el salón (opcional)
          </Caption>
          <TextInput
            value={clientNotes}
            onChangeText={onNotesChange}
            placeholder="Ej: alérgica al amoniaco, corte específico..."
            placeholderTextColor={Colors.premium.gray.DEFAULT}
            multiline
            numberOfLines={3}
            style={{
              fontFamily: 'Manrope-Medium',
              fontSize: 13,
              color: Colors.premium.black,
              textAlignVertical: 'top',
              minHeight: 72,
            }}
          />
        </View>

        {error && <ErrorMessage message={error} />}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-premium-white border-t border-[#F3F4F6] px-5 py-4">
        <Button
          variant="primary"
          size="sm"
          loading={loading}
          onPress={onConfirm}
        >
          Confirmar reserva
        </Button>
      </View>
    </View>
  )
}

// ─── Paso 5: Éxito ─────────────────────────────────────────────────────────────

function DoneStep({
  appointmentId,
  onGoHome,
}: {
  appointmentId: string
  onGoHome: () => void
}) {
  return (
    <View className="flex-1 items-center justify-center px-5 gap-6">
      <View className="w-20 h-20 rounded-full bg-[rgba(212,175,55,0.15)] items-center justify-center">
        <IconCheckCircle size={40} color={Colors.gold.DEFAULT} strokeWidth={1.5} />
      </View>

      <View className="items-center gap-2">
        <H1 className="font-manrope-bold text-[22px] text-premium-black text-center">
          ¡Reserva confirmada!
        </H1>
        <Body className="font-manrope-medium text-[13px] text-premium-gray text-center">
          Recibirás la confirmación por WhatsApp.
        </Body>
        <View className="bg-[#F5F5F5] rounded-lg px-4 py-2 mt-2">
          <Caption className="font-manrope-bold text-[11px] text-premium-gray tracking-[1px]">
            ID: {appointmentId.slice(0, 8).toUpperCase()}
          </Caption>
        </View>
      </View>

      <Button variant="primary" size="sm" onPress={onGoHome}>
        Volver al inicio
      </Button>
    </View>
  )
}

// ─── Pantalla principal ────────────────────────────────────────────────────────

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const flow = useBookingFlow(id ?? '')

  const selectedServices = flow.services.filter((s) =>
    flow.selectedServiceIds.includes(s.id),
  )

  function handleBack() {
    const idx = STEP_ORDER.indexOf(flow.step)
    if (idx <= 0) {
      router.back()
      return
    }
    flow.setStep(STEP_ORDER[idx - 1])
  }

  function handleGoHome() {
    flow.reset()
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView className="flex-1 bg-premium-white" edges={['top', 'bottom']}>
      <BookingHeader step={flow.step} onBack={handleBack} />

      {flow.step === 'services' && (
        <ServicesStep
          services={flow.services}
          loading={flow.servicesLoading}
          selectedIds={flow.selectedServiceIds}
          onToggle={flow.toggleService}
          onNext={() => flow.setStep('date')}
        />
      )}

      {flow.step === 'date' && (
        <DateStep
          selectedDate={flow.selectedDate}
          onSelect={flow.selectDate}
        />
      )}

      {flow.step === 'slot' && (
        <SlotStep
          slots={flow.slots}
          loading={flow.slotsLoading}
          selectedDate={flow.selectedDate}
          onSelect={flow.selectSlot}
        />
      )}

      {flow.step === 'confirm' && flow.selectedSlot && (
        <ConfirmStep
          selectedServices={selectedServices}
          selectedSlot={flow.selectedSlot}
          clientNotes={flow.clientNotes}
          onNotesChange={flow.setClientNotes}
          onConfirm={flow.confirm}
          loading={flow.loading}
          error={flow.error}
        />
      )}

      {flow.step === 'done' && flow.booking && (
        <DoneStep
          appointmentId={flow.booking.id}
          onGoHome={handleGoHome}
        />
      )}
    </SafeAreaView>
  )
}
