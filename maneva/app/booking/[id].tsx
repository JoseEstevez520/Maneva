import React from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native'
import { Calendar, LocaleConfig } from 'react-native-calendars'
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
import { useThemeColors } from '@/hooks/useThemeColors'
import { useBookingFlow, BookingStep } from '@/hooks/useAppointments'
import { AvailableSlot, EmployeeInfo, Service } from '@/services/appointments.service'

// ─── Locale español para react-native-calendars ───────────────────────────────

LocaleConfig.locales['es'] = {
  monthNames: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  monthNamesShort: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
  dayNames: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  dayNamesShort: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
}
LocaleConfig.defaultLocale = 'es'

// ─── Constantes ────────────────────────────────────────────────────────────────

const STEP_TITLES: Record<BookingStep, string> = {
  services: 'Elige tus servicios',
  employee: 'Elige tu profesional',
  date: 'Elige una fecha',
  slot: 'Elige tu horario',
  confirm: 'Confirma tu reserva',
  done: '¡Cita confirmada!',
}

const STEP_ORDER: BookingStep[] = ['services', 'employee', 'date', 'slot', 'confirm', 'done']

// ─── Header ────────────────────────────────────────────────────────────────────

function BookingHeader({ step, onBack }: { step: BookingStep; onBack: () => void }) {
  const themeColors = useThemeColors()
  const stepIndex = STEP_ORDER.indexOf(step)
  const totalSteps = STEP_ORDER.length - 1

  if (step === 'done') {
    return (
      <View className="bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark px-5 py-5 items-center justify-center">
        <H1 className="font-manrope-extrabold text-[18px] tracking-[6px] text-foreground dark:text-foreground-dark">
          MANEVA
        </H1>
      </View>
    )
  }

  return (
    <View className="px-5 pt-4 pb-3 border-b border-border dark:border-border-dark">
      <View className="flex-row items-center gap-4 mb-3">
        <TouchableOpacity
          onPress={onBack}
          className="w-9 h-9 rounded-full bg-surface-raised dark:bg-surface-raised-dark items-center justify-center"
          activeOpacity={0.7}
        >
          <IconBack size={18} color={themeColors.premium.black} strokeWidth={2} />
        </TouchableOpacity>
        <H2 className="font-manrope-bold text-[18px] text-foreground dark:text-foreground-dark flex-1">
          {STEP_TITLES[step]}
        </H2>
      </View>

      <View className="flex-row gap-1.5">
        {STEP_ORDER.slice(0, totalSteps).map((s, i) => (
          <View
            key={s}
            className={`h-1 flex-1 rounded-full ${
              i <= stepIndex ? 'bg-gold' : 'bg-premium-divider-subtle'
            }`}
          />
        ))}
      </View>
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
  const themeColors = useThemeColors()
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
            <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] text-foreground-muted dark:text-foreground-muted-dark uppercase mb-3">
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
                        : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                    }`}
                  >
                    <View className="flex-1 gap-1">
                      <Body className="font-manrope-bold text-[14px] text-foreground dark:text-foreground-dark">
                        {service.name}
                      </Body>
                      <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <IconClock size={12} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
                          <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
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
                        selected ? 'bg-gold border-gold' : 'border-border dark:border-border-dark-disabled'
                      }`}
                    >
                      {selected && <IconCheck size={13} color={themeColors.premium.white} strokeWidth={2.5} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark px-5 py-4 gap-2">
        {selectedIds.length > 0 && (
          <View className="flex-row justify-between items-center mb-1">
            <Caption className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark">
              {selectedIds.length} servicio{selectedIds.length > 1 ? 's' : ''} seleccionado{selectedIds.length > 1 ? 's' : ''}
            </Caption>
            <Caption className="font-manrope-bold text-[14px] text-foreground dark:text-foreground-dark">
              Total: {totalPrice}€
            </Caption>
          </View>
        )}
        <Button variant="primary" size="sm" disabled={selectedIds.length === 0} onPress={onNext}>
          Continuar
        </Button>
      </View>
    </View>
  )
}

