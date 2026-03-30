import React from 'react'
import { View, RefreshControl } from 'react-native'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { Body } from '@/components/ui/Typography'
import { AppointmentCard } from '@/components/booking/AppointmentCard'
import { useMyAppointments } from '@/hooks/useAppointments'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

export default function BookingsScreen() {
  const { data: appointments, loading, error, refresh } = useMyAppointments()

  if (loading && appointments.length === 0) {
    return (
      <ScreenLayout header="brand" className="justify-center items-center">
        <LoadingSpinner />
      </ScreenLayout>
    )
  }

  if (error && appointments.length === 0) {
    return (
      <ScreenLayout header="brand" className="justify-center px-4">
        <ErrorMessage message={error} />
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout header="brand" refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>
      {appointments.map(app => (
        <AppointmentCard
          key={app.id}
          appointment={app}
          onPress={() => console.log('Ver detalle de cita', app.id)}
        />
      ))}

      {appointments.length === 0 && !loading && (
        <View className="items-center mt-10 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/10">
          <Body className="text-center font-manrope-semibold mb-2 text-premium-black">
            Aún no tienes reservas
          </Body>
          <Body className="text-center text-premium-gray">
            Explora nuestros salones y encuentra el servicio perfecto para ti.
          </Body>
        </View>
      )}
    </ScreenLayout>
  )
}
