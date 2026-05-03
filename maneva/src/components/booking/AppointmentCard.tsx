import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { H3, Body, Caption } from '@/components/ui/Typography'
import { Database } from '@/types/database.types'
import { format, parseISO } from 'date-fns'
import { gl } from 'date-fns/locale'

type Appointment = Database['public']['Tables']['appointments']['Row']

export type EnhancedAppointment = Appointment & {
  salon_locations?: { name: string; address: string | null } | null
  appointment_services?: {
    services?: { name: string; duration: number | null; price: number | null } | null
  }[] | null
}

export function AppointmentCard({ appointment, onPress }: { appointment: EnhancedAppointment; onPress?: () => void }) {
  const dateStr = format(parseISO(appointment.scheduled_at), "dd MMM yyyy 'ás' HH:mm", { locale: gl })
  const salonName = appointment.salon_locations?.name || 'Salón descoñecido'
  const serviceNames = appointment.appointment_services?.map(s => s.services?.name).filter(Boolean).join(', ') || 'Servizos varios'

  const statusColor = {
    pending:   'text-yellow-600',
    confirmed: 'text-green-600',
    cancelled: 'text-red-600',
    done:      'text-foreground-subtle dark:text-foreground-subtle-dark',
  }[appointment.status] || 'text-foreground-muted dark:text-foreground-muted-dark'

  const content = (
    <View className="bg-surface dark:bg-surface-dark rounded-2xl p-4 shadow-sm shadow-black/10 border border-border dark:border-border-dark mb-4">
      <View className="flex-row justify-between items-center mb-2">
        <H3>{salonName}</H3>
        <Caption className={`font-manrope-semibold capitalize ${statusColor}`}>
          {appointment.status}
        </Caption>
      </View>
      <Body>{serviceNames}</Body>
      <View className="flex-row justify-between items-center mt-4">
        <Caption className="font-manrope-semibold">
          {dateStr}
        </Caption>
        <Caption className="text-gold font-manrope-extrabold">💸 ${appointment.final_price}</Caption>
      </View>
    </View>
  )

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>
  }
  return content
}
