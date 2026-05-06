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
import { gl } from 'date-fns/locale'
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

// ─── Locale galego para react-native-calendars ───────────────────────────────

LocaleConfig.locales['gl'] = {
  monthNames: ['Xaneiro','Febreiro','Marzo','Abril','Maio','Xuño','Xullo','Agosto','Setembro','Outubro','Novembro','Decembro'],
  monthNamesShort: ['Xan','Feb','Mar','Abr','Mai','Xuñ','Xul','Ago','Set','Out','Nov','Dec'],
  dayNames: ['Domingo','Luns','Martes','Mércores','Xoves','Venres','Sábado'],
  dayNamesShort: ['Dom','Lun','Mar','Mér','Xov','Ven','Sáb'],
}
LocaleConfig.defaultLocale = 'gl'

// ─── Constantes ────────────────────────────────────────────────────────────────

const STEP_TITLES: Record<BookingStep, string> = {
  services: 'Escolle os teus servizos',
  employee: 'Escolle o teu profesional',
  date: 'Escolle data e horario',
  slot: 'Escolle data e horario',
  confirm: 'Confirma a túa reserva',
  done: 'Cita confirmada!',
}

const STEP_ORDER: BookingStep[] = ['services', 'employee', 'date', 'confirm', 'done']

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
    const cat = s.category ?? 'Outros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const totalPrice = services
    .filter((s) => selectedIds.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0)

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="px-5 pt-5 pb-36" showsVerticalScrollIndicator={false}>
        {Object.entries(grouped).map(([category, items]) => (
          <View key={category} className="mb-7">
            <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] text-foreground-muted dark:text-foreground-muted-dark uppercase mb-3">
              {category}
            </Caption>
            <View className="gap-2.5">
              {items.map((service) => {
                const selected = selectedIds.includes(service.id)
                return (
                  <TouchableOpacity
                    key={service.id}
                    onPress={() => onToggle(service.id)}
                    activeOpacity={0.75}
                    className={`flex-row items-center px-4 py-4 rounded-2xl border ${
                      selected
                        ? 'bg-surface-raised dark:bg-surface-raised-dark border-foreground dark:border-foreground-dark'
                        : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                    }`}
                  >
                    <View className="flex-1 gap-1.5 pr-3">
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
                        <Caption className="font-manrope-bold text-[13px] text-foreground dark:text-foreground-dark">
                          {service.price}€
                        </Caption>
                      </View>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center ${
                        selected
                          ? 'bg-foreground dark:bg-foreground-dark'
                          : 'border-2 border-border dark:border-border-strong-dark'
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

      <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark px-5 py-4">
        {selectedIds.length > 0 && (
          <View className="flex-row justify-between items-center mb-3">
            <Caption className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark">
              {selectedIds.length} servizo{selectedIds.length > 1 ? 's' : ''} seleccionado{selectedIds.length > 1 ? 's' : ''}
            </Caption>
            <Caption className="font-manrope-extrabold text-[14px] text-foreground dark:text-foreground-dark">
              {totalPrice}€
            </Caption>
          </View>
        )}
        <TouchableOpacity
          onPress={onNext}
          disabled={selectedIds.length === 0}
          activeOpacity={0.88}
          className={`rounded-2xl py-4 items-center ${
            selectedIds.length === 0
              ? 'bg-surface-raised dark:bg-surface-raised-dark'
              : 'bg-foreground dark:bg-foreground-dark'
          }`}
        >
          <Caption className={`font-manrope-extrabold text-[12px] tracking-[2.5px] uppercase ${
            selectedIds.length === 0
              ? 'text-foreground-muted dark:text-foreground-muted-dark'
              : 'text-premium-white dark:text-surface-dark'
          }`}>
            Continuar
          </Caption>
        </TouchableOpacity>
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
      className={`w-6 h-6 rounded-full items-center justify-center ${
        selected
          ? 'bg-foreground dark:bg-foreground-dark'
          : 'border-2 border-border dark:border-border-strong-dark'
      }`}
    >
      {selected && <IconCheck size={13} color={themeColors.premium.white} strokeWidth={2.5} />}
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
            Ningún profesional pode realizar todos os teus servizos. Asigna un a cada servizo.
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
                      Non hai profesionais dispoñibles para este servizo
                    </Caption>
                  ) : (
                    empList.map((emp) => {
                      const selected = assignedId === emp.id
                      const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(' ') || 'Profesional'
                      return (
                        <TouchableOpacity
                          key={emp.id}
                          onPress={() => onAssignServiceEmployee(svc.id, emp.id)}
                          activeOpacity={0.75}
                          className={`flex-row items-center p-4 rounded-2xl border ${
                            selected
                              ? 'bg-surface-raised dark:bg-surface-raised-dark border-foreground dark:border-foreground-dark'
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
          <TouchableOpacity
            onPress={onContinue}
            disabled={!allServicesAssigned}
            activeOpacity={0.88}
            className={`rounded-2xl py-4 items-center ${!allServicesAssigned ? 'bg-surface-raised dark:bg-surface-raised-dark' : 'bg-foreground dark:bg-foreground-dark'}`}
          >
            <Caption className={`font-manrope-extrabold text-[12px] tracking-[2.5px] uppercase ${!allServicesAssigned ? 'text-foreground-muted dark:text-foreground-muted-dark' : 'text-premium-white dark:text-surface-dark'}`}>
              Continuar
            </Caption>
          </TouchableOpacity>
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
          Escolle un profesional concreto ou deixa que o sistema asigne o primeiro dispoñible.
        </Body>

        {/* Sin preferencia */}
        <TouchableOpacity
          onPress={() => onPickEmployee(null)}
          activeOpacity={0.75}
          className={`flex-row items-center p-4 rounded-2xl border mb-2 ${
            anySelected
              ? 'bg-surface-raised dark:bg-surface-raised-dark border-foreground dark:border-foreground-dark'
              : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
          }`}
        >
          <View className="w-12 h-12 rounded-full bg-surface-raised dark:bg-surface-raised-dark items-center justify-center mr-4">
            <IconUser size={22} color={themeColors.premium.gray.DEFAULT} strokeWidth={1.5} />
          </View>
          <View className="flex-1">
            <Body className="font-manrope-bold text-[14px] text-foreground dark:text-foreground-dark">
              Sen preferencia
            </Body>
            <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark mt-0.5">
              Primeiro profesional dispoñible
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
              activeOpacity={0.75}
              className={`flex-row items-center p-4 rounded-2xl border mb-2 ${
                selected
                  ? 'bg-surface-raised dark:bg-surface-raised-dark border-foreground dark:border-foreground-dark'
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
        <TouchableOpacity
          onPress={onContinue}
          activeOpacity={0.88}
          className="bg-foreground dark:bg-foreground-dark rounded-2xl py-4 items-center"
        >
          <Caption className="font-manrope-extrabold text-[12px] tracking-[2.5px] uppercase text-premium-white dark:text-surface-dark">
            Continuar
          </Caption>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Paso 3: Data + Horario (combinado) ───────────────────────────────────────

const MIN_DATE = format(new Date(), 'yyyy-MM-dd')
const MAX_DATE = format(addDays(new Date(), 60), 'yyyy-MM-dd')

function DateSlotStep({
  selectedDate,
  slots,
  slotsLoading,
  selectedSlot,
  totalDuration,
  onPickDate,
  onPickSlot,
  onContinue,
}: {
  selectedDate: string | null
  slots: AvailableSlot[]
  slotsLoading: boolean
  selectedSlot: AvailableSlot | null
  totalDuration: number
  onPickDate: (date: string) => void
  onPickSlot: (slot: AvailableSlot) => void
  onContinue: () => void
}) {
  const themeColors = useThemeColors()

  const markedDates = selectedDate
    ? { [selectedDate]: { selected: true, selectedColor: themeColors.premium.black, selectedTextColor: themeColors.premium.white } }
    : {}

  const dateLabel = selectedDate
    ? format(parseISO(selectedDate + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: gl })
    : null

  return (
    <View className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-36">
        {/* Calendario */}
        <View className="px-3 pt-2">
          <Calendar
            onDayPress={(day) => onPickDate(day.dateString)}
            markedDates={markedDates}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            enableSwipeMonths
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: themeColors.premium.gray.DEFAULT,
              selectedDayBackgroundColor: themeColors.premium.black,
              selectedDayTextColor: themeColors.premium.white,
              todayTextColor: themeColors.gold.DEFAULT,
              dayTextColor: themeColors.premium.black,
              textDisabledColor: themeColors.premium.divider.disabled,
              dotColor: themeColors.gold.DEFAULT,
              arrowColor: themeColors.premium.black,
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

        {/* Slots */}
        {selectedDate && (
          <View className="px-5 mt-2">
            <View className="flex-row items-center gap-2 mb-4 pb-4 border-b border-border dark:border-border-dark">
              <Caption className="font-manrope-extrabold text-[13px] text-foreground dark:text-foreground-dark capitalize">
                {dateLabel}
              </Caption>
            </View>

            {slotsLoading ? (
              <LoadingSpinner />
            ) : slots.length === 0 ? (
              <View className="py-6 items-center">
                <Caption className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark text-center">
                  Non hai dispoñibilidade para este día.{'\n'}Proba con outra data.
                </Caption>
              </View>
            ) : (() => {
                const periods: { label: string; min: number; max: number }[] = [
                  { label: 'Mañá', min: 0, max: 13 * 60 },
                  { label: 'Tarde', min: 13 * 60, max: 19 * 60 },
                  { label: 'Noite', min: 19 * 60, max: 24 * 60 },
                ]

                return (
                  <View className="gap-5">
                    {periods.map(({ label, min, max }) => {
                      const periodSlots = slots.filter((s) => {
                        const h = parseISO(s.start)
                        const mins = h.getHours() * 60 + h.getMinutes()
                        return mins >= min && mins < max
                      })
                      if (periodSlots.length === 0) return null

                      return (
                        <View key={label}>
                          <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] uppercase text-foreground-muted dark:text-foreground-muted-dark mb-3">
                            {label}
                          </Caption>
                          <View className="flex-row flex-wrap gap-2.5">
                            {periodSlots.map((slot) => {
                              const startLabel = format(parseISO(slot.start), 'HH:mm')
                              const endLabel = format(parseISO(slot.end), 'HH:mm')
                              const isSelected =
                                selectedSlot?.start === slot.start &&
                                selectedSlot?.employees[0]?.id === slot.employees[0]?.id

                              return (
                                <TouchableOpacity
                                  key={`${slot.start}-${slot.employees.map((e) => e.id).join('-')}`}
                                  onPress={() => onPickSlot(slot)}
                                  activeOpacity={0.75}
                                  className={`rounded-2xl border px-4 py-3 items-center w-[30%] ${
                                    isSelected
                                      ? 'bg-foreground dark:bg-foreground-dark border-foreground dark:border-foreground-dark'
                                      : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                                  }`}
                                >
                                  <Body className={`font-manrope-extrabold text-[15px] ${
                                    isSelected ? 'text-premium-white dark:text-surface-dark' : 'text-foreground dark:text-foreground-dark'
                                  }`}>
                                    {startLabel}
                                  </Body>
                                  <Caption className={`font-manrope-medium text-[10px] mt-0.5 ${
                                    isSelected ? 'text-premium-white/70' : 'text-foreground-muted dark:text-foreground-muted-dark'
                                  }`}>
                                    ata {endLabel}
                                  </Caption>
                                </TouchableOpacity>
                              )
                            })}
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )
              })()}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark px-5 py-4">
        <TouchableOpacity
          onPress={onContinue}
          disabled={!selectedSlot}
          activeOpacity={0.88}
          className={`rounded-2xl py-4 items-center ${
            !selectedSlot
              ? 'bg-surface-raised dark:bg-surface-raised-dark'
              : 'bg-foreground dark:bg-foreground-dark'
          }`}
        >
          <Caption className={`font-manrope-extrabold text-[12px] tracking-[2.5px] uppercase ${
            !selectedSlot
              ? 'text-foreground-muted dark:text-foreground-muted-dark'
              : 'text-premium-white dark:text-surface-dark'
          }`}>
            Continuar
          </Caption>
        </TouchableOpacity>
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
  const startLabel = format(parseISO(selectedSlot.start), "EEEE d 'de' MMMM 'ás' HH:mm", { locale: gl })
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)
  const employeeNames = selectedSlot.employees
    .map((e) => [e.firstName, e.lastName].filter(Boolean).join(' ') || 'Profesional')
    .join(' + ')

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="px-5 pt-8 pb-36" showsVerticalScrollIndicator={false}>

        {/* Fecha — protagonista */}
        <View className="mb-10">
          <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] uppercase text-foreground-muted dark:text-foreground-muted-dark mb-3">
            A túa cita
          </Caption>
          <H1 className="font-manrope-extrabold text-[24px] leading-[32px] text-foreground dark:text-foreground-dark capitalize">
            {startLabel}
          </H1>
          <View className="flex-row items-center gap-1.5 mt-3">
            <IconUser size={12} color="#6B7280" strokeWidth={2} />
            <Caption className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark">
              {employeeNames}
            </Caption>
          </View>
        </View>

        {/* Servicios — filas simples */}
        <View className="mb-10">
          <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] uppercase text-foreground-muted dark:text-foreground-muted-dark mb-4">
            Servizos
          </Caption>
          {selectedServices.map((s, index) => (
            <View
              key={s.id}
              className={`flex-row justify-between items-center py-4 ${
                index < selectedServices.length - 1 ? 'border-b border-border dark:border-border-dark' : ''
              }`}
            >
              <Body className="font-manrope-medium text-[13px] text-foreground dark:text-foreground-dark flex-1 pr-4">
                {s.name}
              </Body>
              <Body className="font-manrope-bold text-[13px] text-foreground dark:text-foreground-dark">
                {s.price}€
              </Body>
            </View>
          ))}
          <View className="flex-row justify-between items-center pt-4 mt-2 border-t border-border dark:border-border-dark">
            <View className="flex-row items-center gap-1.5">
              <IconClock size={11} color="#6B7280" strokeWidth={2} />
              <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
                {totalDuration} min en total
              </Caption>
            </View>
            <Body className="font-manrope-extrabold text-[15px] text-foreground dark:text-foreground-dark">
              {totalPrice}€
            </Body>
          </View>
        </View>

        {/* Notas */}
        <View className="mb-4">
          <Caption className="font-manrope-extrabold text-[10px] tracking-[2px] uppercase text-foreground-muted dark:text-foreground-muted-dark mb-4">
            Notas para o salón (opcional)
          </Caption>
          <TextInput
            value={clientNotes}
            onChangeText={onNotesChange}
            placeholder="Ex: alérxica ao amoníaco, corte específico..."
            placeholderTextColor={themeColors.premium.gray.DEFAULT}
            multiline
            numberOfLines={3}
            className="bg-surface-raised dark:bg-surface-raised-dark rounded-2xl px-4 py-4"
            style={{
              fontFamily: 'Manrope_500Medium',
              fontSize: 13,
              color: themeColors.premium.black,
              textAlignVertical: 'top',
              minHeight: 90,
            }}
          />
        </View>

        {error && <ErrorMessage message={error} />}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark px-5 py-4">
        <TouchableOpacity
          onPress={onConfirm}
          disabled={loading}
          activeOpacity={0.88}
          className="bg-foreground dark:bg-foreground-dark rounded-2xl py-4 items-center"
        >
          <Caption className="font-manrope-extrabold text-[12px] tracking-[2.5px] uppercase text-premium-white dark:text-surface-dark">
            {loading ? 'Confirmando...' : 'Confirmar reserva'}
          </Caption>
        </TouchableOpacity>
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
  const dateLabel = format(parseISO(slot.start), "EEEE d 'de' MMMM 'ás' HH:mm", { locale: gl })
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
            Reserva confirmada!
          </H1>
          <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark text-center">
            Recibirás a confirmación por WhatsApp.
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
          Voltar ao inicio
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

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)
  const showContextStrip = flow.step !== 'services' && flow.step !== 'done' && selectedServices.length > 0

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top', 'bottom']}>
      <BookingHeader step={flow.step} onBack={handleBack} />

      {/* Franja de contexto persistente */}
      {showContextStrip && (
        <View className="flex-row items-center px-5 py-2.5 border-b border-border dark:border-border-dark gap-2 flex-wrap">
          <Caption className="font-manrope-medium text-[12px] text-foreground dark:text-foreground-dark flex-1" numberOfLines={1}>
            {selectedServices.map(s => s.name).join(' · ')}
          </Caption>
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1">
              <IconClock size={11} color="#6B7280" strokeWidth={2} />
              <Caption className="font-manrope-medium text-[11px] text-foreground-muted dark:text-foreground-muted-dark">
                {totalDuration} min
              </Caption>
            </View>
            <Caption className="font-manrope-extrabold text-[12px] text-foreground dark:text-foreground-dark">
              {totalPrice}€
            </Caption>
          </View>
        </View>
      )}

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

      {(flow.step === 'date' || flow.step === 'slot') && (
        <DateSlotStep
          selectedDate={flow.selectedDate}
          slots={flow.slots}
          slotsLoading={flow.slotsLoading}
          selectedSlot={flow.selectedSlot}
          totalDuration={totalDuration}
          onPickDate={flow.pickDate}
          onPickSlot={flow.pickSlot}
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