// ─── Paso 2: Profesional ───────────────────────────────────────────────────────

function EmployeeAvatar({ employee, size = 48 }: { employee: EmployeeInfo; size?: number }) {
  const themeColors = useThemeColors()
  const style = { width: size, height: size, borderRadius: size / 2 }
  if (employee.photoUrl) {
    return <Image source={{ uri: employee.photoUrl }} style={style} className="mr-4" />
  }
  return (
    <View
      style={style}
      className="bg-premium-divider-subtle items-center justify-center mr-4"
    >
      <IconUser size={size * 0.45} color={themeColors.premium.gray.DEFAULT} strokeWidth={1.5} />
    </View>
  )
}

function SelectionCircle({ selected }: { selected: boolean }) {
  const themeColors = useThemeColors()
  return (
    <View
      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
        selected ? 'bg-gold border-gold' : 'border-border dark:border-border-dark-disabled'
      }`}
    >
      {selected && <IconCheck size={13} color="#000" strokeWidth={2.5} />}
    </View>
  )
}

function EmployeeStep({
  employees,
  loading,
  isMultiEmployee,
  services,
  serviceEmployees,
  serviceEmployeesLoading,
  selectedEmployeeId,
  serviceEmployeeMap,
  allServicesAssigned,
  onPickEmployee,
  onAssignServiceEmployee,
  onContinue,
}: {
  employees: EmployeeInfo[]
  loading: boolean
  isMultiEmployee: boolean
  services: Service[]
  serviceEmployees: Record<string, EmployeeInfo[]>
  serviceEmployeesLoading: boolean
  selectedEmployeeId: string | null
  serviceEmployeeMap: Record<string, string>
  allServicesAssigned: boolean
  onPickEmployee: (id: string | null) => void
  onAssignServiceEmployee: (serviceId: string, employeeId: string) => void
  onContinue: () => void
}) {
  const themeColors = useThemeColors()
  if (loading || serviceEmployeesLoading) return <LoadingSpinner />

  // ── Modo multi-empleado ───────────────────────────────────────────────────────
  if (isMultiEmployee) {
    return (
      <View className="flex-1">
        <ScrollView
          contentContainerClassName="px-5 pt-5 pb-32"
          showsVerticalScrollIndicator={false}
        >
          <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark mb-5">
            Ningún profesional puede realizar todos tus servicios. Asigna uno a cada servicio.
          </Body>

          {services.map((svc) => {
            const empList = serviceEmployees[svc.id] ?? []
            const assignedId = serviceEmployeeMap[svc.id]
            return (
              <View key={svc.id} className="mb-6">
                <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] text-foreground-muted dark:text-foreground-muted-dark uppercase mb-3">
                  {svc.name}
                </Caption>
                <View className="gap-2">
                  {empList.length === 0 ? (
                    <Caption className="font-manrope-medium text-[12px] text-red-400">
                      No hay profesionales disponibles para este servicio
                    </Caption>
                  ) : (
                    empList.map((emp) => {
                      const selected = assignedId === emp.id
                      const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(' ') || 'Profesional'
                      return (
                        <TouchableOpacity
                          key={emp.id}
                          onPress={() => onAssignServiceEmployee(svc.id, emp.id)}
                          activeOpacity={0.7}
                          className={`flex-row items-center p-4 rounded-2xl border ${
                            selected
                              ? 'bg-[rgba(212,175,55,0.08)] border-gold'
                              : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                          }`}
                        >
                          <EmployeeAvatar employee={emp} size={44} />
                          <View className="flex-1">
                            <Body className="font-manrope-bold text-[14px] text-foreground dark:text-foreground-dark">
                              {fullName}
                            </Body>
                          </View>
                          <SelectionCircle selected={selected} />
                        </TouchableOpacity>
                      )
                    })
                  )}
                </View>
              </View>
            )
          })}
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark px-5 py-4">
          <Button variant="primary" size="sm" disabled={!allServicesAssigned} onPress={onContinue}>
            Continuar
          </Button>
        </View>
      </View>
    )
  }

  // ── Modo un empleado ──────────────────────────────────────────────────────────
  const anySelected = selectedEmployeeId === null

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerClassName="px-5 pt-5 pb-32"
        showsVerticalScrollIndicator={false}
      >
        <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark mb-4">
          Elige un profesional concreto o deja que el sistema asigne el primero disponible.
        </Body>

        {/* Sin preferencia */}
        <TouchableOpacity
          onPress={() => onPickEmployee(null)}
          activeOpacity={0.7}
          className={`flex-row items-center p-4 rounded-2xl border mb-2 ${
            anySelected
              ? 'bg-[rgba(212,175,55,0.08)] border-gold'
              : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
          }`}
        >
          <View className="w-12 h-12 rounded-full bg-surface-raised dark:bg-surface-raised-dark items-center justify-center mr-4">
            <IconUser size={22} color={themeColors.premium.gray.DEFAULT} strokeWidth={1.5} />
          </View>
          <View className="flex-1">
            <Body className="font-manrope-bold text-[14px] text-foreground dark:text-foreground-dark">
              Sin preferencia
            </Body>
            <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark mt-0.5">
              Primer profesional disponible
            </Caption>
          </View>
          <SelectionCircle selected={anySelected} />
        </TouchableOpacity>

        {/* Lista de profesionales */}
        {employees.map((emp) => {
          const selected = selectedEmployeeId === emp.id
          const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(' ') || 'Profesional'
          return (
            <TouchableOpacity
              key={emp.id}
              onPress={() => onPickEmployee(emp.id)}
              activeOpacity={0.7}
              className={`flex-row items-center p-4 rounded-2xl border mb-2 ${
                selected
                  ? 'bg-[rgba(212,175,55,0.08)] border-gold'
                  : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
              }`}
            >
              <EmployeeAvatar employee={emp} />
              <View className="flex-1">
                <Body className="font-manrope-bold text-[14px] text-foreground dark:text-foreground-dark">
                  {fullName}
                </Body>
                {emp.position && (
                  <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark mt-0.5">
                    {emp.position}
                  </Caption>
                )}
              </View>
              <SelectionCircle selected={selected} />
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark px-5 py-4">
        <Button variant="primary" size="sm" onPress={onContinue}>
          Continuar
        </Button>
      </View>
    </View>
  )
}

// ─── Paso 3: Fecha ─────────────────────────────────────────────────────────────

const MIN_DATE = format(new Date(), 'yyyy-MM-dd')
const MAX_DATE = format(addDays(new Date(), 60), 'yyyy-MM-dd')

function DateStep({
  selectedDate,
  onSelect,
  onContinue,
}: {
  selectedDate: string | null
  onSelect: (date: string) => void
  onContinue: () => void
}) {
  const themeColors = useThemeColors()
  const markedDates = selectedDate
    ? { [selectedDate]: { selected: true, selectedColor: themeColors.gold.DEFAULT, selectedTextColor: themeColors.premium.white } }
    : {}

  return (
    <View className="flex-1">
      <View className="flex-1 px-4 pt-4">
        <Calendar
          onDayPress={(day) => onSelect(day.dateString)}
          markedDates={markedDates}
          minDate={MIN_DATE}
          maxDate={MAX_DATE}
          enableSwipeMonths
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: themeColors.premium.gray.DEFAULT,
            selectedDayBackgroundColor: themeColors.gold.DEFAULT,
            selectedDayTextColor: themeColors.premium.white,
            todayTextColor: themeColors.gold.DEFAULT,
            dayTextColor: themeColors.premium.black,
            textDisabledColor: themeColors.premium.divider.disabled,
            dotColor: themeColors.gold.DEFAULT,
            arrowColor: themeColors.gold.DEFAULT,
            monthTextColor: themeColors.premium.black,
            textMonthFontFamily: 'Manrope_700Bold',
            textMonthFontSize: 16,
            textDayFontFamily: 'Manrope_500Medium',
            textDayFontSize: 14,
            textDayHeaderFontFamily: 'Manrope_800ExtraBold',
            textDayHeaderFontSize: 11,
          }}
        />
      </View>

      <View className="bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark px-5 py-4">
        <Button variant="primary" size="sm" disabled={!selectedDate} onPress={onContinue}>
          Continuar
        </Button>
      </View>
    </View>
  )
}

// ─── Paso 4: Slots ─────────────────────────────────────────────────────────────

function SlotStep({
  slots,
  loading,
  selectedDate,
  selectedSlot,
  totalDuration,
  onSelect,
  onContinue,
}: {
  slots: AvailableSlot[]
  loading: boolean
  selectedDate: string | null
  selectedSlot: AvailableSlot | null
  totalDuration: number
  onSelect: (slot: AvailableSlot) => void
  onContinue: () => void
}) {
  const themeColors = useThemeColors()
  if (loading) return <LoadingSpinner />

  const dateLabel = selectedDate
    ? format(parseISO(selectedDate + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })
    : ''

  return (
    <View className="flex-1">
      <View className="flex-1 px-5 pt-5">
        <View className="flex-row items-center gap-2 mb-5">
          <IconCalendar size={14} color={themeColors.gold.DEFAULT} strokeWidth={2} />
          <Caption className="font-manrope-bold text-[12px] text-foreground-muted dark:text-foreground-muted-dark capitalize">
            {dateLabel}
          </Caption>
        </View>

        {slots.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-3">
            <Caption className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark text-center">
              No hay disponibilidad para este día.{'\n'}Prueba con otra fecha.
            </Caption>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-4 gap-3">
            {slots.map((slot) => {
              const timeLabel = format(parseISO(slot.start), 'HH:mm')
              const endLabel = format(parseISO(slot.end), 'HH:mm')
              const isSelected =
                selectedSlot?.start === slot.start &&
                selectedSlot?.employees[0]?.id === slot.employees[0]?.id
              const employeeNames = slot.employees
                .map((e) => e.firstName ?? 'Profesional')
                .join(' + ')
              const isMulti = slot.employees.length > 1

              return (
                <TouchableOpacity
                  key={`${slot.start}-${slot.employees.map((e) => e.id).join('-')}`}
                  onPress={() => onSelect(slot)}
                  activeOpacity={0.7}
                  className={`flex-row items-center p-4 rounded-2xl border ${
                    isSelected ? 'bg-[rgba(212,175,55,0.08)] border-gold' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                  }`}
                >
                  {/* Hora */}
                  <View className="bg-[rgba(212,175,55,0.1)] rounded-xl px-3 py-2 mr-4 items-center">
                    <Body className="font-manrope-bold text-[16px] text-foreground dark:text-foreground-dark">
                      {timeLabel}
                    </Body>
                    <Caption className="font-manrope-medium text-[10px] text-foreground-muted dark:text-foreground-muted-dark">
                      {endLabel}
                    </Caption>
                  </View>

                  {/* Profesional(es) y duración */}
                  <View className="flex-1 gap-1">
                    <View className="flex-row items-center gap-1.5">
                      <IconUser size={12} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
                      <Body className="font-manrope-bold text-[13px] text-foreground dark:text-foreground-dark flex-1">
                        {employeeNames}
                      </Body>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <IconClock size={11} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
                      <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
                        {totalDuration} min
                        {isMulti ? ` · ${slot.employees.length} profesionales` : ''}
                      </Caption>
                    </View>
                  </View>

                  <IconBack
                    size={16}
                    color={themeColors.premium.gray.DEFAULT}
                    strokeWidth={2}
                    style={{ transform: [{ rotate: '180deg' }] }}
                  />
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}
      </View>

      <View className="bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark px-5 py-4">
        <Button
          variant="primary"
          size="sm"
          disabled={!selectedSlot}
          onPress={onContinue}
        >
          Continuar
        </Button>
      </View>
    </View>
  )
}

// ─── Paso 5: Confirmación ──────────────────────────────────────────────────────

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
  const themeColors = useThemeColors()
  const startLabel = format(parseISO(selectedSlot.start), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)
  const employeeNames = selectedSlot.employees
    .map((e) => [e.firstName, e.lastName].filter(Boolean).join(' ') || 'Profesional')
    .join(' + ')

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="px-5 pt-5 pb-32" showsVerticalScrollIndicator={false}>
        {/* Fecha y empleado(s) */}
        <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 mb-4 gap-3">
          <View className="flex-row items-center gap-2">
            <IconCalendar size={14} color={themeColors.gold.DEFAULT} strokeWidth={2} />
            <Body className="font-manrope-bold text-[13px] text-foreground dark:text-foreground-dark capitalize flex-1">
              {startLabel}
            </Body>
          </View>
          <View className="flex-row items-center gap-2">
            <IconUser size={14} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
            <Body className="font-manrope-medium text-[13px] text-foreground dark:text-foreground-dark">
              {employeeNames}
            </Body>
          </View>
        </View>

        {/* Servicios */}
        <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 mb-4 gap-3">
          <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] text-foreground-muted dark:text-foreground-muted-dark uppercase">
            Servicios
          </Caption>
          {selectedServices.map((s) => (
            <View key={s.id} className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2 flex-1">
                <IconCheck size={12} color={themeColors.gold.DEFAULT} strokeWidth={2.5} />
                <Body className="font-manrope-medium text-[13px] text-foreground dark:text-foreground-dark flex-1">
                  {s.name}
                </Body>
              </View>
              <Body className="font-manrope-bold text-[13px] text-foreground dark:text-foreground-dark">
                {s.price}€
              </Body>
            </View>
          ))}
          <View className="border-t border-border dark:border-border-dark pt-3 flex-row justify-between items-center">
            <View className="flex-row items-center gap-1.5">
              <IconClock size={12} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
              <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
                {totalDuration} min en total
              </Caption>
            </View>
            <Body className="font-manrope-bold text-[15px] text-foreground dark:text-foreground-dark">
              {totalPrice}€
            </Body>
          </View>
        </View>

        {/* Notas */}
        <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 mb-4">
          <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] text-foreground-muted dark:text-foreground-muted-dark uppercase mb-3">
            Notas para el salón (opcional)
          </Caption>
          <TextInput
            value={clientNotes}
            onChangeText={onNotesChange}
            placeholder="Ej: alérgica al amoniaco, corte específico..."
            placeholderTextColor={themeColors.premium.gray.DEFAULT}
            multiline
            numberOfLines={3}
            style={{
              fontFamily: 'Manrope_500Medium',
              fontSize: 13,
              color: themeColors.premium.black,
              textAlignVertical: 'top',
              minHeight: 72,
            }}
          />
        </View>

        {error && <ErrorMessage message={error} />}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark px-5 py-4">
        <Button variant="primary" size="sm" loading={loading} onPress={onConfirm}>
          Confirmar reserva
        </Button>
      </View>
    </View>
  )
}

// ─── Paso 6: Éxito ─────────────────────────────────────────────────────────────

function DoneStep({
  appointmentId,
  services,
  slot,
  onGoHome,
}: {
  appointmentId: string
  services: Service[]
  slot: AvailableSlot
  onGoHome: () => void
}) {
  const themeColors = useThemeColors()
  const dateLabel = format(parseISO(slot.start), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0)
  const serviceNames = services.map((s) => s.name).join(', ')
  const employeeNames = slot.employees
    .map((e) => [e.firstName, e.lastName].filter(Boolean).join(' ') || 'Profesional')
    .join(' + ')

  return (
    <View className="flex-1 px-5">
      <View className="flex-1 items-center justify-center gap-6">
        {/* Icono */}
        <View className="w-24 h-24 rounded-full bg-[rgba(212,175,55,0.15)] items-center justify-center">
          <IconCheckCircle size={48} color={themeColors.gold.DEFAULT} strokeWidth={1.5} />
        </View>

        {/* Título */}
        <View className="items-center gap-2">
          <H1 className="font-manrope-bold text-[24px] text-foreground dark:text-foreground-dark text-center">
            ¡Reserva confirmada!
          </H1>
          <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark text-center">
            Recibirás la confirmación por WhatsApp.
          </Body>
        </View>

        {/* Resumen de la cita */}
        <View className="w-full bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.25)] rounded-2xl p-4 gap-3">
          <View className="flex-row items-start gap-2.5">
            <IconCalendar size={14} color={themeColors.gold.DEFAULT} strokeWidth={2} />
            <Body className="font-manrope-semibold text-[13px] text-foreground dark:text-foreground-dark flex-1 capitalize">
              {dateLabel}
            </Body>
          </View>

          {serviceNames.length > 0 && (
            <View className="flex-row items-start gap-2.5">
              <IconCheck size={14} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
              <Body className="font-manrope-medium text-[13px] text-foreground dark:text-foreground-dark flex-1">
                {serviceNames}
              </Body>
            </View>
          )}

          {employeeNames.length > 0 && (
            <View className="flex-row items-start gap-2.5">
              <IconUser size={14} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
              <Body className="font-manrope-medium text-[13px] text-foreground dark:text-foreground-dark flex-1">
                {employeeNames}
              </Body>
            </View>
          )}

          {totalPrice > 0 && (
            <View className="border-t border-[rgba(212,175,55,0.2)] pt-3 flex-row justify-between items-center">
              <Caption className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark">
                Total estimado
              </Caption>
              <Body className="font-manrope-bold text-[15px] text-foreground dark:text-foreground-dark">
                {totalPrice}€
              </Body>
            </View>
          )}
        </View>

        <View className="bg-surface-raised dark:bg-surface-raised-dark rounded-lg px-4 py-2">
          <Caption className="font-manrope-bold text-[11px] text-foreground-muted dark:text-foreground-muted-dark tracking-[1.5px]">
            Ref: {appointmentId.slice(0, 8).toUpperCase()}
          </Caption>
        </View>
      </View>

      <View className="pb-6">
        <Button variant="primary" size="sm" onPress={onGoHome}>
          Volver al inicio
        </Button>
      </View>
    </View>
  )
}

// ─── Pantalla principal ────────────────────────────────────────────────────────

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const flow = useBookingFlow(id ?? '')

  const selectedServices = flow.services.filter((s) => flow.selectedServiceIds.includes(s.id))
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)

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
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top', 'bottom']}>
      <BookingHeader step={flow.step} onBack={handleBack} />

      {flow.step === 'services' && (
        <ServicesStep
          services={flow.services}
          loading={flow.servicesLoading}
          selectedIds={flow.selectedServiceIds}
          onToggle={flow.toggleService}
          onNext={() => flow.setStep('employee')}
        />
      )}

      {flow.step === 'employee' && (
        <EmployeeStep
          employees={flow.employees}
          loading={flow.employeesLoading}
          isMultiEmployee={flow.isMultiEmployee}
          services={selectedServices}
          serviceEmployees={flow.serviceEmployees}
          serviceEmployeesLoading={flow.serviceEmployeesLoading}
          selectedEmployeeId={flow.selectedEmployeeId}
          serviceEmployeeMap={flow.serviceEmployeeMap}
          allServicesAssigned={flow.allServicesAssigned}
          onPickEmployee={flow.pickEmployee}
          onAssignServiceEmployee={flow.assignServiceEmployee}
          onContinue={() => flow.setStep('date')}
        />
      )}

      {flow.step === 'date' && (
        <DateStep
          selectedDate={flow.selectedDate}
          onSelect={flow.pickDate}
          onContinue={() => flow.setStep('slot')}
        />
      )}

      {flow.step === 'slot' && (
        <SlotStep
          slots={flow.slots}
          loading={flow.slotsLoading}
          selectedDate={flow.selectedDate}
          selectedSlot={flow.selectedSlot}
          totalDuration={totalDuration}
          onSelect={flow.pickSlot}
          onContinue={() => flow.setStep('confirm')}
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

      {flow.step === 'done' && flow.booking && flow.selectedSlot && (
        <DoneStep
          appointmentId={flow.booking.id}
          services={selectedServices}
          slot={flow.selectedSlot}
          onGoHome={handleGoHome}
        />
      )}
    </SafeAreaView>
  )
}
