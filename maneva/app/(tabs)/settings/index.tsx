import React, { useMemo, useState } from 'react'
import { ScrollView, Switch, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { Body, Caption, H1, H2 } from '@/components/ui/Typography'
import { IconChevron, IconUser } from '@/components/ui/icons'
import { Colors } from '@/constants/theme'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useUserStyleProfile } from '@/hooks/useUserStyleProfile'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type MenuRowProps = {
  label: string
  onPress?: () => void
  disabled?: boolean
  showChevron?: boolean
  danger?: boolean
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-8">
      <Caption className="px-6 mb-3 font-manrope-extrabold text-[11px] tracking-[3px] uppercase text-premium-gray-secondary">
        {title}
      </Caption>
      <View className="bg-premium-white border-y border-premium-divider">{children}</View>
    </View>
  )
}

function MenuRow({ label, onPress, disabled = false, showChevron = true, danger = false }: MenuRowProps) {
  const textColor = danger ? 'text-red-600' : 'text-premium-black'

  return (
    <TouchableOpacity
      className={`px-6 py-6 flex-row items-center justify-between border-b border-premium-divider ${disabled ? 'opacity-50' : ''}`}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.75}
    >
      <Body className={`font-manrope-medium text-[16px] flex-1 pr-3 ${textColor}`}>{label}</Body>
      {showChevron ? (
        <IconChevron size={20} color={Colors.premium.gray.iconMuted} strokeWidth={2.2} />
      ) : null}
    </TouchableOpacity>
  )
}

function SwitchRow({
  label,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string
  value: boolean
  onValueChange: (nextValue: boolean) => void
  disabled?: boolean
}) {
  return (
    <View className={`px-6 py-6 flex-row items-center justify-between border-b border-premium-divider ${disabled ? 'opacity-50' : ''}`}>
      <Body className="font-manrope-medium text-[16px] text-premium-black">{label}</Body>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: Colors.premium.divider.switch, true: Colors.gold.light }}
        thumbColor={value ? Colors.gold.DEFAULT : Colors.premium.white}
        ios_backgroundColor={Colors.premium.divider.switch}
      />
    </View>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { data: profile } = useUserProfile()
  const { styleProfile, saveStyleProfile } = useUserStyleProfile()
  const { logout } = useAuth()
  const { colorScheme, setColorScheme } = useUiStore()

  const fullName = useMemo(() => {
    const firstName = profile?.first_name?.trim() ?? ''
    const lastName = profile?.last_name?.trim() ?? ''
    const joined = [firstName, lastName].filter(Boolean).join(' ')
    return joined || 'Nombre de Usuario'
  }, [profile?.first_name, profile?.last_name])

  const simpleModeEnabled = styleProfile?.simple_mode ?? false
  const darkModeEnabled = colorScheme === 'dark'

  const [dialog, setDialog] = useState<{
    title: string; message?: string; confirmLabel?: string
    cancelLabel?: string; destructive?: boolean; onConfirm: () => void
  } | null>(null)
  const closeDialog = () => setDialog(null)

  const handleSimpleModeChange = async (nextValue: boolean) => {
    try {
      await saveStyleProfile({ simple_mode: nextValue })
    } catch {
      setDialog({ title: 'Error', message: 'No se pudo actualizar el modo sencillo.', onConfirm: closeDialog })
    }
  }

  const handleDarkModeChange = (nextValue: boolean) => {
    setColorScheme(nextValue ? 'dark' : 'light')
  }

  const handleLogout = () => {
    setDialog({
      title: 'Cerrar sesión',
      message: '¿Seguro que quieres cerrar sesión?',
      confirmLabel: 'Cerrar sesión',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: () => { closeDialog(); logout() },
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-premium-white-soft" edges={['top']}>
      <View className="items-center border-b border-premium-divider bg-premium-white py-5">
        <H1 className="font-manrope-extrabold text-[18px] tracking-[6px] text-premium-black">MANEVA</H1>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="items-center pt-10 pb-6 px-6 bg-premium-white">
          <View className="w-[120px] h-[120px] rounded-full border border-gold-border-alt items-center justify-center bg-premium-surface shadow-[0_10px_20px_rgba(0,0,0,0.08)]">
            <IconUser size={42} color={Colors.premium.gray.secondary} strokeWidth={2.2} />
          </View>
          <H2 className="mt-8 px-3 font-manrope-bold text-[28px] leading-[34px] text-premium-black text-center">{fullName}</H2>
          <Caption className="mt-2 font-manrope-medium text-premium-gray">{user?.email ?? ''}</Caption>
        </View>

        <MenuSection title="Mi Cuenta">
          <MenuRow label="Citas por terceros" onPress={() => router.push('/(tabs)/settings/bookings-delegation')} />
          <MenuRow label="Preferencias de cita" onPress={() => router.push('/(tabs)/settings/booking-preferences')} />
          <MenuRow label="Cortes de referencia" onPress={() => router.push('/(tabs)/settings/reference-cuts')} />
        </MenuSection>

        <MenuSection title="Configuración de la app">
          <MenuRow label="Notificaciones" onPress={() => router.push('/(tabs)/settings/notifications')} />
          <SwitchRow label="Modo oscuro" value={darkModeEnabled} onValueChange={handleDarkModeChange} />
          <SwitchRow label="Modo sencillo" value={simpleModeEnabled} onValueChange={handleSimpleModeChange} />
          <MenuRow label="Ajustes generales" onPress={() => router.push('/(tabs)/settings/general-settings')} />
        </MenuSection>

        <View className="items-center py-10">
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.75}>
            <Caption className="font-manrope-extrabold uppercase tracking-[2.5px] text-[15px] text-red-600">
              Cerrar sesión
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
    </SafeAreaView>
  )
}
