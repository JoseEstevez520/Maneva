import React, { useState } from 'react'
import { View, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { format, parseISO } from 'date-fns'
import { gl } from 'date-fns/locale'
import { Body, Caption, H2 } from '@/components/ui/Typography'
import { IconBack, IconCalendar, IconTag, IconUser } from '@/components/ui/icons'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useMyAppointments } from '@/hooks/useAppointments'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Database } from '@/types/database.types'

type Appointment = Database['public']['Tables']['appointments']['Row']

type AppointmentWithJoins = Appointment & {
  salon_locations?: { name: string } | null
  appointment_services?: { services?: { name: string } | null }[] | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  done: 'Completada',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-warning-text',
  confirmed: 'text-success-text',
  cancelled: 'text-error-dark',
  done: 'text-foreground-muted dark:text-foreground-muted-dark',
}

function AppointmentRow({
  appointment,
  onRequestCancel,
}: {
  appointment: AppointmentWithJoins
  onRequestCancel: (id: string) => void
}) {
  const dateLabel = format(
    parseISO(appointment.scheduled_at),
    "EEE d MMM · HH:mm",
    { locale: gl },
  )
  const salonName = appointment.salon_locations?.name ?? 'Salón'
  const serviceName =
    appointment.appointment_services
      ?.map((s) => s.services?.name)
      .filter(Boolean)
      .join(', ') ?? 'Servizo'

  const themeColors = useThemeColors()
  const canCancel = appointment.status === 'pending' || appointment.status === 'confirmed'

  return (
    <View className="bg-surface dark:bg-surface-dark rounded-[20px] border border-border dark:border-border-dark p-5 gap-3">
      {/* Header: salón + estado */}
      <View className="flex-row items-center justify-between">
        <Body className="font-manrope-bold text-[15px] text-foreground dark:text-foreground-dark flex-1 mr-2" numberOfLines={1}>
          {salonName}
        </Body>
        <Caption numberOfLines={1} className={`font-manrope-extrabold text-[10px] tracking-[1px] uppercase ${STATUS_COLOR[appointment.status] ?? 'text-foreground-muted dark:text-foreground-muted-dark'}`}>
          {STATUS_LABEL[appointment.status] ?? appointment.status}
        </Caption>
      </View>

      {/* Servicio */}
      <View className="flex-row items-center gap-2">
        <IconUser size={13} color={themeColors.premium.gray.DEFAULT} strokeWidth={2} />
        <Caption className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark flex-1" numberOfLines={1}>
          {serviceName}
        </Caption>
      </View>

      {/* Fecha */}
      <View className="flex-row items-center gap-2">
        <IconCalendar size={13} color={themeColors.gold.DEFAULT} strokeWidth={2} />
        <Caption className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark capitalize" numberOfLines={1}>
          {dateLabel}
        </Caption>
      </View>

      {/* Precio */}
      {appointment.final_price != null && (
        <View className="flex-row items-center gap-2">
          <IconTag size={13} color={themeColors.gold.DEFAULT} strokeWidth={2} />
          <Caption className="font-manrope-medium text-[12px] text-foreground-muted dark:text-foreground-muted-dark">
            {appointment.final_price}€
          </Caption>
        </View>
      )}

      {/* Cancelar */}
      {canCancel && (
        <TouchableOpacity
          onPress={() => onRequestCancel(appointment.id)}
          activeOpacity={0.7}
          className="border border-border dark:border-border-dark rounded-[20px] py-2.5 items-center mt-1"
        >
          <Caption numberOfLines={1} className="font-manrope-extrabold text-[10px] tracking-[1.5px] uppercase text-error-dark">
            Cancelar a cita
          </Caption>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function BookingsScreen() {
  const themeColors = useThemeColors()
  const router = useRouter()
  const { data, loading, error, cancel } = useMyAppointments()
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState(false)

  const upcoming = (data as AppointmentWithJoins[]).filter(
    (a) => a.status === 'pending' || a.status === 'confirmed',
  )
  const past = (data as AppointmentWithJoins[]).filter(
    (a) => a.status === 'done' || a.status === 'cancelled',
  )

  const handleCancelConfirm = async () => {
    if (!cancelTargetId) return
    try {
      await cancel(cancelTargetId)
      setCancelTargetId(null)
    } catch {
      setCancelTargetId(null)
      setCancelError(true)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      {/* Header */}
      <View className="bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark px-5 py-5 flex-row items-center gap-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-surface-raised dark:bg-surface-raised-dark items-center justify-center"
          activeOpacity={0.7}
        >
          <IconBack size={18} color={themeColors.premium.black} strokeWidth={2} />
        </TouchableOpacity>
        <H2 className="font-manrope-bold text-[18px] text-foreground dark:text-foreground-dark">As miñas citas</H2>
      </View>

      {loading && !data.length ? (
        <LoadingSpinner className="flex-1 items-center justify-center" />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Próximas */}
          <View className="px-5 pt-6 gap-3">
            <Caption className="font-manrope-extrabold text-label tracking-label uppercase text-foreground-muted dark:text-foreground-muted-dark">
              Vindeiras
            </Caption>
            {upcoming.length === 0 ? (
              <View className="bg-surface dark:bg-surface-dark rounded-[20px] border border-border dark:border-border-dark p-5 items-center">
                <Body className="font-manrope-medium text-[13px] text-foreground-muted dark:text-foreground-muted-dark text-center">
                  Non tes citas próximas
                </Body>
              </View>
            ) : (
              upcoming.map((a) => (
                <AppointmentRow key={a.id} appointment={a} onRequestCancel={setCancelTargetId} />
              ))
            )}
          </View>

          {/* Historial */}
          {past.length > 0 && (
            <View className="px-5 pt-7 gap-3">
              <Caption className="font-manrope-extrabold text-label tracking-label uppercase text-foreground-muted dark:text-foreground-muted-dark">
                Historial
              </Caption>
              {past.map((a) => (
                <AppointmentRow key={a.id} appointment={a} onRequestCancel={setCancelTargetId} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={cancelTargetId !== null}
        title="Cancelar a cita"
        message="Seguro que queres cancelar esta cita? Esta acción non se pode desfacer."
        confirmLabel="Si, cancelar"
        cancelLabel="Voltar"
        destructive
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelTargetId(null)}
      />

      <ConfirmDialog
        visible={cancelError}
        title="Erro ao cancelar"
        message="Non se puido cancelar a cita. Téntao de novo."
        confirmLabel="Entendido"
        cancelLabel=""
        onConfirm={() => setCancelError(false)}
        onCancel={() => setCancelError(false)}
      />
    </SafeAreaView>
  )
}
